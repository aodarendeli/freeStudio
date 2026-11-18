using Backend.Application.GridDemo;
using ClosedXML.Excel;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Backend.Api.Controllers.GridDemo;

/// <summary>
/// VKDataGrid server modu. Filtre / arama / sıralama / sayfa body ile gelir (grid'in <c>onFilterChange</c> payload'u).
/// <c>filter</c> react-querybuilder ağacıdır (VE / VEYA / DEĞİL, iç içe gruplar); hatalı ağaç 400 döner
/// (bkz. <see cref="FilterNode"/>). Alanlar ve RQB operatörleri:
/// <list type="bullet">
/// <item><c>name</c>: contains, doesNotContain, beginsWith, endsWith, =, !=, in</item>
/// <item><c>categoryId</c>: =, !=, in</item>
/// <item><c>price</c>, <c>createdAt</c>: =, !=, &lt;, &gt;, &lt;=, &gt;=, between, in</item>
/// </list>
/// <c>searchText</c> her kelimeyi ürün adında veya kategori adında arar.
/// </summary>
[Route("api/products")]
public sealed class ProductsController(
    IProductCatalog catalog,
    IValidator<ProductSearchRequest> searchValidator,
    IValidator<ProductInput> inputValidator,
    IOptions<GridDemoOptions> options)
    : GridDemoControllerBase
{
    private const int ExportLimit = 10_000;

    [HttpPost]
    [ProducesResponseType<GridPagedResponse<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromBody] ProductSearchRequest request, CancellationToken ct)
    {
        await searchValidator.ValidateAndThrowAsync(request, ct);
        return Ok(Paged(await catalog.SearchAsync(request, ct)));
    }

    /// <summary>Filtreye uyan tüm ürünler Excel olarak (en fazla 10.000 satır). Body listeyle aynı, page / size yok sayılır.</summary>
    [HttpPost("export")]
    [Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    public async Task<IActionResult> Export([FromBody] ProductSearchRequest request, CancellationToken ct)
    {
        await searchValidator.ValidateAndThrowAsync(request with { Page = 1, Size = 1 }, ct);
        var rows = await catalog.ExportAsync(request, ExportLimit, ct);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Ürünler");
        string[] headers = ["Ürün adı", "Kategori", "Fiyat", "Oluşturulma"];
        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        var tz = TimeZoneInfo.FindSystemTimeZoneById(options.Value.DefaultTimeZone);
        for (var r = 0; r < rows.Count; r++)
        {
            var row = rows[r];
            sheet.Cell(r + 2, 1).Value = row.Name;
            sheet.Cell(r + 2, 2).Value = row.CategoryName;
            sheet.Cell(r + 2, 3).Value = row.Price;
            sheet.Cell(r + 2, 4).Value = TimeZoneInfo.ConvertTime(row.CreatedAt, tz).DateTime;
        }

        sheet.Row(1).Style.Font.Bold = true;
        sheet.Column(3).Style.NumberFormat.Format = "#,##0.00 ₺";
        sheet.Column(4).Style.DateFormat.Format = "dd.MM.yyyy HH:mm";
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var fileName = $"urunler-{TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz):yyyyMMdd-HHmm}.xlsx";
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<GridResponse<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        Ok(Envelope(await catalog.GetAsync(id, ct)));

    [HttpPost("create")]
    [ProducesResponseType<GridResponse<ProductDto>>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] ProductInput input, CancellationToken ct)
    {
        await inputValidator.ValidateAndThrowAsync(input, ct);
        var product = await catalog.CreateAsync(input, ct);
        return StatusCode(StatusCodes.Status201Created, Envelope(product, "Ürün eklendi."));
    }

    [HttpPut("update/{id:guid}")]
    [ProducesResponseType<GridResponse<ProductDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProductInput input, CancellationToken ct)
    {
        await inputValidator.ValidateAndThrowAsync(input, ct);
        return Ok(Envelope(await catalog.UpdateAsync(id, input, ct), "Ürün güncellendi."));
    }

    [HttpDelete("delete/{id:guid}")]
    [ProducesResponseType<GridResponse<object>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await catalog.DeleteAsync(id, ct);
        return Ok(Envelope(new { }, "Ürün silindi."));
    }
}
