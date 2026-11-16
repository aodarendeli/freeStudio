using Backend.Domain.Common;

namespace Backend.Domain.Tracking;

public enum CareEventKind { Feeding, Diaper, Sleep }

public enum FeedingMethod { Breast, Bottle, Solid }

public enum BottleContent { BreastMilk, Formula, Other }

public enum DiaperType { Wet, Dirty, Mixed, Dry }

public enum BreastSide { Left, Right }

public sealed record BreastSegment(BreastSide Side, DateTimeOffset StartedAt, DateTimeOffset EndedAt);

/// <summary>
/// One row per timeline event. Kind-specific scalars are columns (queryable for reports);
/// breast segments are a jsonb array because they are always read with their event.
/// </summary>
public class CareEvent : SyncedEntity
{
    public const int NoteMaxLength = 500;
    public const int BottleMaxMl = 500;
    public const int SolidItemsMax = 20;
    public const int SolidItemMaxLength = 60;

    /// <summary>Longest accepted event; also bounds the timeline range scan.</summary>
    public static readonly TimeSpan MaxDuration = TimeSpan.FromHours(48);

    public Guid BabyId { get; set; }
    public CareEventKind Kind { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public string? Note { get; set; }

    public FeedingMethod? Method { get; set; }
    public List<BreastSegment>? BreastSegments { get; set; }
    public int? BottleAmountMl { get; set; }
    public BottleContent? BottleContent { get; set; }
    public List<string>? SolidItems { get; set; }

    public DiaperType? DiaperType { get; set; }
}
