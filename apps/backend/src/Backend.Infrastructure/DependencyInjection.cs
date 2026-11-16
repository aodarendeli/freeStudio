using Backend.Application.Admin;
using Backend.Application.Babies;
using Backend.Application.Common.Abstractions;
using Backend.Application.GridDemo;
using Backend.Application.Health;
using Backend.Application.Me;
using Backend.Application.Reminders;
using Backend.Application.Tracking;
using Backend.Infrastructure.GridDemo;
using Backend.Infrastructure.Persistence;
using Backend.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBabyRepository, BabyRepository>();
        services.AddScoped<ICareEventRepository, CareEventRepository>();
        services.AddScoped<IActiveSessionRepository, ActiveSessionRepository>();
        services.AddScoped<ILabTestRepository, LabTestRepository>();
        services.AddScoped<IReminderSettingsRepository, ReminderSettingsRepository>();
        services.AddScoped<IAdminStatsReader, AdminStatsReader>();

        // VKDataGrid demo (apps/react18)
        services.AddScoped<IProductCatalog, ProductCatalog>();
        services.AddScoped<GridDemoSeeder>();

        return services;
    }
}
