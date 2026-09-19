using Backend.Application.Common.Auth;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Menu;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/menu-items")]
public class MenuItemsController(
    IMenuItemService menuItemService,
    IValidator<CreateMenuItemDto> validator,
    IValidator<UpdateMenuItemDto> updateValidator)
    : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemDto dto, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var item = await menuItemService.CreateAsync(dto, ct);
        return StatusCode(201, ApiResponse<MenuItemDto>.Ok(item, "Created successfully"));
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? projectKey, CancellationToken ct)
    {
        var items = await menuItemService.GetAllAsync(projectKey, ct);
        return Ok(ApiResponse<IReadOnlyList<MenuItemDto>>.Ok(items));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var item = await menuItemService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<MenuItemDto>.Ok(item));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateMenuItemDto dto, CancellationToken ct)
    {
        var result = await updateValidator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var item = await menuItemService.UpdateAsync(id, dto, ct);
        return Ok(ApiResponse<MenuItemDto>.Ok(item, "Updated successfully"));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await menuItemService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
