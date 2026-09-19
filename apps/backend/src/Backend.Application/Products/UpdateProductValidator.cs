using FluentValidation;

namespace Backend.Application.Products;

public class UpdateProductValidator : AbstractValidator<UpdateProductDto>
{
    public UpdateProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.CategoryId).NotEmpty();
    }
}
