using System.Security.Claims;
using System.Text.Json;
using Backend.Api.Middleware;
using Backend.Application;
using Backend.Application.Common.Auth;
using Backend.Infrastructure;
using Backend.Infrastructure.Caching;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration).Enrich.FromLogContext());

var keycloakUrl = builder.Configuration["Keycloak:Url"]
    ?? throw new InvalidOperationException("Keycloak:Url is required");
var keycloakRealm = builder.Configuration["Keycloak:Realm"]
    ?? throw new InvalidOperationException("Keycloak:Realm is required");
var keycloakAudience = builder.Configuration["Keycloak:Audience"];
var keycloakIssuer = $"{keycloakUrl.TrimEnd('/')}/realms/{keycloakRealm}";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = keycloakIssuer;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.Audience = string.IsNullOrWhiteSpace(keycloakAudience) ? null : keycloakAudience;
        options.TokenValidationParameters.ValidateAudience = !string.IsNullOrWhiteSpace(keycloakAudience);

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = context =>
            {
                if (context.Principal?.Identity is not ClaimsIdentity identity)
                {
                    return Task.CompletedTask;
                }

                var realmAccess = context.Principal.FindFirst("realm_access")?.Value;
                if (string.IsNullOrEmpty(realmAccess))
                {
                    return Task.CompletedTask;
                }

                using var doc = JsonDocument.Parse(realmAccess);
                if (doc.RootElement.TryGetProperty("roles", out var roles))
                {
                    foreach (var role in roles.EnumerateArray())
                    {
                        var roleName = role.GetString();
                        if (!string.IsNullOrEmpty(roleName))
                        {
                            identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                        }
                    }
                }

                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.Admin, policy => policy.RequireRole(Roles.Admin));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Backend API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Keycloak JWT access token. Örnek: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document), [] },
    });
});

builder.Services
    .AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Default")!, name: "postgres")
    .AddRedis(builder.Configuration.GetSection(RedisOptions.SectionName)["ConnectionString"] ?? "localhost:6379", name: "redis");

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = false;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
