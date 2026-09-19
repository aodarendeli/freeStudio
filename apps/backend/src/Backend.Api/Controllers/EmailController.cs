using Backend.Application.Common.Auth;
using Backend.Application.Common.Exceptions;
using Backend.Application.Common.Models;
using Backend.Application.Email;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

[ApiController]
[Route("api/email")]
[Authorize(Policy = Policies.Admin)]
public class EmailController(IEmailService emailService, IValidator<SendEmailDto> validator) : ControllerBase
{
    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] SendEmailDto dto, CancellationToken ct)
    {
        var result = await validator.ValidateAsync(dto, ct);
        if (!result.IsValid)
        {
            throw new ValidationFailedException(
                result.Errors.Select(e => new ErrorItem(e.PropertyName, e.ErrorMessage)).ToList());
        }

        await emailService.SendAsync(dto, ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Email sent"));
    }
}
