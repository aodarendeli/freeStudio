using Backend.Application.Tracking;
using Backend.Domain.Tracking;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class ActiveSessionRepository(AppDbContext db) : IActiveSessionRepository
{
    public Task<ActiveSession?> GetAsync(Guid babyId, SessionKind kind, CancellationToken ct = default) =>
        db.ActiveSessions.FirstOrDefaultAsync(s => s.BabyId == babyId && s.Kind == kind, ct);

    public async Task<IReadOnlyList<ActiveSession>> ListAsync(Guid babyId, CancellationToken ct = default) =>
        await db.ActiveSessions.AsNoTracking().Where(s => s.BabyId == babyId).OrderBy(s => s.Kind).ToListAsync(ct);

    public void Add(ActiveSession session) => db.ActiveSessions.Add(session);

    public void Remove(ActiveSession session) => db.ActiveSessions.Remove(session);
}
