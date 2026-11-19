using Backend.Application.Common.Validation;
using Backend.Domain.Babies;
using FluentValidation;

namespace Backend.Application.Babies;

public sealed class UpsertBabyValidator : AbstractValidator<UpsertBabyRequest>
{
    public UpsertBabyValidator(TimeProvider time)
    {
        RuleFor(x => x.Name).Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("'Name' is required.")
            .MaximumLength(Baby.NameMaxLength);
        // +1 day: the client's local "today" may already be tomorrow in UTC.
        RuleFor(x => x.BirthDate)
            .Must(d => d <= DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime).AddDays(1))
            .WithMessage("'BirthDate' cannot be in the future.");
        RuleFor(x => x.Sex).IsInEnum();
        RuleFor(x => x.Color).IsInEnum();
        RuleFor(x => x.ArchivedAt).Utc();
    }
}
