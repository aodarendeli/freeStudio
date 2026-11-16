namespace Backend.Domain.Users;

/// <summary>A Keycloak account seen by the API. Id is the token's <c>sub</c>; no other PII is stored.</summary>
public class User
{
    public string Id { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
