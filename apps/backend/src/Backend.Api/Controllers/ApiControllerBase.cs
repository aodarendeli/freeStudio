using System.Globalization;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Backend.Api.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Version from <c>If-Match: "3"</c> (weak tags accepted). Null when the header is absent.</summary>
    protected int? ExpectedVersion()
    {
        var raw = Request.Headers[HeaderNames.IfMatch].ToString();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var tag = raw.Trim();
        if (tag.StartsWith("W/", StringComparison.Ordinal))
        {
            tag = tag[2..];
        }

        return int.TryParse(tag.Trim('"'), NumberStyles.None, CultureInfo.InvariantCulture, out var version)
            ? version
            : throw new BadRequestAppException("If-Match must be a quoted version, e.g. \"3\"");
    }

    protected IActionResult Versioned<T>(T body, int version)
    {
        Response.Headers.ETag = $"\"{version.ToString(CultureInfo.InvariantCulture)}\"";
        return Ok(body);
    }

    protected IActionResult Upserted<T>(UpsertResult<T> result, int version)
    {
        Response.Headers.ETag = $"\"{version.ToString(CultureInfo.InvariantCulture)}\"";
        return result.Created ? StatusCode(StatusCodes.Status201Created, result.Value) : Ok(result.Value);
    }
}
