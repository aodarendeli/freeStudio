using Backend.Application.Common.Paging;
using Backend.Application.Tracking;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[Route("v1/babies/{babyId:guid}/events")]
public sealed class CareEventsController(ICareEventService events) : ApiControllerBase
{
    /// <summary>
    /// <c>?from=&amp;to=</c> returns every event overlapping the range (oldest first);
    /// otherwise newest first, paged with <c>?cursor=&amp;limit=</c>.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<CursorPage<CareEventDto>>> List(
        Guid babyId, [FromQuery] CareEventQuery query, CancellationToken ct) =>
        Ok(await events.ListAsync(babyId, query, ct));

    /// <summary>Sync feed: every change (deletes included) after <c>since</c>, oldest first. Resume from <c>cursor</c>.</summary>
    [HttpGet("changes")]
    public async Task<ActionResult<ChangesPage<CareEventDto>>> Changes(
        Guid babyId, [FromQuery] string? since, CancellationToken ct, [FromQuery] int limit = 200) =>
        Ok(await events.ListChangesAsync(babyId, since, limit, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<CareEventDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid babyId, Guid id, CancellationToken ct)
    {
        var e = await events.GetAsync(babyId, id, ct);
        return Versioned(e, e.Version);
    }

    /// <summary>Create-or-update (any kind). Also restores a soft-deleted event (undo).</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<CareEventDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<CareEventDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Put(Guid babyId, Guid id, UpsertCareEventRequest request, CancellationToken ct)
    {
        var result = await events.UpsertAsync(babyId, id, request, ExpectedVersion(), ct);
        return Upserted(result, result.Value.Version);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid babyId, Guid id, CancellationToken ct)
    {
        await events.DeleteAsync(babyId, id, ExpectedVersion(), ct);
        return NoContent();
    }
}
