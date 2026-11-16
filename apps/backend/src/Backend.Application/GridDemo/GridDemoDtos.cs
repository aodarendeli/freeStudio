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
/// </summary>
public record ProductSearchRequest(
    int Page = 1,
    int Size = 10,
    IReadOnlyList<GridFilter>? Filter = null,
    string? SearchText = null,
    GridSort? Sort = null);

/// <summary>
/// <c>filterValue</c>: tek değer ya da <c>between</c> için [başlangıç, bitiş] (uçlardan biri null olabilir).
/// <c>filterValues</c>: header filter'da seçilen değerler (aralarında VEYA).
/// </summary>
public record GridFilter(
    string DataField,
    string? DataType = null,
    string? FilterOperator = null,
    JsonElement? FilterValue = null,
    IReadOnlyList<JsonElement>? FilterValues = null,
    string? Name = null);

public record GridSort(string DataField, string SortOrder = "asc", string? DataType = null, string? Name = null);
