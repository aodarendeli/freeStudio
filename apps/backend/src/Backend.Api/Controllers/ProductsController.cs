using Backend.Application.Common.Auth;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Products;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController(
    IProductService productService,
    IValidator<CreateProductDto> validator,
    IValidator<UpdateProductDto> updateValidator)
    : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = Policies.Admin)]
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

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var product = await productService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<ProductDto>.Ok(product));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.Admin)]
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

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await productService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
