using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Common.Paging;
using Backend.Domain.Babies;
using Backend.Domain.Tracking;
using FluentValidation;

namespace Backend.Application.Tracking;

public interface ICareEventService
{
    Task<CursorPage<CareEventDto>> ListAsync(Guid babyId, CareEventQuery query, CancellationToken ct = default);
    Task<CareEventDto> GetAsync(Guid babyId, Guid id, CancellationToken ct = default);
    Task<ChangesPage<CareEventDto>> ListChangesAsync(Guid babyId, string? since, int limit, CancellationToken ct = default);
    Task<UpsertResult<CareEventDto>> UpsertAsync(
        Guid babyId, Guid id, UpsertCareEventRequest request, int? expectedVersion, CancellationToken ct = default);
    Task DeleteAsync(Guid babyId, Guid id, int? expectedVersion, CancellationToken ct = default);
}

public sealed class CareEventService(
    ICareEventRepository events,
    IBabyAccess access,
    IUnitOfWork unitOfWork,
    IValidator<UpsertCareEventRequest> validator,
    IValidator<CareEventQuery> queryValidator,
    SyncOptions syncOptions,
    TimeProvider time) : ICareEventService
{
    public async Task<ChangesPage<CareEventDto>> ListChangesAsync(
        Guid babyId, string? since, int limit, CancellationToken ct = default)
    {
        var after = Changes.ValidateAndDecode(since, limit);
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        var rows = await events.ListChangesAsync(
            babyId, after, time.GetUtcNow() - syncOptions.SettleWindow, limit + 1, ct);
        return Changes.Page(rows, limit, since, e => new TimeCursor(e.UpdatedAt, e.Id), ToDto);
    }

    public async Task<CursorPage<CareEventDto>> ListAsync(
        Guid babyId, CareEventQuery query, CancellationToken ct = default)
    {
        await queryValidator.ValidateAndThrowAsync(query, ct);
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);

        if (query is { From: { } from, To: { } to })
        {
            var inRange = await events.ListInRangeAsync(
                babyId, from.ToUniversalTime(), to.ToUniversalTime(), query.Kind, query.IncludeDeleted, ct);
            return new CursorPage<CareEventDto>(inRange.Select(ToDto).ToList(), null);
        }

        // Fetch one extra row to know whether another page exists.
        var rows = await events.ListPageAsync(
            babyId, query.Kind, TimeCursor.Decode(query.Cursor), query.Limit + 1, query.IncludeDeleted, ct);
        var page = rows.Take(query.Limit).ToList();
        var next = rows.Count > query.Limit ? new TimeCursor(page[^1].StartedAt, page[^1].Id).Encode() : null;
        return new CursorPage<CareEventDto>(page.Select(ToDto).ToList(), next);
    }

    public async Task<CareEventDto> GetAsync(Guid babyId, Guid id, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        return ToDto(await FindAsync(babyId, id, ct));
    }

    public async Task<UpsertResult<CareEventDto>> UpsertAsync(
        Guid babyId, Guid id, UpsertCareEventRequest request, int? expectedVersion, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var now = time.GetUtcNow();
        var existing = await events.GetAsync(id, ct);

        if (existing is null)
        {
            if (expectedVersion is not null)
            {
                throw new ConflictAppException("The event no longer exists");
            }

            var created = new CareEvent { Id = id, BabyId = babyId };
            Apply(created, request);
            created.MarkCreated(now);
            events.Add(created);
            await unitOfWork.SaveChangesAsync(ct);
            return new UpsertResult<CareEventDto>(ToDto(created), Created: true);
        }

        if (existing.BabyId != babyId)
        {
            // Ids are global; an id that belongs to another baby is never moved.
            throw new ConflictAppException("The id is already used by another baby's event");
        }

        Versioning.Ensure(existing.Version, expectedVersion);
        Apply(existing, request);
        existing.DeletedAt = null; // PUT carries the live state, so it also restores (undo).
        existing.MarkUpdated(now);
        await unitOfWork.SaveChangesAsync(ct);
        return new UpsertResult<CareEventDto>(ToDto(existing), Created: false);
    }

    public async Task DeleteAsync(Guid babyId, Guid id, int? expectedVersion, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var existing = await FindAsync(babyId, id, ct);
        Versioning.Ensure(existing.Version, expectedVersion);

        if (existing.SoftDelete(time.GetUtcNow()))
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
    }

    private async Task<CareEvent> FindAsync(Guid babyId, Guid id, CancellationToken ct)
    {
        var found = await events.GetAsync(id, ct);
        return found is not null && found.BabyId == babyId ? found : throw new NotFoundAppException("Event not found");
    }

    private static void Apply(CareEvent e, UpsertCareEventRequest r)
    {
        e.Kind = r.Kind;
        e.StartedAt = r.StartedAt;
        e.EndedAt = r.EndedAt;
        e.Note = string.IsNullOrWhiteSpace(r.Note) ? null : r.Note.Trim();
        e.Method = r.Kind == CareEventKind.Feeding ? r.Method : null;
        e.BreastSegments = r.Breast?.Segments.ToList();
        e.BottleAmountMl = r.Bottle?.AmountMl;
        e.BottleContent = r.Bottle?.Content;
        e.SolidItems = r.Solid?.Items.Select(i => i.Trim()).ToList();
        e.DiaperType = r.Kind == CareEventKind.Diaper ? r.Type : null;
    }

    internal static CareEventDto ToDto(CareEvent e) => new(
        e.Id,
        e.BabyId,
        e.Kind,
        e.Method,
        e.StartedAt,
        e.EndedAt,
        e.BreastSegments is { } segments ? new BreastDetailsDto(segments) : null,
        e.BottleAmountMl is { } ml && e.BottleContent is { } content ? new BottleDetailsDto(ml, content) : null,
        e.SolidItems is { } items ? new SolidDetailsDto(items) : null,
        e.DiaperType,
        e.Note,
        e.CreatedAt,
        e.UpdatedAt,
        e.DeletedAt,
        e.Version);
}
