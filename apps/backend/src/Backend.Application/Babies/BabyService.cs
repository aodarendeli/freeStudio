using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Me;
using Backend.Domain.Babies;
using FluentValidation;

namespace Backend.Application.Babies;

public interface IBabyService
{
    Task<IReadOnlyList<BabyDto>> ListAsync(bool includeDeleted, CancellationToken ct = default);
    Task<BabyDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<UpsertResult<BabyDto>> UpsertAsync(Guid id, UpsertBabyRequest request, int? expectedVersion, CancellationToken ct = default);
    Task DeleteAsync(Guid id, int? expectedVersion, CancellationToken ct = default);
}

public sealed class BabyService(
    IBabyRepository babies,
    IUserRepository users,
    IBabyAccess access,
    ICurrentUser currentUser,
    IUnitOfWork unitOfWork,
    IValidator<UpsertBabyRequest> validator,
    TimeProvider time) : IBabyService
{
    public async Task<IReadOnlyList<BabyDto>> ListAsync(bool includeDeleted, CancellationToken ct = default)
    {
        var rows = await babies.ListForUserAsync(currentUser.Id, includeDeleted, ct);
        return rows.Select(r => ToDto(r.Baby, r.Role)).ToList();
    }

    public async Task<BabyDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var role = await access.RequireAsync(id, CaregiverRole.Viewer, ct);
        var baby = await babies.GetAsync(id, ct) ?? throw new NotFoundAppException("Baby not found");
        return ToDto(baby, role);
    }

    public async Task<UpsertResult<BabyDto>> UpsertAsync(
        Guid id, UpsertBabyRequest request, int? expectedVersion, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        var now = time.GetUtcNow();
        var baby = await babies.GetAsync(id, ct);

        if (baby is null)
        {
            if (expectedVersion is not null)
            {
                throw new ConflictAppException("The baby no longer exists");
            }

            await users.EnsureExistsAsync(currentUser.Id, ct);
            baby = new Baby { Id = id };
            Apply(baby, request);
            baby.MarkCreated(now);
            baby.Caregivers.Add(new BabyCaregiver
            {
                BabyId = id, UserId = currentUser.Id, Role = CaregiverRole.Owner, CreatedAt = now,
            });
            babies.Add(baby);
            await unitOfWork.SaveChangesAsync(ct);
            return new UpsertResult<BabyDto>(ToDto(baby, CaregiverRole.Owner), Created: true);
        }

        var role = baby.Caregivers.Find(c => c.UserId == currentUser.Id)?.Role
            ?? throw new ForbiddenAppException();
        // Editing needs write access; bringing a deleted baby back (undo) is the owner's call.
        if (role < (baby.IsDeleted ? CaregiverRole.Owner : CaregiverRole.Caregiver))
        {
            throw new ForbiddenAppException();
        }

        Versioning.Ensure(baby.Version, expectedVersion);
        Apply(baby, request);
        baby.DeletedAt = null;
        baby.MarkUpdated(now);
        await unitOfWork.SaveChangesAsync(ct);
        return new UpsertResult<BabyDto>(ToDto(baby, role), Created: false);
    }

    public async Task DeleteAsync(Guid id, int? expectedVersion, CancellationToken ct = default)
    {
        await access.RequireAsync(id, CaregiverRole.Owner, ct);
        var baby = await babies.GetAsync(id, ct) ?? throw new NotFoundAppException("Baby not found");
        Versioning.Ensure(baby.Version, expectedVersion);

        if (baby.SoftDelete(time.GetUtcNow()))
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
    }

    private static void Apply(Baby baby, UpsertBabyRequest request)
    {
        baby.Name = request.Name.Trim();
        baby.BirthDate = request.BirthDate;
        baby.Sex = request.Sex;
        baby.Color = request.Color;
        baby.ArchivedAt = request.ArchivedAt;
    }

    internal static BabyDto ToDto(Baby b, CaregiverRole role) =>
        new(b.Id, b.Name, b.BirthDate, b.Sex, b.Color, b.ArchivedAt, role, b.CreatedAt, b.UpdatedAt, b.DeletedAt, b.Version);
}
