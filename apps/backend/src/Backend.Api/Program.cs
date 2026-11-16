using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Backend.Api.Infrastructure;
using Backend.Application;
using Backend.Application.Common.Abstractions;
using Backend.Application.Common.Exceptions;
using Backend.Application.GridDemo;
using Backend.Infrastructure;
using Backend.Infrastructure.GridDemo;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration).Enrich.FromLogContext());

// --- Auth: Keycloak JWTs. Data access is per-baby membership (baby_caregivers); the only role is the API client's
// "admin" client role (resource_access.{Audience}.roles) for operations endpoints. See apps/backend/README.md.
var keycloakUrl = builder.Configuration["Keycloak:Url"]
    ?? throw new InvalidOperationException("Keycloak:Url is required");
var keycloakRealm = builder.Configuration["Keycloak:Realm"]
    ?? throw new InvalidOperationException("Keycloak:Realm is required");
var keycloakAudience = builder.Configuration["Keycloak:Audience"];
if (string.IsNullOrWhiteSpace(keycloakAudience))
{
    // Without it, a token issued to any client of the realm would be accepted.
    throw new InvalidOperationException("Keycloak:Audience (the API's client id, e.g. minik-api) is required");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"{keycloakUrl.TrimEnd('/')}/realms/{keycloakRealm}";
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.MapInboundClaims = false; // keep "sub", "email", "resource_access", … as-is
        options.Audience = keycloakAudience;
        options.TokenValidationParameters.ValidateAudience = true;
        options.TokenValidationParameters.NameClaimType = "sub";
    });

builder.Services.AddSingleton<IClaimsTransformation>(new KeycloakRolesTransformation(keycloakAudience));
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy(Policies.Admin, policy => policy.RequireAuthenticatedUser().RequireRole(Roles.Admin));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

// --- Errors: RFC 9457 Problem Details with a stable "code".
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions.TryAdd("code", context.ProblemDetails.Status switch
        {
            StatusCodes.Status400BadRequest => ErrorCodes.Validation,
            StatusCodes.Status401Unauthorized => ErrorCodes.Unauthorized,
            StatusCodes.Status403Forbidden => ErrorCodes.Permission,
            StatusCodes.Status404NotFound => ErrorCodes.NotFound,
            StatusCodes.Status409Conflict => ErrorCodes.Conflict,
            _ => ErrorCodes.Unknown,
        }));
builder.Services.AddExceptionHandler<AppExceptionHandler>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        var json = options.JsonSerializerOptions;
        json.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        json.Converters.Add(new UtcDateTimeOffsetConverter());
        json.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    })
    .ConfigureApiBehaviorOptions(options =>
        options.InvalidModelStateResponseFactory = context =>
        {
            var problem = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
            };
            problem.Extensions["code"] = ErrorCodes.Validation;
            return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
        });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Minik API", Version = "v1" });
    options.SupportNonNullableReferenceTypes();
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Keycloak access token",
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

// --- Rate limit per user (or IP before auth).
var permitsPerMinute = builder.Configuration.GetValue("RateLimiting:PermitsPerMinute", 300);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.User.FindFirst("sub")?.Value ?? context.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = permitsPerMinute, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services
    .AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Default") ?? string.Empty, name: "postgres");

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("ETag")));

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// --- VKDataGrid demo (apps/react18): anonymous /api/products + /api/categories on a separate "grid_demo" schema.
// On by default only in Development; set GridDemo:Enabled to override.
var gridDemoEnabled = builder.Configuration.GetValue<bool?>("GridDemo:Enabled") ?? builder.Environment.IsDevelopment();
builder.Services.Configure<GridDemoOptions>(builder.Configuration.GetSection("GridDemo"))
    .PostConfigure<GridDemoOptions>(options => options.Enabled = gridDemoEnabled);

var app = builder.Build();

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    await using var scope = app.Services.CreateAsyncScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

if (gridDemoEnabled)
{
    // Seeds GridDemo:SeedCount (default 100) products when the table is empty. Tables come from AppDbContext migrations.
    await using var scope = app.Services.CreateAsyncScope();
    try
    {
        await scope.ServiceProvider.GetRequiredService<GridDemoSeeder>().RunAsync();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Grid demo seed failed (run the migrations first: npm run db:update)");
    }
}

app.UseExceptionHandler();
app.UseStatusCodePages(); // empty 401/403/404/429 bodies become Problem Details

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.Run();

public partial class Program;
