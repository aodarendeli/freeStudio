using Backend.Domain.GridDemo;
using FluentValidation;

namespace Backend.Application.GridDemo;

public sealed class ProductSearchRequestValidator : AbstractValidator<ProductSearchRequest>
{
    public const int MaxPageSize = 200;

    public ProductSearchRequestValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Size).InclusiveBetween(1, MaxPageSize);
        RuleFor(x => x.SearchText).MaximumLength(200);
        RuleFor(x => x.Filter).Must(f => f is null || f.Count <= 20).WithMessage("En fazla 20 filtre gönderilebilir.");
        // Alan / operatör / değer hataları reddedilmez, sorguda yok sayılır ya da uygun operatöre çevrilir
        RuleForEach(x => x.Filter).ChildRules(filter =>
            filter.RuleFor(f => f.FilterValues).Must(v => v is null || v.Count <= 200));
    }
}

public sealed class ProductInputValidator : AbstractValidator<ProductInput>
{
    public ProductInputValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Ürün adı zorunlu.")
            .MaximumLength(Product.NameMaxLength);
        RuleFor(x => x.Price).InclusiveBetween(0, Product.PriceMax).WithMessage("Fiyat 0 ile 10.000.000 arasında olmalı.")
            .PrecisionScale(12, 2, ignoreTrailingZeros: true).WithMessage("Fiyat en fazla 2 ondalık basamak içerebilir.");
        RuleFor(x => x.CategoryId).NotEmpty().WithMessage("Kategori zorunlu.");
    }
}

public sealed class PageRequestValidator : AbstractValidator<PageRequest>
{
    public PageRequestValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Size).InclusiveBetween(1, ProductSearchRequestValidator.MaxPageSize);
    }
}
