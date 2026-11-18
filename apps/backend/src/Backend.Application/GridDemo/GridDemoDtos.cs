using System.Text.Json;

namespace Backend.Application.GridDemo;

public sealed class GridDemoOptions
{
    /// <summary>Uçları açar ve açılışta tablo boşsa seed eder. Belirtilmezse yalnızca Development'ta açıktır.</summary>
    public bool Enabled { get; set; }

    /// <summary>Tablo boşken eklenecek ürün sayısı.</summary>
    public int SeedCount { get; set; } = 100;

    /// <summary>"2026-11-11" gibi tarih filtreleri bu saat dilimindeki güne göre yorumlanır (UTC için "UTC").</summary>
    public string DefaultTimeZone { get; set; } = "Europe/Istanbul";
}

public record ProductDto(Guid Id, string Name, decimal Price, Guid CategoryId, DateTimeOffset CreatedAt);

public record CategoryDto(Guid Id, string Name, DateTimeOffset CreatedAt);

public record ProductInput(string Name, decimal Price, Guid CategoryId);

/// <summary>Excel satırı: kategori id yerine adı yazılır.</summary>
public record ProductExportRow(string Name, string CategoryName, decimal Price, DateTimeOffset CreatedAt);

public record PageRequest(int Page = 1, int Size = 10);

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int Size);

/// <summary>
/// VKDataGrid <c>onFilterChange</c> payload'u. Sayfa bilgisi body ile gelir, <c>page</c> 1'den başlar.
/// <c>filter</c>: grid'in tüm filtreleri (filtre satırı, header filter, gelişmiş filtre) react-querybuilder ağacı olarak.
/// </summary>
public record ProductSearchRequest(
    int Page = 1,
    int Size = 10,
    FilterNode? Filter = null,
    string? SearchText = null,
    GridSort? Sort = null);

/// <summary>
/// react-querybuilder biçiminde filtre ağacı düğümü. <c>rules</c> doluysa grup, değilse kuraldır.
/// <list type="bullet">
/// <item>Grup: <c>combinator</c> (<c>and</c> / <c>or</c>), <c>not</c>, <c>rules</c>.</item>
/// <item>Kural: <c>field</c>, <c>operator</c> (RQB adları: =, !=, &lt;, &gt;, &lt;=, &gt;=, contains, doesNotContain,
/// beginsWith, endsWith, between, in), <c>value</c>: tek değer; <c>between</c> için [başlangıç, bitiş]; <c>in</c> için dizi.</item>
/// </list>
/// RQB'nin <c>id</c> / <c>path</c> alanları yok sayılır. Hatalı ağaç yok sayılmaz, 400 döner.
/// </summary>
public record FilterNode(
    string? Combinator = null,
    bool Not = false,
    IReadOnlyList<FilterNode>? Rules = null,
    string? Field = null,
    string? Operator = null,
    JsonElement? Value = null)
{
    public bool IsGroup => Rules is not null;
}

public record GridSort(string DataField, string SortOrder = "asc", string? DataType = null, string? Name = null);
