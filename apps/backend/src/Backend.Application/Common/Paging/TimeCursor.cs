using System.Buffers.Text;
using System.Globalization;
using System.Text;
using Backend.Application.Common.Exceptions;

namespace Backend.Application.Common.Paging;

/// <summary>Opaque keyset cursor over (timestamp desc, id desc).</summary>
public readonly record struct TimeCursor(DateTimeOffset At, Guid Id)
{
    public string Encode() =>
        Base64Url.EncodeToString(Encoding.UTF8.GetBytes(
            $"{At.UtcTicks.ToString(CultureInfo.InvariantCulture)}:{Id:N}"));

    public static TimeCursor? Decode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        try
        {
            var parts = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(value)).Split(':');
            if (parts.Length == 2
                && long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
                && Guid.TryParseExact(parts[1], "N", out var id))
            {
                return new TimeCursor(new DateTimeOffset(ticks, TimeSpan.Zero), id);
            }
        }
        catch (FormatException)
        {
        }

        throw new BadRequestAppException("Invalid cursor");
    }
}
