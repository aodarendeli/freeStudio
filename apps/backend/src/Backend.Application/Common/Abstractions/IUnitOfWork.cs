namespace Backend.Application.Common.Abstractions;

public interface IUnitOfWork
{
    /// <summary>Commits tracked changes atomically. Concurrency and duplicate-key failures surface as a conflict.</summary>
    Task SaveChangesAsync(CancellationToken ct = default);
}
