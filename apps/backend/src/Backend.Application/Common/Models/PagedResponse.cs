namespace Backend.Application.Common.Models;

/// <summary>
/// Body ile sayfalanan liste yanıtı. Sayfa bilgisi `meta` altında değil, doğrudan yanıttadır.
/// </summary>
public class PagedResponse<T>
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public IReadOnlyList<T> Data { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int Size { get; init; }
    public int TotalPages { get; init; }
    public IReadOnlyList<ErrorItem>? Errors { get; init; }

    public static PagedResponse<T> Ok(IReadOnlyList<T> data, PaginationMeta meta, string message = "Success") =>
        new()
        {
            Success = true,
            Message = message,
            Data = data,
            TotalCount = meta.Total,
            Page = meta.Page,
            Size = meta.Limit,
            TotalPages = meta.TotalPages,
        };
}
