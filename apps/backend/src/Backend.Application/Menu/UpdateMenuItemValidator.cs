using FluentValidation;

namespace Backend.Application.Menu;

public class UpdateMenuItemValidator : AbstractValidator<UpdateMenuItemDto>
{
    public UpdateMenuItemValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(160)
            .Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")
            .WithMessage("Slug sadece küçük harf, rakam ve tire içerebilir.");
    }
}
