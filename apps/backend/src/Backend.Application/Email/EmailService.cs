namespace Backend.Application.Email;

public class EmailService(IEmailSender sender) : IEmailService
{
    public Task SendAsync(SendEmailDto dto, CancellationToken ct = default)
    {
        var html = EmailTemplates.Render(dto.TemplateKey, dto.Variables);
        return sender.SendAsync(dto.To, dto.Subject, html, ct);
    }
}
