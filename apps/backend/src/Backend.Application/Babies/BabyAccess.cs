using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Domain.Babies;

namespace Backend.Application.Babies;

public interface IBabyAccess
{
    /// <summary>
    /// 404 when the caller is not a member (does not reveal that the baby exists), 403 when their role is too low.
    /// </summary>
    Task<CaregiverRole> RequireAsync(Guid babyId, CaregiverRole minimum, CancellationToken ct = default);
}

public sealed class BabyAccess(IBabyRepository babies, ICurrentUser currentUser) : IBabyAccess
{
    public async Task<CaregiverRole> RequireAsync(Guid babyId, CaregiverRole minimum, CancellationToken ct = default)
    {
        var role = await babies.GetRoleAsync(babyId, currentUser.Id, ct)
            ?? throw new NotFoundAppException("Baby not found");

        if (role < minimum)
        {
            throw new ForbiddenAppException();
        }

        return role;
    }
}
