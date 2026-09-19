namespace Backend.Application.Common.Models;

public record ErrorItem(string? Field, string Message);

public record PaginationMeta(int Total, int Page, int Limit, int TotalPages);

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public T? Data { get; init; }
    public PaginationMeta? Meta { get; init; }
    public IReadOnlyList<ErrorItem>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string message = "Success", PaginationMeta? meta = null) =>
        new() { Success = true, Message = message, Data = data, Meta = meta };

    public static ApiResponse<T> Fail(string message, IReadOnlyList<ErrorItem>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors };
}
