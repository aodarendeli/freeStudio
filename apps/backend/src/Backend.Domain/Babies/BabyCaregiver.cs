namespace Backend.Domain.Babies;

/// <summary>Ordered by privilege: a higher value includes every lower permission.</summary>
public enum CaregiverRole { Viewer = 0, Caregiver = 1, Owner = 2 }

/// <summary>Authorization lives here, not in Keycloak roles: every /babies/{id}/… request checks membership.</summary>
public class BabyCaregiver
{
    public Guid BabyId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public CaregiverRole Role { get; set; }
    public string? InvitedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
