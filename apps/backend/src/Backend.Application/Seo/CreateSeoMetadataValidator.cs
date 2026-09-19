using FluentValidation;

namespace Backend.Application.Seo;

public class CreateSeoMetadataValidator : AbstractValidator<CreateSeoMetadataDto>
{
    public CreateSeoMetadataValidator()
    {
        RuleFor(x => x.ProjectKey)
            .NotEmpty()
            .MaximumLength(60)
            .Matches("^[a-z0-9]+(?:-[a-z0-9]+)*$")
            .WithMessage("Proje anahtarı sadece küçük harf, rakam ve tire içerebilir.");
        RuleFor(x => x.Slug)
            .NotEmpty()
            .MaximumLength(160)
            .Matches("^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$")
            .WithMessage("Slug sadece küçük harf, rakam, tire ve / içerebilir.");
        RuleFor(x => x.Title).NotEmpty().MaximumLength(70);
        RuleFor(x => x.Description).MaximumLength(320);
    }
}
