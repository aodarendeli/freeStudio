namespace Backend.Application.Email;

public interface IEmailService
{
    Task SendAsync(SendEmailDto dto, CancellationToken ct = default);
}
