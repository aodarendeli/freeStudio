using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using Testcontainers.PostgreSql;

namespace Backend.Api.Tests;

/// <summary>
/// Runs the real API against a throwaway Postgres database. Requests authenticate with <c>X-Test-User: &lt;sub&gt;</c>.
/// Uses Testcontainers by default; set <c>MINIK_TEST_POSTGRES</c> (a server connection string) to use an existing
/// server instead; a uniquely named database is created and dropped per run.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private static readonly string? ExistingServer = Environment.GetEnvironmentVariable("MINIK_TEST_POSTGRES");
    private PostgreSqlContainer? _container;
    private string _connectionString = string.Empty;

    public async Task InitializeAsync()
    {
        if (string.IsNullOrWhiteSpace(ExistingServer))
        {
            _container = new PostgreSqlBuilder("postgres:17-alpine").Build();
            await _container.StartAsync();
            _connectionString = _container.GetConnectionString();
        }
        else
        {
            _connectionString = new NpgsqlConnectionStringBuilder(ExistingServer)
            {
                Database = $"minik_test_{Guid.NewGuid():N}",
            }.ConnectionString;
        }

        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        if (_container is null)
        {
            await using var scope = Services.CreateAsyncScope();
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        }

        await base.DisposeAsync();
        if (_container is not null)
        {
            await _container.DisposeAsync();
        }
    }

    /// <param name="resourceAccess">Raw Keycloak <c>resource_access</c> claim JSON, e.g. {"minik-api":{"roles":["admin"]}}.</param>
    public HttpClient ClientFor(string? userId, string? resourceAccess = null)
    {
        var client = CreateClient();
        if (userId is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.Header, userId);
        }

        if (resourceAccess is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.ResourceAccessHeader, resourceAccess);
        }

        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", _connectionString);
        builder.UseSetting("Keycloak:Url", "http://keycloak.invalid");
        builder.UseSetting("Keycloak:Realm", "test");
        builder.UseSetting("Keycloak:Audience", "minik-api");
        builder.UseSetting("RateLimiting:PermitsPerMinute", "100000");

        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton(new Backend.Application.Common.Paging.SyncOptions { SettleWindow = TimeSpan.Zero });
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(o =>
            {
                o.DefaultScheme = TestAuthHandler.SchemeName;
                o.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                o.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }
}

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string Header = "X-Test-User";
    public const string ResourceAccessHeader = "X-Test-Resource-Access";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var sub = Request.Headers[Header].ToString();
        if (string.IsNullOrEmpty(sub))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var identity = new ClaimsIdentity([new Claim("sub", sub), new Claim("email", $"{sub}@example.test")], SchemeName);
        if (Request.Headers[ResourceAccessHeader].ToString() is { Length: > 0 } resourceAccess)
        {
            // Same shape the JWT handler produces for Keycloak's JSON claim.
            identity.AddClaim(new Claim("resource_access", resourceAccess, "JSON"));
        }

        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
