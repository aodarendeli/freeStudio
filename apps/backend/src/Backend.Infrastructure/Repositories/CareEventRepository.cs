using Backend.Application.Common.Paging;
using Backend.Application.Tracking;
using Backend.Domain.Tracking;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class CareEventRepository(AppDbContext db) : ICareEventRepository
{
    public Task<CareEvent?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.CareEvents.FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<CareEvent>> ListInRangeAsync(
        Guid babyId, DateTimeOffset from, DateTimeOffset to, CareEventKind? kind, bool includeDeleted,
        CancellationToken ct = default)
    {
        // Events are at most MaxDuration long, so the index scan is bounded on both sides.
        var earliestStart = from - CareEvent.MaxDuration;
        var query = db.CareEvents.AsNoTracking()
            .Where(e => e.BabyId == babyId && e.StartedAt >= earliestStart && e.StartedAt < to
                        && (e.EndedAt ?? e.StartedAt) >= from);

        if (kind is not null)
        {
            query = query.Where(e => e.Kind == kind);
        }

        if (!includeDeleted)
        {
            query = query.Where(e => e.DeletedAt == null);
        }

        return await query.OrderBy(e => e.StartedAt).ThenBy(e => e.Id).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CareEvent>> ListPageAsync(
        Guid babyId, CareEventKind? kind, TimeCursor? after, int limit, bool includeDeleted,
        CancellationToken ct = default)
    {
        var query = db.CareEvents.AsNoTracking().Where(e => e.BabyId == babyId);

        if (kind is not null)
        {
            query = query.Where(e => e.Kind == kind);
        }

        if (!includeDeleted)
        {
            query = query.Where(e => e.DeletedAt == null);
        }

        if (after is { } cursor)
        {
            // Row-value comparison matches the (started_at DESC, id DESC) index exactly.
            query = query.Where(e => EF.Functions.LessThan(
                ValueTuple.Create(e.StartedAt, e.Id), ValueTuple.Create(cursor.At, cursor.Id)));
        }

        return await query.OrderByDescending(e => e.StartedAt).ThenByDescending(e => e.Id).Take(limit).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<CareEvent>> ListChangesAsync(
        Guid babyId, TimeCursor? after, DateTimeOffset upTo, int limit, CancellationToken ct = default)
    {
        var query = db.CareEvents.AsNoTracking().Where(e => e.BabyId == babyId && e.UpdatedAt <= upTo);
        if (after is { } cursor)
        {
            query = query.Where(e => EF.Functions.GreaterThan(
                ValueTuple.Create(e.UpdatedAt, e.Id), ValueTuple.Create(cursor.At, cursor.Id)));
        }

        return await query.OrderBy(e => e.UpdatedAt).ThenBy(e => e.Id).Take(limit).ToListAsync(ct);
    }

    public void Add(CareEvent careEvent) => db.CareEvents.Add(careEvent);
}
