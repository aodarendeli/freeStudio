using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using Backend.Application.GridDemo;
using Backend.Domain.GridDemo;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.GridDemo;

/// <summary>
/// VKDataGrid filtre / arama / sıralama payload'unu SQL'e çevrilebilir EF ifadesine dönüştürür.
/// <list type="bullet">
/// <item>Aynı filtredeki <c>filterValue</c> ve <c>filterValues</c> VE ile, <c>filterValues</c> kendi içinde VEYA ile bağlanır.</item>
/// <item>Metin karşılaştırmaları büyük/küçük harf duyarsızdır (ILIKE); %, _ ve \ kaçışlanır.</item>
/// <item>Tarih: "2026-11-11" ayarlı saat dilimindeki (GridDemo:DefaultTimeZone) tüm günü, "2026-11-11T14:30:00" o dakikayı, "…Z" / "+03:00" o anı ifade eder.</item>
/// <item>Filtre ağacı (<c>filter</c>) katıdır: yapı kuralları <see cref="FilterTreeRules"/> ile önceden doğrulanır,
/// tipe uymayan değer (sayı, tarih, kategori id) 400 döner.</item>
/// </list>
/// </summary>
internal static class ProductGridQuery
{
    private static readonly ParameterExpression P = Expression.Parameter(typeof(Product), "p");

    private static readonly MethodInfo ILikeMethod = typeof(NpgsqlDbFunctionsExtensions).GetMethod(
        nameof(NpgsqlDbFunctionsExtensions.ILike),
        [typeof(DbFunctions), typeof(string), typeof(string), typeof(string)])!;

