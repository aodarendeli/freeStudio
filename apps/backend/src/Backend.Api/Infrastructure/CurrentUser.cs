using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;

namespace Backend.Api.Infrastructure;

/// <summary>Reads the Keycloak token claims (inbound claim mapping is off, so names are the raw JWT ones).</summary>
internal sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string Id =>
        Claim("sub") is { Length: > 0 } sub ? sub : throw new UnauthorizedAppException();

    public string? Name => Claim("name") ?? Claim("preferred_username");

    public string? Email => Claim("email");

    private string? Claim(string type) => accessor.HttpContext?.User.FindFirst(type)?.Value;
}
