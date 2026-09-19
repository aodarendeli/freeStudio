using FluentValidation;

namespace Backend.Application.Seo;

public class UpdateSeoMetadataValidator : AbstractValidator<UpdateSeoMetadataDto>
{
    public UpdateSeoMetadataValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(70);
        RuleFor(x => x.Description).MaximumLength(320);
    }
}
