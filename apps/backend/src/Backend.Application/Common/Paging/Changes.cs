using Backend.Application.Common.Exceptions;

namespace Backend.Application.Common.Paging;

internal static class Changes
{
    public static TimeCursor? ValidateAndDecode(string? since, int limit)
    {
        if (limit is < 1 or > SyncOptions.MaxLimit)
        {
            throw new BadRequestAppException($"'limit' must be between 1 and {SyncOptions.MaxLimit}");
        }

        return TimeCursor.Decode(since);
    }

    /// <summary><paramref name="rows"/> holds up to limit + 1 rows; the extra one only signals that more exist.</summary>
    public static ChangesPage<TDto> Page<TEntity, TDto>(
        IReadOnlyList<TEntity> rows, int limit, string? since, Func<TEntity, TimeCursor> cursorOf, Func<TEntity, TDto> map)
    {
        var page = rows.Take(limit).ToList();
        var cursor = page.Count > 0 ? cursorOf(page[^1]).Encode() : since;
        return new ChangesPage<TDto>(page.Select(map).ToList(), cursor, rows.Count > limit);
    }
}
