using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Domain.Babies;
using Backend.Domain.Users;
using FluentValidation;

namespace Backend.Application.Me;

public sealed record MembershipDto(Guid BabyId, CaregiverRole Role);

/// <summary>Profile fields come from the access token; the database only stores the <c>sub</c>.</summary>
public sealed record MeDto(string Id, string? Name, string? Email, IReadOnlyList<MembershipDto> Memberships);

public sealed record UnitsDto(VolumeUnit Volume, WeightUnit Weight);

public sealed record SettingsDto(
    Locale Locale, ThemeSetting Theme, UnitsDto Units, bool AutoNight, bool Haptics, int Version);

public sealed record UpdateSettingsRequest(
    Locale Locale, ThemeSetting Theme, UnitsDto Units, bool AutoNight, bool Haptics);

public interface IUserRepository
{
    /// <summary>Insert-if-missing; safe under concurrent first requests.</summary>
    Task EnsureExistsAsync(string userId, CancellationToken ct = default);

    Task<UserSettings?> GetSettingsAsync(string userId, CancellationToken ct = default);

    void AddSettings(UserSettings settings);
}

public sealed class UpdateSettingsValidator : AbstractValidator<UpdateSettingsRequest>
{
    public UpdateSettingsValidator()
    {
        RuleFor(x => x.Locale).IsInEnum();
        RuleFor(x => x.Theme).IsInEnum();
        RuleFor(x => x.Units).NotNull();
        RuleFor(x => x.Units.Volume).IsInEnum().When(x => x.Units is not null);
        RuleFor(x => x.Units.Weight).IsInEnum().When(x => x.Units is not null);
    }
}

public interface IMeService
{
    Task<MeDto> GetAsync(CancellationToken ct = default);
    Task<SettingsDto> GetSettingsAsync(CancellationToken ct = default);
    Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, int? expectedVersion, CancellationToken ct = default);
}

public sealed class MeService(
    IUserRepository users,
    IBabyRepository babies,
    ICurrentUser currentUser,
    IUnitOfWork unitOfWork,
    IValidator<UpdateSettingsRequest> validator,
    TimeProvider time) : IMeService
{
    public async Task<MeDto> GetAsync(CancellationToken ct = default)
    {
        var memberships = await babies.ListForUserAsync(currentUser.Id, includeDeleted: false, ct);
        return new MeDto(
            currentUser.Id,
            currentUser.Name,
            currentUser.Email,
            memberships.Select(m => new MembershipDto(m.Baby.Id, m.Role)).ToList());
    }

    public async Task<SettingsDto> GetSettingsAsync(CancellationToken ct = default) =>
        ToDto(await users.GetSettingsAsync(currentUser.Id, ct) ?? new UserSettings { UserId = currentUser.Id });

    public async Task<SettingsDto> UpdateSettingsAsync(
        UpdateSettingsRequest request, int? expectedVersion, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        var settings = await users.GetSettingsAsync(currentUser.Id, ct);
        if (settings is null)
        {
            await users.EnsureExistsAsync(currentUser.Id, ct);
            settings = new UserSettings { UserId = currentUser.Id };
            users.AddSettings(settings);
        }

        Versioning.Ensure(settings.Version, expectedVersion);
        settings.Locale = request.Locale;
        settings.Theme = request.Theme;
        settings.VolumeUnit = request.Units.Volume;
        settings.WeightUnit = request.Units.Weight;
        settings.AutoNight = request.AutoNight;
        settings.Haptics = request.Haptics;
        settings.UpdatedAt = time.GetUtcNow();
        settings.Version++;
        await unitOfWork.SaveChangesAsync(ct);
        return ToDto(settings);
    }

    private static SettingsDto ToDto(UserSettings s) =>
        new(s.Locale, s.Theme, new UnitsDto(s.VolumeUnit, s.WeightUnit), s.AutoNight, s.Haptics, s.Version);
}
