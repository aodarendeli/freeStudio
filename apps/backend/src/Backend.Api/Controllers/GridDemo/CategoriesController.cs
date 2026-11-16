using Backend.Application.GridDemo;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers.GridDemo;

/// <summary>Grid'deki kategori lookup'ı için. Ada göre sıralı.</summary>
[Route("api/categories")]
public sealed class CategoriesController(IProductCatalog catalog, IValidator<PageRequest> validator) : GridDemoControllerBase
{
    [HttpPost]
    [ProducesResponseType<GridPagedResponse<CategoryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromBody] PageRequest request, CancellationToken ct)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        return Ok(Paged(await catalog.ListCategoriesAsync(request, ct)));
    }
}
