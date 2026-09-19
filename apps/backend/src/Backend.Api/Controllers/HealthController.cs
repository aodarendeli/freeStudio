using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Backend.Api.Controllers;

[ApiController]
[Route("health")]
[AllowAnonymous]
public class HealthController(HealthCheckService healthCheckService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var report = await healthCheckService.CheckHealthAsync();

        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
            }),
        };

        return report.Status == HealthStatus.Healthy ? Ok(payload) : StatusCode(503, payload);
    }
}
