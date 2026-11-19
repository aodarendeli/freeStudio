using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Common.Paging;
using Backend.Domain.Babies;
using Backend.Domain.Health;
using FluentValidation;

namespace Backend.Application.Health;

public interface ILabTestService
{
    Task<CursorPage<LabTestDto>> ListAsync(Guid babyId, LabTestQuery query, CancellationToken ct = default);
    Task<LabTestDto> GetAsync(Guid babyId, Guid id, CancellationToken ct = default);
    Task<ChangesPage<LabTestDto>> ListChangesAsync(Guid babyId, string? since, int limit, CancellationToken ct = default);
    Task<UpsertResult<LabTestDto>> UpsertAsync(
        Guid babyId, Guid id, UpsertLabTestRequest request, int? expectedVersion, CancellationToken ct = default);
    Task DeleteAsync(Guid babyId, Guid id, int? expectedVersion, CancellationToken ct = default);
}

public sealed class LabTestService(
    ILabTestRepository tests,
    IBabyAccess access,
    IUnitOfWork unitOfWork,
    IValidator<UpsertLabTestRequest> validator,
    SyncOptions syncOptions,
    TimeProvider time) : ILabTestService
{
    public async Task<ChangesPage<LabTestDto>> ListChangesAsync(
        Guid babyId, string? since, int limit, CancellationToken ct = default)
    {
        var after = Changes.ValidateAndDecode(since, limit);
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        var rows = await tests.ListChangesAsync(
            babyId, after, time.GetUtcNow() - syncOptions.SettleWindow, limit + 1, ct);
        return Changes.Page(rows, limit, since, t => new TimeCursor(t.UpdatedAt, t.Id), ToDto);
    }

    public async Task<CursorPage<LabTestDto>> ListAsync(Guid babyId, LabTestQuery query, CancellationToken ct = default)
    {
        if (query is { From: { } from, To: { } to } && to < from)
        {
            throw new BadRequestAppException("'to' must not be before 'from'");
        }

        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        var rows = await tests.ListAsync(babyId, query.From, query.To, query.IncludeDeleted, ct);
        return new CursorPage<LabTestDto>(rows.Select(ToDto).ToList(), null);
    }

    public async Task<LabTestDto> GetAsync(Guid babyId, Guid id, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        return ToDto(await FindAsync(babyId, id, ct));
    }

    public async Task<UpsertResult<LabTestDto>> UpsertAsync(
        Guid babyId, Guid id, UpsertLabTestRequest request, int? expectedVersion, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var now = time.GetUtcNow();
        var test = await tests.GetAsync(id, ct);
        var created = test is null;

        if (test is null)
        {
            if (expectedVersion is not null)
            {
                throw new ConflictAppException("The lab test no longer exists");
            }

            test = new LabTest { Id = id, BabyId = babyId };
            test.MarkCreated(now);
            tests.Add(test);
        }
        else
        {
            if (test.BabyId != babyId)
            {
                throw new ConflictAppException("The id is already used by another baby's lab test");
            }

            Versioning.Ensure(test.Version, expectedVersion);
            test.DeletedAt = null; // PUT carries the live state, so it also restores (undo).
            test.MarkUpdated(now);
        }

        test.TakenOn = request.TakenOn;
        test.Category = request.Category;
        test.Title = request.Title.Trim();
        test.LabName = string.IsNullOrWhiteSpace(request.LabName) ? null : request.LabName.Trim();
        test.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        test.ReplaceResults(request.Results.Select(r => new LabResult
        {
            Id = r.Id, Analyte = r.Analyte.Trim(), Value = r.Value, Unit = r.Unit.Trim(),
            RefLow = r.RefLow, RefHigh = r.RefHigh,
        }).ToList());

        await unitOfWork.SaveChangesAsync(ct);
        return new UpsertResult<LabTestDto>(ToDto(test), created);
    }

    public async Task DeleteAsync(Guid babyId, Guid id, int? expectedVersion, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var test = await FindAsync(babyId, id, ct);
        Versioning.Ensure(test.Version, expectedVersion);

        if (test.SoftDelete(time.GetUtcNow()))
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
    }

    private async Task<LabTest> FindAsync(Guid babyId, Guid id, CancellationToken ct)
    {
        var found = await tests.GetAsync(id, ct);
        return found is not null && found.BabyId == babyId ? found : throw new NotFoundAppException("Lab test not found");
    }

    private static LabTestDto ToDto(LabTest t) => new(
        t.Id,
        t.BabyId,
        t.TakenOn,
        t.Category,
        t.Title,
        t.LabName,
        t.Note,
        t.Results.OrderBy(r => r.Position)
            .Select(r => new LabResultDto(r.Id, r.Analyte, r.Value, r.Unit, r.RefLow, r.RefHigh)).ToList(),
        t.CreatedAt,
        t.UpdatedAt,
        t.DeletedAt,
        t.Version);
}
