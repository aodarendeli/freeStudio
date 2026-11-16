using Backend.Domain.Tracking;

namespace Backend.Application.Tracking;

public sealed record BreastDetailsDto(IReadOnlyList<BreastSegment> Segments);

public sealed record BottleDetailsDto(int AmountMl, BottleContent Content);

public sealed record SolidDetailsDto(IReadOnlyList<string> Items);

/// <summary>
/// Flat polymorphic shape: <c>kind</c> (and <c>method</c> for feedings) says which optional block is present.
/// Null blocks are omitted from JSON.
/// </summary>
public sealed record CareEventDto(
    Guid Id,
    Guid BabyId,
    CareEventKind Kind,
    FeedingMethod? Method,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    BreastDetailsDto? Breast,
    BottleDetailsDto? Bottle,
    SolidDetailsDto? Solid,
    DiaperType? Type,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    int Version);

public sealed record UpsertCareEventRequest(
    CareEventKind Kind,
    FeedingMethod? Method,
    DateTimeOffset StartedAt,
    DateTimeOffset? EndedAt,
    BreastDetailsDto? Breast,
    BottleDetailsDto? Bottle,
    SolidDetailsDto? Solid,
    DiaperType? Type,
    string? Note);

/// <summary>Either a time range (<c>from</c> + <c>to</c>) or keyset paging (<c>cursor</c>, <c>limit</c>).</summary>
public sealed record CareEventQuery(
    DateTimeOffset? From,
    DateTimeOffset? To,
    CareEventKind? Kind,
    string? Cursor,
    int Limit = 50,
    bool IncludeDeleted = false);
