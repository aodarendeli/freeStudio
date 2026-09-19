using Backend.Application.Common.Auth;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Seo;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/seo")]
public class SeoController(
    ISeoMetadataService seoService,
    IValidator<CreateSeoMetadataDto> validator,
    IValidator<UpdateSeoMetadataDto> updateValidator)
    : ControllerBase
{
    [HttpPost]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateSeoMetadataDto dto, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var entry = await seoService.CreateAsync(dto, ct);
        return StatusCode(201, ApiResponse<SeoMetadataDto>.Ok(entry, "Created successfully"));
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] SeoQueryDto query, CancellationToken ct)
    {
        var (items, meta) = await seoService.GetAllAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<SeoMetadataDto>>.Ok(items, meta: meta));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var entry = await seoService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<SeoMetadataDto>.Ok(entry));
    }

    /// <summary>Sayfa render ederken slug'a göre SEO metadata çekmek için (örn. "blog/my-post").</summary>
    [HttpGet("by-slug/{*slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug, [FromQuery] string projectKey, CancellationToken ct)
    {
        var entry = await seoService.GetBySlugAsync(projectKey, slug, ct);
        return Ok(ApiResponse<SeoMetadataDto>.Ok(entry));
    }

    [HttpPut("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateSeoMetadataDto dto, CancellationToken ct)
    {
        var result = await updateValidator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        var entry = await seoService.UpdateAsync(id, dto, ct);
        return Ok(ApiResponse<SeoMetadataDto>.Ok(entry, "Updated successfully"));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await seoService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
