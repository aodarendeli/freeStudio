namespace Backend.Domain.Health;

/// <summary>
/// One measured value. The reference range is copied from the lab sheet by the user; the API never supplies one.
/// </summary>
public class LabResult
{
    public const int AnalyteMaxLength = 80;
    public const int UnitMaxLength = 30;

    public Guid Id { get; set; }
    public Guid LabTestId { get; set; }
    public string Analyte { get; set; } = string.Empty;

    public decimal Value { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal? RefLow { get; set; }
    public decimal? RefHigh { get; set; }

    /// <summary>Display order inside the test.</summary>
    public int Position { get; set; }
}
