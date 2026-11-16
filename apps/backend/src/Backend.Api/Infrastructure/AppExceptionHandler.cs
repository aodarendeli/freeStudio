using Backend.Application.Common.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Infrastructure;

/// <summary>Maps exceptions to RFC 9457 Problem Details with a stable <c>code</c> extension.</summary>
internal sealed class AppExceptionHandler(IProblemDetailsService problemDetails, ILogger<AppExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem = exception switch
        {
            AppException app => new ProblemDetails { Status = app.StatusCode, Title = app.Message },
            ValidationException validation => new ValidationProblemDetails(
                validation.Errors
                    .GroupBy(e => ToCamelPath(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()))
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
            },
            _ => new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "Internal Server Error" },
        };

        problem.Extensions["code"] = exception switch
        {
            AppException app => app.Code,
            ValidationException => ErrorCodes.Validation,
            _ => ErrorCodes.Unknown,
        };

        if (problem.Status >= 500)
        {
            logger.LogError(exception, "Unhandled error on {Method} {Path}", context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = problem.Status ?? 500;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context, ProblemDetails = problem, Exception = exception,
        });
    }

    private static string ToCamelPath(string path) =>
        string.Join('.', path.Split('.').Select(p => p.Length == 0 ? p : char.ToLowerInvariant(p[0]) + p[1..]));
}
