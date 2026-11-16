namespace Backend.Application.GridDemo;

public enum GridFieldKind { Text, Id, Number, Date }

/// <summary>
/// Ürün grid'inde filtrelenebilen / sıralanabilen alanlar ve her alanın kabul ettiği operatörler.
/// Hata dönülmez: bilinmeyen alan yok sayılır, alana uymayan operatör en yakın karşılığına çevrilir
/// (ör. lookup sütunu <c>categoryId</c> için grid'in gönderdiği <c>contains</c> → <c>=</c>).
/// </summary>
public static class ProductGridFields
{
    public const string Name = "name";
    public const string CategoryId = "categoryId";
    public const string Price = "price";
    public const string CreatedAt = "createdAt";

    private static readonly string[] TextOps = ["contains", "notcontains", "startswith", "endswith", "=", "<>", "in"];
    private static readonly string[] IdOps = ["=", "<>", "in"];
    private static readonly string[] RangeOps = ["=", "<>", "<", ">", "<=", ">=", "between", "in"];

    public static readonly IReadOnlyDictionary<string, (GridFieldKind Kind, string[] Operators)> All =
        new Dictionary<string, (GridFieldKind, string[])>(StringComparer.OrdinalIgnoreCase)
        {
            [Name] = (GridFieldKind.Text, TextOps),
            [CategoryId] = (GridFieldKind.Id, IdOps),
            [Price] = (GridFieldKind.Number, RangeOps),
            [CreatedAt] = (GridFieldKind.Date, RangeOps),
        };

    /// <summary>Grid'in farklı yazımlarını (startWith, equals, notEquals, …) tek biçime indirir.</summary>
    public static string NormalizeOperator(string? op, GridFieldKind kind) => op?.Trim().ToLowerInvariant() switch
    {
        null or "" => kind == GridFieldKind.Text ? "contains" : "=",
        "startwith" => "startswith",
        "endwith" => "endswith",
        "equals" => "=",
        "notequals" => "<>",
        var other => other,
    };

    /// <summary>Alanı (büyük/küçük harf duyarsız) bulur ve operatörü alanın desteklediği bir operatöre çevirir.</summary>
    public static bool TryResolve(string? dataField, string? op, out string field, out GridFieldKind kind, out string resolvedOp)
    {
        field = All.Keys.FirstOrDefault(k => k.Equals(dataField, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
        kind = default;
        resolvedOp = string.Empty;
        if (field.Length == 0)
        {
            return false;
        }

        var spec = All[field];
        kind = spec.Kind;
        var normalized = NormalizeOperator(op, kind);
        var negative = normalized is "<>" or "notcontains";
        resolvedOp = spec.Operators.Contains(normalized)
            ? normalized
            : kind == GridFieldKind.Text
                ? negative ? "notcontains" : "contains"
                : negative ? "<>" : "=";
        return true;
    }
}
