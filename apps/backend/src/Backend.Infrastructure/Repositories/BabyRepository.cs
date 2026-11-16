using Backend.Application.Babies;
using Backend.Domain.Babies;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class BabyRepository(AppDbContext db) : IBabyRepository
{
    public Task<Baby?> GetAsync(Guid id, CancellationToken ct = default) =>
        db.Babies.Include(b => b.Caregivers).FirstOrDefaultAsync(b => b.Id == id, ct);

    public async Task<IReadOnlyList<(Baby Baby, CaregiverRole Role)>> ListForUserAsync(
        string userId, bool includeDeleted, CancellationToken ct = default)
    {
        var rows = await (
                from c in db.BabyCaregivers.AsNoTracking()
                join b in db.Babies.AsNoTracking() on c.BabyId equals b.Id
                where c.UserId == userId && (includeDeleted || b.DeletedAt == null)
                orderby b.CreatedAt, b.Id
                select new { Baby = b, c.Role })
            .ToListAsync(ct);

        return rows.Select(r => (r.Baby, r.Role)).ToList();
    }

    public async Task<CaregiverRole?> GetRoleAsync(Guid babyId, string userId, CancellationToken ct = default) =>
        await (
                from c in db.BabyCaregivers
                join b in db.Babies on c.BabyId equals b.Id
                where c.BabyId == babyId && c.UserId == userId && b.DeletedAt == null
                select (CaregiverRole?)c.Role)
            .FirstOrDefaultAsync(ct);

    public void Add(Baby baby) => db.Babies.Add(baby);
}
