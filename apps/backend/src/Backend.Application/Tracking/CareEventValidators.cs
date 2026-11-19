using Backend.Application.Common.Validation;
using Backend.Domain.Tracking;
using FluentValidation;

namespace Backend.Application.Tracking;

public sealed class UpsertCareEventValidator : AbstractValidator<UpsertCareEventRequest>
{
    public UpsertCareEventValidator()
    {
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.StartedAt).Utc();
        RuleFor(x => x.EndedAt).Utc()
            .Must((x, ended) => ended is null || ended >= x.StartedAt)
            .WithMessage("'EndedAt' must not be before 'StartedAt'.")
            .Must((x, ended) => ended is null || ended - x.StartedAt <= CareEvent.MaxDuration)
            .WithMessage($"An event can last at most {CareEvent.MaxDuration.TotalHours} hours.");
        RuleFor(x => x.Note).MaximumLength(CareEvent.NoteMaxLength);

        When(x => x.Kind == CareEventKind.Feeding, () =>
        {
            RuleFor(x => x.Method).NotNull().IsInEnum();
            RuleFor(x => x.Type).Null();
            RuleFor(x => x.Breast).NotNull().When(x => x.Method == FeedingMethod.Breast);
            RuleFor(x => x.Breast).Null().When(x => x.Method != FeedingMethod.Breast);
            RuleFor(x => x.Bottle).NotNull().When(x => x.Method == FeedingMethod.Bottle);
            RuleFor(x => x.Bottle).Null().When(x => x.Method != FeedingMethod.Bottle);
            RuleFor(x => x.Solid).NotNull().When(x => x.Method == FeedingMethod.Solid);
            RuleFor(x => x.Solid).Null().When(x => x.Method != FeedingMethod.Solid);
        });

        When(x => x.Kind != CareEventKind.Feeding, () =>
        {
            RuleFor(x => x.Method).Null();
            RuleFor(x => x.Breast).Null();
            RuleFor(x => x.Bottle).Null();
            RuleFor(x => x.Solid).Null();
        });

        When(x => x.Kind == CareEventKind.Diaper, () => RuleFor(x => x.Type).NotNull().IsInEnum());
        When(x => x.Kind == CareEventKind.Sleep, () => RuleFor(x => x.Type).Null());

        RuleFor(x => x.Breast!.Segments)
            .NotEmpty()
            .Must(BeOrderedAndNonOverlapping)
            .WithMessage("Breast segments must be ordered, non-overlapping and end after they start.")
            .When(x => x.Breast is not null);
        RuleForEach(x => x.Breast!.Segments)
            .Must(s => Enum.IsDefined(s.Side) && s.StartedAt.Offset == TimeSpan.Zero && s.EndedAt.Offset == TimeSpan.Zero)
            .WithMessage("Each segment needs a valid side and UTC timestamps.")
            .When(x => x.Breast is not null);

        RuleFor(x => x.Bottle!.AmountMl).InclusiveBetween(1, CareEvent.BottleMaxMl).When(x => x.Bottle is not null);
        RuleFor(x => x.Bottle!.Content).IsInEnum().When(x => x.Bottle is not null);

        RuleFor(x => x.Solid!.Items).NotEmpty().Must(i => i.Count <= CareEvent.SolidItemsMax)
            .When(x => x.Solid is not null);
        RuleForEach(x => x.Solid!.Items)
            .Must(i => !string.IsNullOrWhiteSpace(i) && i.Trim().Length <= CareEvent.SolidItemMaxLength)
            .WithMessage($"Each item must be 1-{CareEvent.SolidItemMaxLength} characters.")
            .When(x => x.Solid is not null);
    }

    private static bool BeOrderedAndNonOverlapping(IReadOnlyList<BreastSegment> segments)
    {
        for (var i = 0; i < segments.Count; i++)
        {
            if (segments[i].EndedAt < segments[i].StartedAt)
            {
                return false;
            }

            if (i > 0 && segments[i].StartedAt < segments[i - 1].EndedAt)
            {
                return false;
            }
        }

        return true;
    }
}

public sealed class CareEventQueryValidator : AbstractValidator<CareEventQuery>
{
    public static readonly TimeSpan MaxRange = TimeSpan.FromDays(93);
    public const int MaxLimit = 200;

    public CareEventQueryValidator()
    {
        RuleFor(x => x.Limit).InclusiveBetween(1, MaxLimit);
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x)
            .Must(q => (q.From is null) == (q.To is null))
            .WithMessage("'from' and 'to' must be sent together.");
        RuleFor(x => x)
            .Must(q => q.From is null || q.Cursor is null)
            .WithMessage("Use either a time range or a cursor, not both.");
        RuleFor(x => x)
            .Must(q => q.From is null || q.To is null || (q.To > q.From && q.To - q.From <= MaxRange))
            .WithMessage($"'to' must be after 'from' and the range at most {MaxRange.TotalDays} days.");
    }
}
