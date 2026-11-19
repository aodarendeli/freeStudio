using System.Globalization;
using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Domain.Babies;
using Backend.Domain.Reminders;
using FluentValidation;

namespace Backend.Application.Reminders;

public sealed record NextFeedDto(bool Enabled, int IntervalMin);

public sealed record StillRunningNudgeDto(bool Enabled, int AfterMin);

/// <summary>Times are local wall-clock "HH:mm" (the device applies its own time zone).</summary>
public sealed record QuietHoursDto(bool Enabled, string Start, string End);

public sealed record ReminderSettingsDto(
    Guid BabyId, NextFeedDto NextFeed, StillRunningNudgeDto StillRunningNudge, QuietHoursDto QuietHours,
    DateTimeOffset? UpdatedAt, int Version);

public sealed record UpdateReminderSettingsRequest(
    NextFeedDto NextFeed, StillRunningNudgeDto StillRunningNudge, QuietHoursDto QuietHours);

public interface IReminderSettingsRepository
{
    Task<ReminderSettings?> GetAsync(Guid babyId, CancellationToken ct = default);
    void Add(ReminderSettings settings);
}

public sealed class UpdateReminderSettingsValidator : AbstractValidator<UpdateReminderSettingsRequest>
{
    public UpdateReminderSettingsValidator()
    {
        RuleFor(x => x.NextFeed).NotNull();
        RuleFor(x => x.NextFeed.IntervalMin).InclusiveBetween(15, 24 * 60).When(x => x.NextFeed is not null);
        RuleFor(x => x.StillRunningNudge).NotNull();
        RuleFor(x => x.StillRunningNudge.AfterMin).InclusiveBetween(5, 12 * 60)
            .When(x => x.StillRunningNudge is not null);
        RuleFor(x => x.QuietHours).NotNull();
        RuleFor(x => x.QuietHours.Start).Must(ReminderSettingsService.IsTime).WithMessage("Use HH:mm.")
            .When(x => x.QuietHours is not null);
        RuleFor(x => x.QuietHours.End).Must(ReminderSettingsService.IsTime).WithMessage("Use HH:mm.")
            .When(x => x.QuietHours is not null);
    }
}

public interface IReminderSettingsService
{
    Task<ReminderSettingsDto> GetAsync(Guid babyId, CancellationToken ct = default);
    Task<ReminderSettingsDto> UpdateAsync(
        Guid babyId, UpdateReminderSettingsRequest request, int? expectedVersion, CancellationToken ct = default);
}

public sealed class ReminderSettingsService(
    IReminderSettingsRepository repository,
    IBabyAccess access,
    IUnitOfWork unitOfWork,
    IValidator<UpdateReminderSettingsRequest> validator,
    TimeProvider time) : IReminderSettingsService
{
    private const string TimeFormat = "HH:mm";

    public async Task<ReminderSettingsDto> GetAsync(Guid babyId, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        var settings = await repository.GetAsync(babyId, ct);
        // Never stored yet: return defaults (version 0) without writing.
        return ToDto(settings ?? new ReminderSettings { BabyId = babyId }, settings is null);
    }

    public async Task<ReminderSettingsDto> UpdateAsync(
        Guid babyId, UpdateReminderSettingsRequest request, int? expectedVersion, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var settings = await repository.GetAsync(babyId, ct);
        if (settings is null)
        {
            settings = new ReminderSettings { BabyId = babyId };
            repository.Add(settings);
        }

        Versioning.Ensure(settings.Version, expectedVersion);
        settings.NextFeedEnabled = request.NextFeed.Enabled;
        settings.NextFeedIntervalMin = request.NextFeed.IntervalMin;
        settings.StillRunningEnabled = request.StillRunningNudge.Enabled;
        settings.StillRunningAfterMin = request.StillRunningNudge.AfterMin;
        settings.QuietHoursEnabled = request.QuietHours.Enabled;
        settings.QuietHoursStart = TimeOnly.ParseExact(request.QuietHours.Start, TimeFormat, CultureInfo.InvariantCulture);
        settings.QuietHoursEnd = TimeOnly.ParseExact(request.QuietHours.End, TimeFormat, CultureInfo.InvariantCulture);
        settings.UpdatedAt = time.GetUtcNow();
        settings.Version++;
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(settings, isDefault: false);
    }

    internal static bool IsTime(string? value) =>
        TimeOnly.TryParseExact(value, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    private static ReminderSettingsDto ToDto(ReminderSettings s, bool isDefault) => new(
        s.BabyId,
        new NextFeedDto(s.NextFeedEnabled, s.NextFeedIntervalMin),
        new StillRunningNudgeDto(s.StillRunningEnabled, s.StillRunningAfterMin),
        new QuietHoursDto(
            s.QuietHoursEnabled,
            s.QuietHoursStart.ToString(TimeFormat, CultureInfo.InvariantCulture),
            s.QuietHoursEnd.ToString(TimeFormat, CultureInfo.InvariantCulture)),
        isDefault ? null : s.UpdatedAt,
        s.Version);
}
