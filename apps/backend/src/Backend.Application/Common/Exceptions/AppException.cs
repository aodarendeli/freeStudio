using Backend.Application.Common.Models;

namespace Backend.Application.Common.Exceptions;

public abstract class AppException : Exception
{
    public int StatusCode { get; }
    public IReadOnlyList<ErrorItem>? Errors { get; }

    protected AppException(string message, int statusCode, IReadOnlyList<ErrorItem>? errors = null)
        : base(message)
    {
        StatusCode = statusCode;
        Errors = errors;
    }
}

public class BadRequestException(string message, IReadOnlyList<ErrorItem>? errors = null)
    : AppException(message, 400, errors);

public class ValidationFailedException(IReadOnlyList<ErrorItem> errors)
    : AppException("Validation failed", 422, errors);

public class UnauthorizedAppException(string message = "Unauthorized")
    : AppException(message, 401);

public class ForbiddenAppException(string message = "Forbidden")
    : AppException(message, 403);

public class NotFoundAppException(string message = "Not found")
    : AppException(message, 404);
