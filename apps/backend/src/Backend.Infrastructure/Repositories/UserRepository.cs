using Backend.Application.Me;
using Backend.Domain.Users;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class UserRepository(AppDbContext db, TimeProvider time) : IUserRepository
{
    public async Task EnsureExistsAsync(string userId, CancellationToken ct = default)
    {
        var now = time.GetUtcNow();
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO users (id, created_at) VALUES ({userId}, {now}) ON CONFLICT (id) DO NOTHING", ct);
    }

    public Task<UserSettings?> GetSettingsAsync(string userId, CancellationToken ct = default) =>
        db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);

    public void AddSettings(UserSettings settings) => db.UserSettings.Add(settings);
}
