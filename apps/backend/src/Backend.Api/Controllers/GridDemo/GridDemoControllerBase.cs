using Backend.Application.GridDemo;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace Backend.Api.Controllers.GridDemo;

/// <summary>
/// VKDataGrid demo uçları (apps/react18). Demo istemcisi token göndermediği için anonimdir; bu yüzden
/// <c>GridDemo:Enabled</c> kapalıyken (varsayılan: Development dışında kapalı) tüm uçlar 404 döner.
/// Başarılı yanıtlar demo istemcisinin beklediği <c>{ success, message, data }</c> zarfıyla döner;
/// hatalar uygulamanın geri kalanı gibi Problem Details'tir.
/// </summary>
[ApiController]
[AllowAnonymous]
[GridDemoEnabled]
[Produces("application/json")]
public abstract class GridDemoControllerBase : ControllerBase
{
    protected static GridResponse<T> Envelope<T>(T data, string message = "OK") => new(true, message, data);

    protected static GridPagedResponse<T> Paged<T>(PagedResult<T> result) => new(
        true,
        "OK",
        result.Items,
        result.TotalCount,
        result.Page,
        result.Size,
        (int)Math.Ceiling(result.TotalCount / (double)result.Size));
}

public record GridResponse<T>(bool Success, string Message, T Data);

public record GridPagedResponse<T>(
    bool Success,
    string Message,
    IReadOnlyList<T> Data,
    int TotalCount,
    int Page,
    int Size,
    int TotalPages);

[AttributeUsage(AttributeTargets.Class)]
internal sealed class GridDemoEnabledAttribute : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        var options = context.HttpContext.RequestServices.GetRequiredService<IOptions<GridDemoOptions>>();
        if (!options.Value.Enabled)
        {
            context.Result = new NotFoundResult();
        }
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
