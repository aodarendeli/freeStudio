using Backend.Application.Admin;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class AdminStatsReader(AppDbContext db) : IAdminStatsReader
{
    public async Task<AdminStatsDto> ReadAsync(DateTimeOffset now, CancellationToken ct = default)
    {
        var dayAgo = now.AddDays(-1);
        var weekAgo = now.AddDays(-7);
        var liveEvents = db.CareEvents.AsNoTracking().Where(e => e.DeletedAt == null);

        return new AdminStatsDto(
            await db.Users.CountAsync(ct),
            await db.Babies.CountAsync(b => b.DeletedAt == null, ct),
            await liveEvents.CountAsync(e => e.CreatedAt >= dayAgo, ct),
            await liveEvents.CountAsync(e => e.CreatedAt >= weekAgo, ct),
            await db.LabTests.CountAsync(t => t.DeletedAt == null, ct),
            now);
    }
}
