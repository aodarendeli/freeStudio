using FluentValidation;

namespace Backend.Application.Articles;

public class UpdateArticleValidator : AbstractValidator<UpdateArticleDto>
{
    public UpdateArticleValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.Summary).MaximumLength(500);
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(220)
            .Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")
            .WithMessage("Slug sadece küçük harf, rakam ve tire içerebilir.");
        RuleFor(x => x.Status).IsInEnum();
    }
}
