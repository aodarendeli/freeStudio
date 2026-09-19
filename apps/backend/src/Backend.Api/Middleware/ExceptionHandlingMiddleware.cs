using System.Text.Json;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using FluentValidation;

namespace Backend.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var (statusCode, response) = exception switch
        {
            AppException appEx => (appEx.StatusCode, ApiResponse<object>.Fail(appEx.Message, appEx.Errors)),
            FluentValidation.ValidationException validationEx => (422, ApiResponse<object>.Fail(
                "Validation failed",
                validationEx.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList())),
            _ => (500, ApiResponse<object>.Fail("Internal Server Error")),
        };

        if (statusCode == 500)
        {
            logger.LogError(exception, "Unhandled error on {Path}", context.Request.Path);
        }
        else
        {
            logger.LogWarning("Operational error {StatusCode} on {Path}: {Message}", statusCode, context.Request.Path, exception.Message);
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        }));
    }
}
