using Backend.Domain.Health;

namespace Backend.Application.Health;

public sealed record LabResultDto(Guid Id, string Analyte, decimal Value, string Unit, decimal? RefLow, decimal? RefHigh);

public sealed record LabTestDto(
    Guid Id,
    Guid BabyId,
    DateOnly TakenOn,
    LabCategory Category,
    string Title,
    string? LabName,
    string? Note,
    IReadOnlyList<LabResultDto> Results,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    int Version);

/// <summary>Results are replaced as a whole; omitted results are removed.</summary>
public sealed record UpsertLabTestRequest(
    DateOnly TakenOn,
    LabCategory Category,
    string Title,
    string? LabName,
    string? Note,
    IReadOnlyList<LabResultDto> Results);

public sealed record LabTestQuery(DateOnly? From, DateOnly? To, bool IncludeDeleted = false);
