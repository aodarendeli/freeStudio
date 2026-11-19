namespace Backend.Application.Common.Paging;

/// <summary>
/// One page of a changes feed (oldest change first, soft-deleted rows included).
/// <see cref="Cursor"/> is where to resume next time; it never goes backwards. <see cref="HasMore"/>: fetch again now.
/// </summary>
public sealed record ChangesPage<T>(IReadOnlyList<T> Items, string? Cursor, bool HasMore);

/// <summary>Sync tuning.</summary>
public sealed record SyncOptions
{
    /// <summary>
    /// Rows changed within this window are held back so a slower concurrent transaction that commits with an earlier
    /// timestamp is not skipped by a client that already moved its cursor past it.
    /// </summary>
    public TimeSpan SettleWindow { get; init; } = TimeSpan.FromSeconds(5);

    public const int MaxLimit = 500;
}
