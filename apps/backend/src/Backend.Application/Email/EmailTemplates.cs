namespace Backend.Application.Email;

public static class EmailTemplates
{
    private static readonly Dictionary<string, string> Templates = new()
    {
        ["welcome"] = "<h1>Hoş geldiniz, {{name}}!</h1><p>Hesabınız başarıyla oluşturuldu.</p>",
        ["notification"] = "<p>{{message}}</p>",
    };

    public static string Render(string templateKey, Dictionary<string, string>? variables)
    {
        if (!Templates.TryGetValue(templateKey, out var template))
        {
            throw new KeyNotFoundException($"Unknown email template: {templateKey}");
        }

        if (variables is null)
        {
            return template;
        }

        foreach (var (key, value) in variables)
        {
            template = template.Replace($"{{{{{key}}}}}", value);
        }

        return template;
    }
}
