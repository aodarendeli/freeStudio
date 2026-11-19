using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Common.Validation;
using Backend.Domain.Babies;
using Backend.Domain.Tracking;
using FluentValidation;

namespace Backend.Application.Tracking;

public sealed record ActiveSessionDto(
    Guid Id,
    Guid BabyId,
    SessionKind Kind,
    SessionStatus Status,
    DateTimeOffset StartedAt,
    IReadOnlyList<SessionSegment> Segments,
    DateTimeOffset UpdatedAt,
    int Version);

public sealed record UpsertActiveSessionRequest(
    Guid Id,
    SessionStatus Status,
    DateTimeOffset StartedAt,
    IReadOnlyList<SessionSegment> Segments);

public interface IActiveSessionRepository
{
    Task<ActiveSession?> GetAsync(Guid babyId, SessionKind kind, CancellationToken ct = default);
    Task<IReadOnlyList<ActiveSession>> ListAsync(Guid babyId, CancellationToken ct = default);
    void Add(ActiveSession session);
    void Remove(ActiveSession session);
}

public sealed class UpsertActiveSessionValidator : AbstractValidator<UpsertActiveSessionRequest>
{
    public const int SegmentsMax = 200;

    public UpsertActiveSessionValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.StartedAt).Utc();
        RuleFor(x => x.Segments).Must(s => s.Count <= SegmentsMax);
        RuleForEach(x => x.Segments)
            .Must(s => s.StartedAt.Offset == TimeSpan.Zero
                && (s.EndedAt is null || (s.EndedAt.Value.Offset == TimeSpan.Zero && s.EndedAt >= s.StartedAt))
                && (s.Side is null || Enum.IsDefined(s.Side.Value)))
            .WithMessage("Segments need UTC timestamps, end after start and a valid side.");
        RuleFor(x => x.Segments)
            .Must(s => s.Take(s.Count - 1).All(seg => seg.EndedAt is not null))
            .WithMessage("Only the last segment may be open.");
    }
}

public interface IActiveSessionService
{
    Task<IReadOnlyList<ActiveSessionDto>> ListAsync(Guid babyId, CancellationToken ct = default);
    Task<ActiveSessionDto> GetAsync(Guid babyId, SessionKind kind, CancellationToken ct = default);
    Task<UpsertResult<ActiveSessionDto>> UpsertAsync(
        Guid babyId, SessionKind kind, UpsertActiveSessionRequest request, int? expectedVersion,
        CancellationToken ct = default);
    Task DeleteAsync(Guid babyId, SessionKind kind, CancellationToken ct = default);
}

public sealed class ActiveSessionService(
    IActiveSessionRepository sessions,
    IBabyAccess access,
    IUnitOfWork unitOfWork,
    IValidator<UpsertActiveSessionRequest> validator,
    TimeProvider time) : IActiveSessionService
{
    public async Task<IReadOnlyList<ActiveSessionDto>> ListAsync(Guid babyId, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        return (await sessions.ListAsync(babyId, ct)).Select(ToDto).ToList();
    }

    public async Task<ActiveSessionDto> GetAsync(Guid babyId, SessionKind kind, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Viewer, ct);
        var session = await sessions.GetAsync(babyId, kind, ct)
            ?? throw new NotFoundAppException("No active session");
        return ToDto(session);
    }

    public async Task<UpsertResult<ActiveSessionDto>> UpsertAsync(
        Guid babyId, SessionKind kind, UpsertActiveSessionRequest request, int? expectedVersion,
        CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var now = time.GetUtcNow();
        var session = await sessions.GetAsync(babyId, kind, ct);
        var created = session is null;

        if (session is null)
        {
            Versioning.Ensure(0, expectedVersion);
            session = new ActiveSession { Id = request.Id, BabyId = babyId, Kind = kind, Version = 0 };
            sessions.Add(session);
        }
        else
        {
            Versioning.Ensure(session.Version, expectedVersion);
            if (session.Id != request.Id)
            {
                // A different timer replaced the old one (e.g. started on another device).
                throw new ConflictAppException("Another session is already running");
            }
        }

        session.Status = request.Status;
        session.StartedAt = request.StartedAt;
        session.Segments = request.Segments.ToList();
        session.UpdatedAt = now;
        session.Version++;
        await unitOfWork.SaveChangesAsync(ct);
        return new UpsertResult<ActiveSessionDto>(ToDto(session), created);
    }

    /// <summary>Idempotent: stopping or discarding an already gone session succeeds.</summary>
    public async Task DeleteAsync(Guid babyId, SessionKind kind, CancellationToken ct = default)
    {
        await access.RequireAsync(babyId, CaregiverRole.Caregiver, ct);
        var session = await sessions.GetAsync(babyId, kind, ct);
        if (session is not null)
        {
            sessions.Remove(session);
            await unitOfWork.SaveChangesAsync(ct);
        }
    }

    private static ActiveSessionDto ToDto(ActiveSession s) =>
        new(s.Id, s.BabyId, s.Kind, s.Status, s.StartedAt, s.Segments, s.UpdatedAt, s.Version);
}
