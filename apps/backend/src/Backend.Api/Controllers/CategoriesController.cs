using Backend.Application.Categories;
using Backend.Application.Common.Auth;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(
    ICategoryService categoryService,
    IValidator<CreateCategoryDto> validator,
    IValidator<UpdateCategoryDto> updateValidator)
    : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var category = await categoryService.CreateAsync(dto, ct);
        return StatusCode(201, ApiResponse<CategoryDto>.Ok(category, "Created successfully"));
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] CategoryQueryDto query, CancellationToken ct)
    {
        var (items, meta) = await categoryService.GetAllAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<CategoryDto>>.Ok(items, meta: meta));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var category = await categoryService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<CategoryDto>.Ok(category));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateCategoryDto dto, CancellationToken ct)
    {
        var result = await updateValidator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var category = await categoryService.UpdateAsync(id, dto, ct);
        return Ok(ApiResponse<CategoryDto>.Ok(category, "Updated successfully"));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await categoryService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
