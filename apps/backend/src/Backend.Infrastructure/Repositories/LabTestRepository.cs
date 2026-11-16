using Backend.Application.Common.Paging;
using Backend.Application.Health;
using Backend.Domain.Health;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class LabTestRepository(AppDbContext db) : ILabTestRepository
{
    public Task<LabTest?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.LabTests.FirstOrDefaultAsync(t => t.Id == id, ct);

    public async Task<IReadOnlyList<LabTest>> ListAsync(
        Guid babyId, DateOnly? from, DateOnly? to, bool includeDeleted, CancellationToken ct = default)
    {
        var query = db.LabTests.AsNoTracking().AsSplitQuery().Where(t => t.BabyId == babyId);

        if (from is not null)
        {
            query = query.Where(t => t.TakenOn >= from);
        }

        if (to is not null)
        {
            query = query.Where(t => t.TakenOn <= to);
        }

        if (!includeDeleted)
        {
            query = query.Where(t => t.DeletedAt == null);
        }

        return await query.OrderByDescending(t => t.TakenOn).ThenByDescending(t => t.CreatedAt).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<LabTest>> ListChangesAsync(
        Guid babyId, TimeCursor? after, DateTimeOffset upTo, int limit, CancellationToken ct = default)
    {
        var query = db.LabTests.AsNoTracking().AsSplitQuery().Where(t => t.BabyId == babyId && t.UpdatedAt <= upTo);
        if (after is { } cursor)
        {
            query = query.Where(t => EF.Functions.GreaterThan(
                ValueTuple.Create(t.UpdatedAt, t.Id), ValueTuple.Create(cursor.At, cursor.Id)));
        }

        return await query.OrderBy(t => t.UpdatedAt).ThenBy(t => t.Id).Take(limit).ToListAsync(ct);
    }

    public void Add(LabTest test) => db.LabTests.Add(test);
}
