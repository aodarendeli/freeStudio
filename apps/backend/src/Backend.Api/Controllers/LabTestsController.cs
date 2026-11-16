using Backend.Application.Common.Paging;
using Backend.Application.Health;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[Route("v1/babies/{babyId:guid}/lab-tests")]
public sealed class LabTestsController(ILabTestService tests) : ApiControllerBase
{
    /// <summary>Newest first, with results. Optional <c>?from=&amp;to=</c> (dates, inclusive).</summary>
    [HttpGet]
    public async Task<ActionResult<CursorPage<LabTestDto>>> List(
        Guid babyId, [FromQuery] LabTestQuery query, CancellationToken ct) =>
        Ok(await tests.ListAsync(babyId, query, ct));

    /// <summary>Sync feed: every change (deletes included) after <c>since</c>, oldest first. Resume from <c>cursor</c>.</summary>
    [HttpGet("changes")]
    public async Task<ActionResult<ChangesPage<LabTestDto>>> Changes(
        Guid babyId, [FromQuery] string? since, CancellationToken ct, [FromQuery] int limit = 200) =>
        Ok(await tests.ListChangesAsync(babyId, since, limit, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType<LabTestDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid babyId, Guid id, CancellationToken ct)
    {
        var test = await tests.GetAsync(babyId, id, ct);
        return Versioned(test, test.Version);
    }

    /// <summary>Create-or-update; results are replaced as a whole.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType<LabTestDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<LabTestDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Put(Guid babyId, Guid id, UpsertLabTestRequest request, CancellationToken ct)
    {
        var result = await tests.UpsertAsync(babyId, id, request, ExpectedVersion(), ct);
        return Upserted(result, result.Value.Version);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid babyId, Guid id, CancellationToken ct)
    {
        await tests.DeleteAsync(babyId, id, ExpectedVersion(), ct);
        return NoContent();
    }
}
