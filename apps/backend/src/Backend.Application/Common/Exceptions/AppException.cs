namespace Backend.Application.Common.Exceptions;

/// <summary>Stable error codes, mirrored by the mobile app's <c>ErrorCode</c>. Sent as the Problem Details <c>code</c>.</summary>
public static class ErrorCodes
{
    public const string NotFound = "NotFound";
    public const string Validation = "Validation";
    public const string Conflict = "Conflict";
    public const string Permission = "Permission";
    public const string Unauthorized = "Unauthorized";
    public const string Unknown = "Unknown";
}

public abstract class AppException(string code, int statusCode, string message) : Exception(message)
{
    public string Code { get; } = code;
    public int StatusCode { get; } = statusCode;
}

public sealed class NotFoundAppException(string message = "Not found")
    : AppException(ErrorCodes.NotFound, 404, message);

public sealed class ForbiddenAppException(string message = "Forbidden")
    : AppException(ErrorCodes.Permission, 403, message);

public sealed class UnauthorizedAppException(string message = "Unauthorized")
    : AppException(ErrorCodes.Unauthorized, 401, message);

/// <summary>Version mismatch (If-Match) or a concurrent write. The client re-reads and merges.</summary>
public sealed class ConflictAppException(string message = "The resource was changed by someone else")
    : AppException(ErrorCodes.Conflict, 409, message);

public sealed class BadRequestAppException(string message)
    : AppException(ErrorCodes.Validation, 400, message);
