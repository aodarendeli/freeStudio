using Backend.Application.Tracking;
using Backend.Domain.Tracking;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

/// <summary>Optional server mirror of running timers (multi-device, push-to-start later).</summary>
[Route("v1/babies/{babyId:guid}/active-sessions")]
public sealed class ActiveSessionsController(IActiveSessionService sessions) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActiveSessionDto>>> List(Guid babyId, CancellationToken ct) =>
        Ok(await sessions.ListAsync(babyId, ct));

    [HttpGet("{kind}")]
    [ProducesResponseType<ActiveSessionDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid babyId, SessionKind kind, CancellationToken ct)
    {
        var session = await sessions.GetAsync(babyId, kind, ct);
        return Versioned(session, session.Version);
    }

    [HttpPut("{kind}")]
    [ProducesResponseType<ActiveSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ActiveSessionDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Put(
        Guid babyId, SessionKind kind, UpsertActiveSessionRequest request, CancellationToken ct)
    {
        var result = await sessions.UpsertAsync(babyId, kind, request, ExpectedVersion(), ct);
        return Upserted(result, result.Value.Version);
    }

    /// <summary>Stop/discard. Idempotent.</summary>
    [HttpDelete("{kind}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid babyId, SessionKind kind, CancellationToken ct)
    {
        await sessions.DeleteAsync(babyId, kind, ct);
        return NoContent();
    }
}
