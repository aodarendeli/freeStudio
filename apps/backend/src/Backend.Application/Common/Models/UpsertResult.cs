namespace Backend.Application.Common.Models;

/// <summary>Outcome of an idempotent PUT: 201 when <see cref="Created"/>, otherwise 200.</summary>
public sealed record UpsertResult<T>(T Value, bool Created);
