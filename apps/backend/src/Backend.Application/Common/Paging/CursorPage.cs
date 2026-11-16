namespace Backend.Application.Common.Paging;

public sealed record CursorPage<T>(IReadOnlyList<T> Items, string? NextCursor);
