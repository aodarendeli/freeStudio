using Backend.Application.Me;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[Route("v1/me")]
public sealed class MeController(IMeService me) : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<MeDto>> Get(CancellationToken ct) => Ok(await me.GetAsync(ct));

    [HttpGet("settings")]
    [ProducesResponseType<SettingsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var settings = await me.GetSettingsAsync(ct);
        return Versioned(settings, settings.Version);
    }

    [HttpPut("settings")]
    [ProducesResponseType<SettingsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> PutSettings(UpdateSettingsRequest request, CancellationToken ct)
    {
        var settings = await me.UpdateSettingsAsync(request, ExpectedVersion(), ct);
        return Versioned(settings, settings.Version);
    }
}
