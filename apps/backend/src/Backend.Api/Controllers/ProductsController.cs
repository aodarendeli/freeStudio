using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Products;
using ClosedXML.Excel;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(
    IProductService productService,
    IValidator<CreateProductDto> validator,
    IValidator<UpdateProductDto> updateValidator,
    IValidator<ProductSearchDto> searchValidator)
    : ControllerBase
{
    [HttpPost("create")]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var product = await productService.CreateAsync(dto, ct);
        return StatusCode(201, ApiResponse<ProductDto>.Ok(product, "Created successfully"));
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] ProductQueryDto query, CancellationToken ct)
    {
        var (items, meta) = await productService.GetAllAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<ProductDto>>.Ok(items, meta: meta));
    }

    /// <summary>Liste. Sayfa / filtre / sıralama / arama bilgisi body ile gelir (VKDataGrid payload'u).</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromBody] ProductSearchDto search, CancellationToken ct)
    {
        await searchValidator.ValidateAndThrowAsync(search, ct);

        var (items, meta) = await productService.SearchAsync(search, ct);
        return Ok(PagedResponse<ProductDto>.Ok(items, meta));
    }

    /// <summary>
    /// Grid'deki filtre / arama / sıralamaya uyan tüm kayıtları Excel olarak döner.
    /// Body liste ile aynıdır; page / size yok sayılır.
    /// </summary>
    [HttpPost("export")]
    [AllowAnonymous]
    public async Task<IActionResult> Export([FromBody] ProductSearchDto search, CancellationToken ct)
    {
        await searchValidator.ValidateAndThrowAsync(search with { Page = 1, Size = 1 }, ct);

        var rows = await productService.ExportAsync(search, ct);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Ürünler");
        string[] headers = ["Ürün adı", "Kategori", "Fiyat", "Oluşturulma"];
        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        for (var r = 0; r < rows.Count; r++)
        {
            var row = rows[r];
            sheet.Cell(r + 2, 1).Value = row.Name;
            sheet.Cell(r + 2, 2).Value = row.CategoryName;
            sheet.Cell(r + 2, 3).Value = row.Price;
            sheet.Cell(r + 2, 4).Value = row.CreatedAt;
        }

        sheet.Row(1).Style.Font.Bold = true;
        sheet.Column(3).Style.NumberFormat.Format = "#,##0.00 ₺";
        sheet.Column(4).Style.DateFormat.Format = "dd.MM.yyyy HH:mm";
        sheet.SheetView.FreezeRows(1);
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var fileName = $"urunler-{DateTime.Now:yyyyMMdd-HHmm}.xlsx";
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var product = await productService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<ProductDto>.Ok(product));
    }

    [HttpPut("update/{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateProductDto dto, CancellationToken ct)
    {
        var result = await updateValidator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var product = await productService.UpdateAsync(id, dto, ct);
        return Ok(ApiResponse<ProductDto>.Ok(product, "Updated successfully"));
    }

    [HttpDelete("delete/{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await productService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
