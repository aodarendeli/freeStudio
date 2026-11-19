using Backend.Domain.Babies;

namespace Backend.Application.Babies;

public sealed record BabyDto(
    Guid Id,
    string Name,
    DateOnly BirthDate,
    BabySex Sex,
    BabyColor Color,
    DateTimeOffset? ArchivedAt,
    CaregiverRole Role,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    int Version);

public sealed record UpsertBabyRequest(
    string Name,
    DateOnly BirthDate,
    BabySex Sex,
    BabyColor Color,
    DateTimeOffset? ArchivedAt);
