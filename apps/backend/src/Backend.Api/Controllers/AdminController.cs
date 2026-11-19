using Backend.Api.Infrastructure;
using Backend.Application.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

/// <summary>Operations only: needs the <c>admin</c> client role on the API client. Grants no access to baby data.</summary>
[Route("v1/admin")]
[Authorize(Policy = Policies.Admin)]
public sealed class AdminController(IAdminStatsService stats) : ApiControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct) => Ok(await stats.GetAsync(ct));
}
