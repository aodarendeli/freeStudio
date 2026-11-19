using Backend.Application.Reminders;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[Route("v1/babies/{babyId:guid}/reminder-settings")]
public sealed class ReminderSettingsController(IReminderSettingsService reminders) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<ReminderSettingsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid babyId, CancellationToken ct)
    {
        var settings = await reminders.GetAsync(babyId, ct);
        return Versioned(settings, settings.Version);
    }

    [HttpPut]
    [ProducesResponseType<ReminderSettingsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Put(Guid babyId, UpdateReminderSettingsRequest request, CancellationToken ct)
    {
        var settings = await reminders.UpdateAsync(babyId, request, ExpectedVersion(), ct);
        return Versioned(settings, settings.Version);
    }
}
