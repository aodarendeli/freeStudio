namespace Backend.Application.Common.Abstractions;

public interface ICurrentUser
{
    /// <summary>The token's <c>sub</c>. Throws <see cref="Exceptions.UnauthorizedAppException"/> when absent.</summary>
    string Id { get; }

    string? Name { get; }

    string? Email { get; }
}
