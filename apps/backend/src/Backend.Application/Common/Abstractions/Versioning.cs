using Backend.Application.Common.Exceptions;

namespace Backend.Application.Common.Abstractions;

public static class Versioning
{
    /// <summary>Optimistic concurrency: when the client sent If-Match, it must equal the stored version.</summary>
    public static void Ensure(int currentVersion, int? expectedVersion)
    {
        if (expectedVersion is not null && expectedVersion != currentVersion)
        {
            throw new ConflictAppException();
        }
    }
}
