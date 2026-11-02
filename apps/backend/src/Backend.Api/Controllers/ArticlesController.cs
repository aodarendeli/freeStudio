using Backend.Application.Articles;
using Backend.Application.Common.Auth;
using Backend.Application.Common.Models;
using Backend.Domain.Enums;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/articles")]
public class ArticlesController(
    IArticleService articleService,
    IValidator<CreateArticleDto> createValidator,
    IValidator<UpdateArticleDto> updateValidator,
    IValidator<ArticleQueryDto> queryValidator)
    : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll([FromQuery] ArticleQueryDto query, CancellationToken ct)
    {
        await queryValidator.ValidateAndThrowAsync(query, ct);
        Console.WriteLine($"Is Admin: {User.IsInRole(Roles.Admin)}");
      

        if (!User.IsInRole(Roles.Admin))
        {
            query = query with { Status = ArticleStatus.Published };
        }

        var (items, meta) = await articleService.GetAllAsync(query, ct);
        return Ok(ApiResponse<IReadOnlyList<ArticleListItemDto>>.Ok(items, meta: meta));
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var article = await articleService.GetPublishedBySlugAsync(slug, ct);
        return Ok(ApiResponse<ArticleDto>.Ok(article));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    // [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var article = await articleService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<ArticleDto>.Ok(article));
    }

    [HttpPost]
    [AllowAnonymous]
    // [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateArticleDto dto, CancellationToken ct)
    {
        await createValidator.ValidateAndThrowAsync(dto, ct);

        var article = await articleService.CreateAsync(dto, ct);
        return StatusCode(201, ApiResponse<ArticleDto>.Ok(article, "Created successfully"));
    }

    [HttpPut("{id}")]
    [AllowAnonymous]
    // [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateArticleDto dto, CancellationToken ct)
    {
        await updateValidator.ValidateAndThrowAsync(dto, ct);

        var article = await articleService.UpdateAsync(id, dto, ct);
        return Ok(ApiResponse<ArticleDto>.Ok(article, "Updated successfully"));
    }

    [HttpDelete("{id}")]
    [AllowAnonymous]
    // [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await articleService.DeleteAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Deleted successfully"));
    }
}
