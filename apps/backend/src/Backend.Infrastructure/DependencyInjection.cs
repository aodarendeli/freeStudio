using Backend.Application.Categories;
using Backend.Application.Email;
using Backend.Application.Menu;
using Backend.Application.Products;
using Backend.Application.Seo;
using Backend.Infrastructure.Caching;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Backend.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));

        services.Configure<RedisOptions>(configuration.GetSection(RedisOptions.SectionName));
        services.AddSingleton<IConnectionMultiplexer>(_ =>
            ConnectionMultiplexer.Connect(configuration.GetSection(RedisOptions.SectionName)["ConnectionString"]
                ?? "localhost:6379"));

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IMenuItemRepository, MenuItemRepository>();
        services.AddScoped<ISeoMetadataRepository, SeoMetadataRepository>();

        return services;
    }
}
