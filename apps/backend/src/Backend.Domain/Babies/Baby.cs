using Backend.Domain.Common;

namespace Backend.Domain.Babies;

public enum BabySex { Girl, Boy, Unspecified }

public enum BabyColor { Teal, Coral, Indigo, Green, Amber }

public class Baby : SyncedEntity
{
    public const int NameMaxLength = 40;

    public string Name { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public BabySex Sex { get; set; } = BabySex.Unspecified;
    public BabyColor Color { get; set; } = BabyColor.Teal;
    public DateTimeOffset? ArchivedAt { get; set; }

    public List<BabyCaregiver> Caregivers { get; set; } = [];
}
