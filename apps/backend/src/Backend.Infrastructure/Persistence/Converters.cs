using System.Linq.Expressions;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Backend.Infrastructure.Persistence;

public sealed class CamelCaseEnumConverter<TEnum>() : ValueConverter<TEnum, string>(
    v => JsonNamingPolicy.CamelCase.ConvertName(v.ToString()),
    v => Enum.Parse<TEnum>(v, true))
    where TEnum : struct, Enum;

internal static class JsonColumn
{
    internal static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Maps a list of immutable records to a jsonb column, compared by value.</summary>
    public static PropertyBuilder HasJsonbConversion<T>(this PropertyBuilder builder)
    {
        Expression<Func<List<T>?, string?>> toProvider = v => v == null ? null : JsonSerializer.Serialize(v, Options);
        Expression<Func<string?, List<T>?>> fromProvider = v => v == null ? null : JsonSerializer.Deserialize<List<T>>(v, Options);

        builder.HasConversion(
            new ValueConverter<List<T>?, string?>(toProvider, fromProvider),
            new ValueComparer<List<T>?>(
                (a, b) => a == null ? b == null : b != null && a.SequenceEqual(b),
                v => v == null ? 0 : v.Aggregate(0, (hash, item) => HashCode.Combine(hash, item)),
                v => v == null ? null : v.ToList()));
        builder.HasColumnType("jsonb");
        return builder;
    }
}
