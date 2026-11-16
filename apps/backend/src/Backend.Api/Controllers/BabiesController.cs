using Backend.Application.Babies;
using Backend.Application.Common.Paging;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[Route("v1/babies")]
public sealed class BabiesController(IBabyService babies) : ApiControllerBase
{
    /// <summary>Babies the caller is a member of. <c>includeDeleted</c> is for sync.</summary>
    [HttpGet]
    public async Task<ActionResult<CursorPage<BabyDto>>> List([FromQuery] bool includeDeleted, CancellationToken ct) =>
        Ok(new CursorPage<BabyDto>(await babies.ListAsync(includeDeleted, ct), null));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<BabyDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var baby = await babies.GetAsync(id, ct);
        return Versioned(baby, baby.Version);
    }

    /// <summary>Create-or-update with a client-generated id. The creator becomes the owner.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<BabyDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<BabyDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Put(Guid id, UpsertBabyRequest request, CancellationToken ct)
    {
        var result = await babies.UpsertAsync(id, request, ExpectedVersion(), ct);
        return Upserted(result, result.Value.Version);
    }

    /// <summary>Soft delete (owner only). PUT restores.</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await babies.DeleteAsync(id, ExpectedVersion(), ct);
        return NoContent();
    }
}
