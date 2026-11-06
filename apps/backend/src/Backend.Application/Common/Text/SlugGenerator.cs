using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Backend.Application.Common.Text;

public static partial class SlugGenerator
{
    private static readonly Dictionary<char, char> TurkishMap = new()
    {
        ['ı'] = 'i', ['İ'] = 'i', ['ğ'] = 'g', ['Ğ'] = 'g', ['ü'] = 'u', ['Ü'] = 'u',
        ['ş'] = 's', ['Ş'] = 's', ['ö'] = 'o', ['Ö'] = 'o', ['ç'] = 'c', ['Ç'] = 'c',
    };

    public static string Generate(string text, int maxLength = 200)
    {
        var mapped = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            mapped.Append(TurkishMap.TryGetValue(ch, out var replacement) ? replacement : ch);
        }

        var withoutAccents = new StringBuilder(mapped.Length);
        foreach (var ch in mapped.ToString().Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            {
                withoutAccents.Append(ch);
            }
        }

        var slug = withoutAccents.ToString().ToLowerInvariant().Replace("'", "").Replace("’", "");
        slug = NonAlphanumeric().Replace(slug, "-").Trim('-');

        if (slug.Length > maxLength)
        {
            slug = slug[..maxLength].TrimEnd('-');
        }

        return slug;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumeric();
}
