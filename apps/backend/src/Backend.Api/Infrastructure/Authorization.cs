using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;

namespace Backend.Api.Infrastructure;

/// <summary>Client roles of the API's own Keycloak client (<c>resource_access.{audience}.roles</c>).</summary>
public static class Roles
{
    public const string Admin = "admin";
}

public static class Policies
{
    public const string Admin = "Admin";
}

/// <summary>
/// Copies the API client's roles from the Keycloak token into role claims so <c>[Authorize(Policy = …)]</c> works.
/// Realm roles are ignored on purpose: an "admin" of another app in the same realm gets nothing here.
/// </summary>
internal sealed class KeycloakRolesTransformation(string clientId) : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity { IsAuthenticated: true } identity
            || identity.HasClaim(c => c.Type == identity.RoleClaimType)) // already transformed (runs per request, maybe twice)
        {
            return Task.FromResult(principal);
        }

        var resourceAccess = identity.FindFirst("resource_access")?.Value;
        if (string.IsNullOrEmpty(resourceAccess))
        {
            return Task.FromResult(principal);
        }

        try
        {
            using var doc = JsonDocument.Parse(resourceAccess);
            if (doc.RootElement.TryGetProperty(clientId, out var client)
                && client.TryGetProperty("roles", out var roles)
                && roles.ValueKind == JsonValueKind.Array)
            {
                foreach (var role in roles.EnumerateArray())
                {
                    if (role.GetString() is { Length: > 0 } name)
                    {
                        identity.AddClaim(new Claim(identity.RoleClaimType, name));
                    }
                }
            }
        }
        catch (JsonException)
        {
            // Malformed claim: no roles.
        }

        return Task.FromResult(principal);
    }
}
