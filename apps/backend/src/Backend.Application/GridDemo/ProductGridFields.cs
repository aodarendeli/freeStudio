namespace Backend.Application.GridDemo;

public enum GridFieldKind { Text, Id, Number, Date }

/// <summary>
/// Ürün grid'inde filtrelenebilen / sıralanabilen alanlar ve her alanın kabul ettiği operatörler.
/// Filtre ağacı react-querybuilder operatör adlarıyla gelir, burada iç (DevExtreme) adlara çevrilir.
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

    /// <summary>react-querybuilder operatör adı -> bu sınıfın (DevExtreme) operatör adı</summary>
    private static readonly IReadOnlyDictionary<string, string> TreeOperatorMap = new Dictionary<string, string>
    {
        ["="] = "=",
        ["!="] = "<>",
        ["<"] = "<",
        [">"] = ">",
        ["<="] = "<=",
        [">="] = ">=",
        ["contains"] = "contains",
        ["doesNotContain"] = "notcontains",
        ["beginsWith"] = "startswith",
        ["endsWith"] = "endswith",
        ["between"] = "between",
        ["in"] = "in",
    };

    /// <summary>Katı çözümleme: alan bilinmiyorsa ya da operatör alana uymuyorsa <c>false</c>.</summary>
    public static bool TryResolveTreeRule(string? dataField, string? treeOperator, out string field, out GridFieldKind kind, out string op)
    {
        field = All.Keys.FirstOrDefault(k => k.Equals(dataField, StringComparison.OrdinalIgnoreCase)) ?? string.Empty;
        kind = default;
        op = string.Empty;
        if (field.Length == 0 || treeOperator is null || !TreeOperatorMap.TryGetValue(treeOperator, out var mapped))
        {
            return false;
        }

        var spec = All[field];
        if (!spec.Operators.Contains(mapped))
        {
            return false;
        }

        kind = spec.Kind;
        op = mapped;
        return true;
    }
}
