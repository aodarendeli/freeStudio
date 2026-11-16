namespace Backend.Domain.Common;

/// <summary>
/// Base for records the mobile app syncs: client-generated id, soft delete and an optimistic-concurrency version.
/// </summary>
public abstract class SyncedEntity
{
    public Guid Id { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public int Version { get; set; }

    public bool IsDeleted => DeletedAt is not null;

    public void MarkCreated(DateTimeOffset now)
    {
        CreatedAt = now;
        UpdatedAt = now;
        Version = 1;
    }

    public void MarkUpdated(DateTimeOffset now)
    {
        UpdatedAt = now;
        Version++;
    }

    /// <summary>Idempotent: deleting an already deleted record changes nothing.</summary>
    public bool SoftDelete(DateTimeOffset now)
    {
        if (IsDeleted)
        {
            return false;
        }

        DeletedAt = now;
        MarkUpdated(now);
        return true;
    }
}
