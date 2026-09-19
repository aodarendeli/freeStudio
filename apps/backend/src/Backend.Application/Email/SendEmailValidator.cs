using FluentValidation;

namespace Backend.Application.Email;

public class SendEmailValidator : AbstractValidator<SendEmailDto>
{
    public SendEmailValidator()
    {
        RuleFor(x => x.To).NotEmpty().EmailAddress();
        RuleFor(x => x.Subject).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TemplateKey).NotEmpty();
    }
}
