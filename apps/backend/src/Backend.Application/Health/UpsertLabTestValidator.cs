using Backend.Domain.Health;
using FluentValidation;

namespace Backend.Application.Health;

public sealed class UpsertLabTestValidator : AbstractValidator<UpsertLabTestRequest>
{
    public UpsertLabTestValidator(TimeProvider time)
    {
        RuleFor(x => x.Title).Must(t => !string.IsNullOrWhiteSpace(t)).WithMessage("'Title' is required.")
            .MaximumLength(LabTest.TitleMaxLength);
        RuleFor(x => x.TakenOn)
            .Must(d => d <= DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime).AddDays(1))
            .WithMessage("'TakenOn' cannot be in the future.");
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.LabName).MaximumLength(LabTest.LabNameMaxLength);
        RuleFor(x => x.Note).MaximumLength(LabTest.NoteMaxLength);
        RuleFor(x => x.Results).NotNull().Must(r => r.Count <= LabTest.ResultsMax);
        RuleFor(x => x.Results)
            .Must(r => r.Select(x => x.Id).Distinct().Count() == r.Count)
            .WithMessage("Result ids must be unique.");
        RuleForEach(x => x.Results).ChildRules(result =>
        {
            result.RuleFor(r => r.Id).NotEmpty();
            result.RuleFor(r => r.Analyte).Must(a => !string.IsNullOrWhiteSpace(a))
                .WithMessage("'Analyte' is required.").MaximumLength(LabResult.AnalyteMaxLength);
            result.RuleFor(r => r.Unit).NotNull().MaximumLength(LabResult.UnitMaxLength);
            result.RuleFor(r => r)
                .Must(r => r.RefLow is null || r.RefHigh is null || r.RefLow <= r.RefHigh)
                .WithMessage("'RefLow' must not be greater than 'RefHigh'.");
        });
    }
}
