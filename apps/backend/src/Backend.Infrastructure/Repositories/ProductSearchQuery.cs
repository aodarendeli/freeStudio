using System.Globalization;
using System.Text.Json;
using Backend.Application.Products;
using Backend.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Repositories;

/// <summary>
/// VKDataGrid filtre / arama / sıralama payload'unu EF sorgusuna çevirir.
/// Alanlar ProductSearchValidator'da beyaz listeyle sınırlandırılmıştır.
/// </summary>
internal static class ProductSearchQuery
{
    public static IQueryable<Product> Apply(IQueryable<Product> query, ProductSearchDto search)
    {
        foreach (var filter in search.Filter ?? [])
        {
            query = ApplyFilter(query, filter);
        }

        if (!string.IsNullOrWhiteSpace(search.SearchText))
        {
            var pattern = LikePattern(search.SearchText.Trim(), "contains");
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, pattern, "\\") ||
                (p.Category != null && EF.Functions.ILike(p.Category.Name, pattern, "\\")));
        }

        return ApplySort(query, search.Sort);
    }

    private static IQueryable<Product> ApplyFilter(IQueryable<Product> query, ProductFilterDto filter)
    {
        var op = (filter.FilterOperator ?? "=").ToLowerInvariant();

        switch (filter.DataField.ToLowerInvariant())
        {
            case "id":
            case "name":
            case "categoryid":
            {
                var field = filter.DataField.ToLowerInvariant();
                var values = filter.FilterValues?.Select(ReadString).OfType<string>().ToList();
                if (values is { Count: > 0 })
                {
                    query = field switch
                    {
                        "id" => query.Where(p => values.Contains(p.Id)),
                        "name" => query.Where(p => values.Contains(p.Name)),
                        _ => query.Where(p => values.Contains(p.CategoryId)),
                    };
                }

                var text = ReadString(filter.FilterValue);
                if (text is null) return query;
                if (field == "categoryid") op = op is "<>" ? "<>" : "=";

                return op switch
                {
                    "=" => field switch
                    {
                        "id" => query.Where(p => p.Id == text),
                        "name" => query.Where(p => p.Name.ToLower() == text.ToLower()),
                        _ => query.Where(p => p.CategoryId == text),
                    },
                    "<>" => field switch
                    {
                        "id" => query.Where(p => p.Id != text),
                        "name" => query.Where(p => p.Name.ToLower() != text.ToLower()),
                        _ => query.Where(p => p.CategoryId != text),
                    },
                    "notcontains" => field == "id"
                        ? query.Where(p => !EF.Functions.ILike(p.Id, LikePattern(text, "contains"), "\\"))
                        : query.Where(p => !EF.Functions.ILike(p.Name, LikePattern(text, "contains"), "\\")),
                    _ => field == "id"
                        ? query.Where(p => EF.Functions.ILike(p.Id, LikePattern(text, op), "\\"))
                        : query.Where(p => EF.Functions.ILike(p.Name, LikePattern(text, op), "\\")),
                };
            }

            case "price":
            {
                var values = filter.FilterValues?.Select(ReadDecimal).OfType<decimal>().ToList();
                if (values is { Count: > 0 }) query = query.Where(p => values.Contains(p.Price));

                if (op == "between")
                {
                    var (from, to) = ReadRange(filter.FilterValue, ReadDecimal);
                    if (from is { } min) query = query.Where(p => p.Price >= min);
                    if (to is { } max) query = query.Where(p => p.Price <= max);
                    return query;
                }

                if (ReadDecimal(filter.FilterValue) is not { } value) return query;
                return op switch
                {
                    "<>" => query.Where(p => p.Price != value),
                    "<" => query.Where(p => p.Price < value),
                    ">" => query.Where(p => p.Price > value),
                    "<=" => query.Where(p => p.Price <= value),
                    ">=" => query.Where(p => p.Price >= value),
                    _ => query.Where(p => p.Price == value),
                };
            }

            case "createdat":
            {
                // Grid tarih filtresinde kullanıcının yerel gün başlangıcını (UTC'ye çevrilmiş) gönderir.
                // Karşılaştırmalar o andan başlayan 24 saatlik gün üzerinden yapılır.
                if (op == "between")
                {
                    var (from, to) = ReadRange(filter.FilterValue, ReadDate);
                    if (from is { } start) query = query.Where(p => p.CreatedAt >= start);
                    if (to is { } end)
                    {
                        var endExclusive = end.AddDays(1);
                        query = query.Where(p => p.CreatedAt < endExclusive);
                    }
                    return query;
                }

                if (ReadDate(filter.FilterValue) is not { } dayStart) return query;
                var nextDay = dayStart.AddDays(1);
                return op switch
                {
                    "<>" => query.Where(p => p.CreatedAt < dayStart || p.CreatedAt >= nextDay),
                    "<" => query.Where(p => p.CreatedAt < dayStart),
                    ">" => query.Where(p => p.CreatedAt >= nextDay),
                    "<=" => query.Where(p => p.CreatedAt < nextDay),
                    ">=" => query.Where(p => p.CreatedAt >= dayStart),
                    _ => query.Where(p => p.CreatedAt >= dayStart && p.CreatedAt < nextDay),
                };
            }

            default:
                return query;
        }
    }

    private static IQueryable<Product> ApplySort(IQueryable<Product> query, ProductSortDto? sort)
    {
        if (sort is null) return query.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id);

        var desc = sort.SortOrder == "desc";
        IOrderedQueryable<Product> ordered = sort.DataField.ToLowerInvariant() switch
        {
            "id" => desc ? query.OrderByDescending(p => p.Id) : query.OrderBy(p => p.Id),
            "name" => desc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            "price" => desc ? query.OrderByDescending(p => p.Price) : query.OrderBy(p => p.Price),
            "categoryid" => desc
                ? query.OrderByDescending(p => p.Category!.Name)
                : query.OrderBy(p => p.Category!.Name),
            _ => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
        };
        // Sayfalar arası kararlı sıralama için
        return ordered.ThenBy(p => p.Id);
    }

    private static string LikePattern(string text, string op)
    {
        var escaped = text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
        return op switch
        {
            "startswith" => $"{escaped}%",
            "endswith" => $"%{escaped}",
            _ => $"%{escaped}%",
        };
    }

    private static string? ReadString(JsonElement? element) => element?.ValueKind switch
    {
        JsonValueKind.String => element.Value.GetString() is { Length: > 0 } s ? s : null,
        JsonValueKind.Number => element.Value.GetRawText(),
        _ => null,
    };

    private static string? ReadString(JsonElement element) => ReadString((JsonElement?)element);

    private static decimal? ReadDecimal(JsonElement? element) => element?.ValueKind switch
    {
        JsonValueKind.Number when element.Value.TryGetDecimal(out var d) => d,
        JsonValueKind.String when decimal.TryParse(element.Value.GetString(), NumberStyles.Number,
            CultureInfo.InvariantCulture, out var d) => d,
        _ => null,
    };

    private static decimal? ReadDecimal(JsonElement element) => ReadDecimal((JsonElement?)element);

    private static DateTime? ReadDate(JsonElement? element) =>
        element?.ValueKind == JsonValueKind.String &&
        DateTime.TryParse(element.Value.GetString(), CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var date)
            ? DateTime.SpecifyKind(date, DateTimeKind.Utc)
            : null;

    private static (T? From, T? To) ReadRange<T>(JsonElement? element, Func<JsonElement?, T?> read)
        where T : struct
    {
        if (element?.ValueKind != JsonValueKind.Array) return (null, null);
        var items = element.Value.EnumerateArray().ToList();
        return (items.Count > 0 ? read(items[0]) : null, items.Count > 1 ? read(items[1]) : null);
    }
}
