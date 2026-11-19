using Backend.Domain.Common;

namespace Backend.Domain.Health;

public enum LabCategory { Blood, Urine, Stool, Screening, Hearing, Other }

public class LabTest : SyncedEntity
{
    public const int TitleMaxLength = 120;
    public const int LabNameMaxLength = 120;
    public const int NoteMaxLength = 1000;
    public const int ResultsMax = 100;

    public Guid BabyId { get; set; }
    public DateOnly TakenOn { get; set; }
    public LabCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? LabName { get; set; }
    public string? Note { get; set; }

    public List<LabResult> Results { get; set; } = [];

    /// <summary>Results are replaced as a whole; rows are matched by id so EF updates instead of re-inserting.</summary>
    public void ReplaceResults(IReadOnlyList<LabResult> next)
    {
        var incoming = next.ToDictionary(r => r.Id);
        Results.RemoveAll(r => !incoming.ContainsKey(r.Id));

        for (var i = 0; i < next.Count; i++)
        {
            var source = next[i];
            var target = Results.Find(r => r.Id == source.Id);
            if (target is null)
            {
                target = new LabResult { Id = source.Id, LabTestId = Id };
                Results.Add(target);
            }

            target.Analyte = source.Analyte;
            target.Value = source.Value;
            target.Unit = source.Unit;
            target.RefLow = source.RefLow;
            target.RefHigh = source.RefHigh;
            target.Position = i;
        }
    }
}
