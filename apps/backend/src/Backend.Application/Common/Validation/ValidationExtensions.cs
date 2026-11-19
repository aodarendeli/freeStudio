using FluentValidation;

namespace Backend.Application.Common.Validation;

public static class ValidationExtensions
{
    /// <summary>Accepts only UTC instants so timestamps are stored and compared unambiguously.</summary>
    public static IRuleBuilderOptions<T, DateTimeOffset> Utc<T>(this IRuleBuilder<T, DateTimeOffset> rule) =>
        rule.Must(v => v.Offset == TimeSpan.Zero).WithMessage("'{PropertyName}' must be a UTC timestamp (Z).");

    public static IRuleBuilderOptions<T, DateTimeOffset?> Utc<T>(this IRuleBuilder<T, DateTimeOffset?> rule) =>
        rule.Must(v => v is null || v.Value.Offset == TimeSpan.Zero)
            .WithMessage("'{PropertyName}' must be a UTC timestamp (Z).");
}
