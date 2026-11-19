using Backend.Application.Reminders;
using Backend.Domain.Reminders;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

internal sealed class ReminderSettingsRepository(AppDbContext db) : IReminderSettingsRepository
{
    public Task<ReminderSettings?> GetAsync(Guid babyId, CancellationToken ct = default) =>
        db.ReminderSettings.FirstOrDefaultAsync(s => s.BabyId == babyId, ct);

    public void Add(ReminderSettings settings) => db.ReminderSettings.Add(settings);
}
