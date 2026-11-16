namespace Backend.Domain.Tracking;

public enum SessionKind { BreastFeeding, Sleep }

public enum SessionStatus { Running, Paused }

/// <summary>The last segment without <c>EndedAt</c> is the one counting.</summary>
public sealed record SessionSegment(BreastSide? Side, DateTimeOffset StartedAt, DateTimeOffset? EndedAt);

/// <summary>Optional server mirror of a running timer. At most one per (baby, kind).</summary>
public class ActiveSession
{
    public Guid Id { get; set; }
    public Guid BabyId { get; set; }
    public SessionKind Kind { get; set; }
    public SessionStatus Status { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public List<SessionSegment> Segments { get; set; } = [];
    public DateTimeOffset UpdatedAt { get; set; }
    public int Version { get; set; }
}
