using FluentValidation;

namespace Backend.Application.Products;

public class ProductSearchValidator : AbstractValidator<ProductSearchDto>
{
    public static readonly string[] Fields = ["id", "name", "price", "categoryId", "createdAt"];

    private static readonly string[] Operators =
        ["contains", "notcontains", "startswith", "endswith", "=", "<>", "<", ">", "<=", ">=", "between"];

    public ProductSearchValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Size).InclusiveBetween(1, 200);
        RuleFor(x => x.SearchText).MaximumLength(200);

        RuleForEach(x => x.Filter).ChildRules(filter =>
        {
            filter.RuleFor(f => f.DataField)
                .Must(field => Fields.Contains(field, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Unknown filter field");
            filter.RuleFor(f => f.FilterOperator)
                .Must(op => op is null || Operators.Contains(op, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Unknown filter operator");
        });

        When(x => x.Sort is not null, () =>
        {
            RuleFor(x => x.Sort!.DataField)
                .Must(field => Fields.Contains(field, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Unknown sort field");
            RuleFor(x => x.Sort!.SortOrder)
                .Must(order => order is "asc" or "desc")
                .WithMessage("SortOrder must be asc or desc");
        });
    }
}