    private static readonly string[] LocalDateTimeFormats =
        ["yyyy-MM-dd'T'HH:mm", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF", "yyyy-MM-dd HH:mm", "yyyy-MM-dd HH:mm:ss"];

    public static IQueryable<Product> Filter(IQueryable<Product> query, ProductSearchRequest request, TimeZoneInfo timeZone)
    {
        if (request.Filter is { } tree && BuildNode(tree, "filter", timeZone) is { } body)
        {
            query = query.Where(Expression.Lambda<Func<Product, bool>>(body, P));
        }

        // Genel arama: her kelime ürün adında ya da kategori adında geçmeli
        var terms = (request.SearchText ?? string.Empty)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var term in terms)
        {
            var pattern = LikePattern(term, "contains");
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, pattern, "\\") || EF.Functions.ILike(p.Category!.Name, pattern, "\\"));
        }

        return query;
    }

    public static IQueryable<Product> Sort(IQueryable<Product> query, GridSort? sort)
    {
        if (sort is null)
        {
            return query.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id);
        }

        var desc = string.Equals(sort.SortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        var field = ProductGridFields.All.Keys.FirstOrDefault(k => k.Equals(sort.DataField, StringComparison.OrdinalIgnoreCase));
        IOrderedQueryable<Product> ordered = field switch
        {
            ProductGridFields.Name => desc ? query.OrderByDescending(p => p.Name) : query.OrderBy(p => p.Name),
            ProductGridFields.Price => desc ? query.OrderByDescending(p => p.Price) : query.OrderBy(p => p.Price),
            // Kategori sütunu ad gösterdiği için ada göre sıralanır
            ProductGridFields.CategoryId => desc
                ? query.OrderByDescending(p => p.Category!.Name)
                : query.OrderBy(p => p.Category!.Name),
            _ => desc ? query.OrderByDescending(p => p.CreatedAt) : query.OrderBy(p => p.CreatedAt),
        };

        // Eşit değerlerde sayfalar arası kararlı sıra
        return ordered.ThenBy(p => p.Id);
    }

    /// <summary>Grup: alt düğümler VE / VEYA ile bağlanır, <c>not</c> ise tersine çevrilir. Boş grup filtre değildir.</summary>
    private static Expression? BuildNode(FilterNode node, string path, TimeZoneInfo tz)
    {
        if (node.IsGroup)
        {
            var children = node.Rules!
                .Select((child, i) => BuildNode(child, $"{path}.rules[{i}]", tz))
                .OfType<Expression>()
                .ToList();
            if (children.Count == 0)
            {
                return null;
            }

            Func<Expression, Expression, BinaryExpression> combine =
                node.Combinator == "or" ? Expression.OrElse : Expression.AndAlso;
            var combined = children.Aggregate((a, b) => combine(a, b));
            return node.Not ? Expression.Not(combined) : combined;
        }

        if (!ProductGridFields.TryResolveTreeRule(node.Field, node.Operator, out var field, out var kind, out var op)
            || node.Value is not { } value)
        {
            throw InvalidTree(path, $"'{node.Field}' alanı '{node.Operator}' operatörünü desteklemiyor.");
        }

        var condition = new Condition(field, kind, Member(field), tz);

        // Tek değer: tipine uymuyorsa (sayı, tarih, kategori id) kural yok sayılmaz, hata döner
        Expression Single(string singleOp, JsonElement v) =>
            condition.Build(singleOp, v)
            ?? throw InvalidTree($"{path}.value", $"'{field}' alanı için geçersiz değer: {v.GetRawText()}");

        switch (op)
        {
            case "in":
                return value.EnumerateArray().Select(v => Single("=", v)).Aggregate(Expression.OrElse);
            case "between":
                // İki uç da tipe uymalı; ifade yine aynı aralık mantığıyla kurulur
                foreach (var end in value.EnumerateArray())
                {
                    Single("=", end);
                }

                return condition.Build("between", value)!;
            default:
                return Single(op, value);
        }
    }

    private static ValidationException InvalidTree(string path, string message) =>
        new([new ValidationFailure(path, message)]);

    private static Expression Member(string field) => field switch
    {
        ProductGridFields.Name => Expression.Property(P, nameof(Product.Name)),
        ProductGridFields.CategoryId => Expression.Property(P, nameof(Product.CategoryId)),
        ProductGridFields.Price => Expression.Property(P, nameof(Product.Price)),
        ProductGridFields.CreatedAt => Expression.Property(P, nameof(Product.CreatedAt)),
        _ => throw new ArgumentOutOfRangeException(nameof(field), field, null),
    };

    private sealed record Condition(string Field, GridFieldKind Kind, Expression Member, TimeZoneInfo TimeZone)
    {
        public Expression? Build(string op, JsonElement value) => Kind switch
        {
            GridFieldKind.Text => ReadString(value) is { } text ? Text(op, text) : null,
            GridFieldKind.Id => ReadGuid(value) is { } id ? Id(op, id) : null,
            GridFieldKind.Number => Number(op, value),
            GridFieldKind.Date => Date(op, value),
            _ => null,
        };

        private Expression Text(string op, string text)
        {
            Expression Like(string kind) => Expression.Call(
                ILikeMethod,
                Expression.Constant(EF.Functions, typeof(DbFunctions)),
                Member,
                Param(LikePattern(text, kind)),
                Expression.Constant("\\"));

            return op switch
            {
                "notcontains" => Expression.Not(Like("contains")),
                "startswith" or "endswith" or "contains" => Like(op),
                "<>" => Expression.Not(Like("exact")),
                _ => Like("exact"), // "=" büyük/küçük harf duyarsız eşitlik
            };
        }

        private Expression Id(string op, Guid id) =>
            op == "<>" ? Expression.NotEqual(Member, Param(id)) : Expression.Equal(Member, Param(id));

        private Expression? Number(string op, JsonElement value)
        {
            if (op == "between")
            {
                var (from, to) = ReadRange(value, ReadDecimal);
                return Both(
                    from is { } min ? Expression.GreaterThanOrEqual(Member, Param(min)) : null,
                    to is { } max ? Expression.LessThanOrEqual(Member, Param(max)) : null);
            }

            return ReadDecimal(value) is { } number ? Compare(op, Param(number)) : null;
        }

        private Expression? Date(string op, JsonElement value)
        {
            if (op == "between")
            {
                var (from, to) = ReadRange(value, ReadSpan);
                return Both(
                    from is { } start ? Expression.GreaterThanOrEqual(Member, Param(start.Start)) : null,
                    to is { } end ? Expression.LessThan(Member, Param(end.End)) : null);
            }

            if (ReadSpan(value) is not { } span)
            {
                return null;
            }

            Expression dayStart = Param(span.Start), until = Param(span.End);
            return op switch
            {
                "<>" => Expression.OrElse(Expression.LessThan(Member, dayStart), Expression.GreaterThanOrEqual(Member, until)),
                "<" => Expression.LessThan(Member, dayStart),
                ">" => Expression.GreaterThanOrEqual(Member, until),
                "<=" => Expression.LessThan(Member, until),
                ">=" => Expression.GreaterThanOrEqual(Member, dayStart),
                _ => Expression.AndAlso(Expression.GreaterThanOrEqual(Member, dayStart), Expression.LessThan(Member, until)),
            };
        }

        private Expression Compare(string op, Expression value) => op switch
        {
            "<>" => Expression.NotEqual(Member, value),
            "<" => Expression.LessThan(Member, value),
            ">" => Expression.GreaterThan(Member, value),
            "<=" => Expression.LessThanOrEqual(Member, value),
            ">=" => Expression.GreaterThanOrEqual(Member, value),
            _ => Expression.Equal(Member, value),
        };

        /// <summary>Değerin kapsadığı [Start, End) zaman aralığı (UTC).</summary>
        private (DateTimeOffset Start, DateTimeOffset End)? ReadSpan(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var epochMs))
            {
                var instant = DateTimeOffset.FromUnixTimeMilliseconds(epochMs);
                return (instant, instant.AddMinutes(1));
            }

            if (value.ValueKind != JsonValueKind.String || value.GetString() is not { Length: > 0 } raw)
            {
                return null;
            }

            raw = raw.Trim();
            var inv = CultureInfo.InvariantCulture;

            // Sadece tarih: saat dilimindeki tüm gün
            if (DateOnly.TryParseExact(raw, "yyyy-MM-dd", inv, DateTimeStyles.None, out var day))
            {
                return (ToUtc(day.ToDateTime(TimeOnly.MinValue)), ToUtc(day.AddDays(1).ToDateTime(TimeOnly.MinValue)));
            }

            // Ofsetsiz yerel saat: saat dilimine göre çevrilir
            if (DateTime.TryParseExact(raw, LocalDateTimeFormats, inv, DateTimeStyles.None, out var local))
            {
                var start = ToUtc(local);
                return (start, start.Add(Precision(local)));
            }

            // Ofsetli / Z: kesin an
            if (DateTimeOffset.TryParse(raw, inv, DateTimeStyles.AssumeUniversal, out var exact))
            {
                var start = exact.ToUniversalTime();
                return (start, start.Add(Precision(start.UtcDateTime)));
            }

            return null;
        }

        private DateTimeOffset ToUtc(DateTime local)
        {
            var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
            // Yaz saati geçişindeki var olmayan saat bir sonraki geçerli saate kayar
            while (TimeZone.IsInvalidTime(unspecified))
            {
                unspecified = unspecified.AddMinutes(30);
            }

            return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(unspecified, TimeZone), TimeSpan.Zero);
        }

        /// <summary>"14:30" ya da "14:30:00" o dakikayı, saniyeli değer o saniyeyi kapsar.</summary>
        private static TimeSpan Precision(DateTime value) =>
            value is { Second: 0, Millisecond: 0 } ? TimeSpan.FromMinutes(1) : TimeSpan.FromSeconds(1);
    }

    private static Expression? Both(Expression? a, Expression? b) =>
        a is null ? b : b is null ? a : Expression.AndAlso(a, b);

    /// <summary>Sabit yerine kapanış üzerinden verilir ki EF SQL parametresi üretsin (plan önbelleği, injection yok).</summary>
    private static MemberExpression Param<T>(T value) =>
        Expression.Property(Expression.Constant(new Box<T>(value)), nameof(Box<T>.Value));

    private sealed record Box<T>(T Value);

    private static string LikePattern(string text, string kind)
    {
        var escaped = text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
        return kind switch
        {
            "startswith" => $"{escaped}%",
            "endswith" => $"%{escaped}",
            "exact" => escaped,
            _ => $"%{escaped}%",
        };
    }

    private static bool HasValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => false,
        JsonValueKind.String => !string.IsNullOrWhiteSpace(value.GetString()),
        JsonValueKind.Array => value.EnumerateArray().Any(HasValue),
        _ => true,
    };

    private static string? ReadString(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => value.GetString()?.Trim(),
        JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False => value.GetRawText(),
        _ => null,
    };

    private static Guid? ReadGuid(JsonElement value) =>
        value.ValueKind == JsonValueKind.String && Guid.TryParse(value.GetString(), out var id) ? id : null;

    private static decimal? ReadDecimal(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Number when value.TryGetDecimal(out var d) => d,
        // "12,5" gibi Türkçe ondalık da kabul edilir
        JsonValueKind.String when decimal.TryParse(value.GetString()?.Trim().Replace(',', '.'), NumberStyles.Number,
            CultureInfo.InvariantCulture, out var d) => d,
        _ => null,
    };

    /// <summary><c>between</c> değeri: [başlangıç, bitiş]; null uç açık aralıktır.</summary>
    /// Dizi değilse ya da uçlar okunamıyorsa o uç açık kabul edilir.
    private static (T? From, T? To) ReadRange<T>(JsonElement value, Func<JsonElement, T?> read) where T : struct
    {
        if (value.ValueKind != JsonValueKind.Array)
        {
            return (null, null);
        }

        var items = value.EnumerateArray().ToList();
        T? At(int i) => items.Count > i && HasValue(items[i]) ? read(items[i]) : null;
        return (At(0), At(1));
    }
}
