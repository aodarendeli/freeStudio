namespace Backend.Application.Email;

public record SendEmailDto(string To, string Subject, string TemplateKey, Dictionary<string, string>? Variables);
