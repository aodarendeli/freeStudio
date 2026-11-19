namespace Backend.Application.Admin;

/// <summary>
/// Aggregate counts only. Admins never see an individual baby's name, events or lab values (health data, least privilege).
/// </summary>
public sealed record AdminStatsDto(
    int Users,
    int ActiveBabies,
    int EventsLast24h,
    int EventsLast7d,
    int LabTests,
    DateTimeOffset GeneratedAt);

public interface IAdminStatsReader
{
    Task<AdminStatsDto> ReadAsync(DateTimeOffset now, CancellationToken ct = default);
}

public interface IAdminStatsService
{
    Task<AdminStatsDto> GetAsync(CancellationToken ct = default);
}

public sealed class AdminStatsService(IAdminStatsReader reader, TimeProvider time) : IAdminStatsService
{
    public Task<AdminStatsDto> GetAsync(CancellationToken ct = default) => reader.ReadAsync(time.GetUtcNow(), ct);
}
