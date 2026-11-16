using Backend.Application.Common.Paging;
using Backend.Domain.Tracking;

namespace Backend.Application.Tracking;

public interface ICareEventRepository
{
    /// <summary>Tracked, including soft-deleted rows.</summary>
    Task<CareEvent?> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Events overlapping [from, to): started before <paramref name="to"/>, ended (or started) at/after <paramref name="from"/>.</summary>
    Task<IReadOnlyList<CareEvent>> ListInRangeAsync(
        Guid babyId, DateTimeOffset from, DateTimeOffset to, CareEventKind? kind, bool includeDeleted,
        CancellationToken ct = default);

    /// <summary>Newest first; returns up to <paramref name="limit"/> rows strictly after <paramref name="after"/>.</summary>
    Task<IReadOnlyList<CareEvent>> ListPageAsync(
        Guid babyId, CareEventKind? kind, TimeCursor? after, int limit, bool includeDeleted,
        CancellationToken ct = default);

    /// <summary>Changes feed: rows with (updated_at, id) after <paramref name="after"/> and updated_at &lt;= <paramref name="upTo"/>, oldest first, deleted included.</summary>
    Task<IReadOnlyList<CareEvent>> ListChangesAsync(
        Guid babyId, TimeCursor? after, DateTimeOffset upTo, int limit, CancellationToken ct = default);

    void Add(CareEvent careEvent);
}
