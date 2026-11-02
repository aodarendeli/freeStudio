using FluentValidation;

namespace Backend.Application.Articles;

public class ArticleQueryValidator : AbstractValidator<ArticleQueryDto>
{
    public ArticleQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Limit).InclusiveBetween(1, 100);
        RuleFor(x => x.Status).IsInEnum().When(x => x.Status is not null);
        RuleFor(x => x.Search).MaximumLength(100);
    }
}
