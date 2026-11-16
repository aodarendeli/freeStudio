using Backend.Application.Common.Paging;
using Backend.Domain.Health;

namespace Backend.Application.Health;

public interface ILabTestRepository
{
    /// <summary>Tracked with results, including soft-deleted rows.</summary>
    Task<LabTest?> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Newest first; results ordered by position.</summary>
    Task<IReadOnlyList<LabTest>> ListAsync(
        Guid babyId, DateOnly? from, DateOnly? to, bool includeDeleted, CancellationToken ct = default);

    /// <summary>Changes feed with results; see <c>ICareEventRepository.ListChangesAsync</c>.</summary>
    Task<IReadOnlyList<LabTest>> ListChangesAsync(
        Guid babyId, TimeCursor? after, DateTimeOffset upTo, int limit, CancellationToken ct = default);

    void Add(LabTest test);
}
