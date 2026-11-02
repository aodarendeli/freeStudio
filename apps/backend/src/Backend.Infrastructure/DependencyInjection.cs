using Backend.Application.Articles;
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

        var redisConnectionString = configuration.GetSection(RedisOptions.SectionName)["ConnectionString"]
            ?? "localhost:6379";

        services.Configure<RedisOptions>(configuration.GetSection(RedisOptions.SectionName));
        var redis = new Lazy<IConnectionMultiplexer>(() => ConnectionMultiplexer.Connect(redisConnectionString));
        services.AddSingleton(_ => redis.Value);

        // HybridCache: L1 = process RAM, L2 = Redis (IDistributedCache üzerinden, aynı bağlantı paylaşılır).
        services.AddStackExchangeRedisCache(options =>
        {
            options.ConnectionMultiplexerFactory = () => Task.FromResult(redis.Value);
            options.InstanceName = "backend:";
        });
        services.AddHybridCache();

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<IMenuItemRepository, MenuItemRepository>();
        services.AddScoped<ISeoMetadataRepository, SeoMetadataRepository>();
        services.AddScoped<IArticleRepository, ArticleRepository>();

        return services;
    }
}
