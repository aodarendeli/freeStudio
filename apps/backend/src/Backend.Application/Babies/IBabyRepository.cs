using Backend.Domain.Babies;

namespace Backend.Application.Babies;

public interface IBabyRepository
{
    /// <summary>Tracked, including soft-deleted rows (needed for upsert/restore decisions).</summary>
    Task<Baby?> GetAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<(Baby Baby, CaregiverRole Role)>> ListForUserAsync(
        string userId, bool includeDeleted, CancellationToken ct = default);

    /// <summary>The user's role on a non-deleted baby, or null when they are not a member.</summary>
    Task<CaregiverRole?> GetRoleAsync(Guid babyId, string userId, CancellationToken ct = default);

    void Add(Baby baby);
}
