namespace Backend.Domain.Reminders;

public class ReminderSettings
{
    public Guid BabyId { get; set; }
    public bool NextFeedEnabled { get; set; }
    public int NextFeedIntervalMin { get; set; } = 180;
    public bool StillRunningEnabled { get; set; } = true;
    public int StillRunningAfterMin { get; set; } = 45;
    public bool QuietHoursEnabled { get; set; }
    public TimeOnly QuietHoursStart { get; set; } = new(22, 0);
    public TimeOnly QuietHoursEnd { get; set; } = new(7, 0);
    public DateTimeOffset UpdatedAt { get; set; }
    public int Version { get; set; }
}
