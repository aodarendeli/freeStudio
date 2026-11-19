using Backend.Application.Admin;
using Backend.Application.Babies;
using Backend.Application.Health;
using Backend.Application.Me;
using Backend.Application.Reminders;
using Backend.Application.Tracking;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Backend.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);
        services.TryAddSingleton(new Common.Paging.SyncOptions());

        services.AddScoped<IBabyAccess, BabyAccess>();
        services.AddScoped<IBabyService, BabyService>();
        services.AddScoped<ICareEventService, CareEventService>();
        services.AddScoped<IActiveSessionService, ActiveSessionService>();
        services.AddScoped<ILabTestService, LabTestService>();
        services.AddScoped<IReminderSettingsService, ReminderSettingsService>();
        services.AddScoped<IMeService, MeService>();
        services.AddScoped<IAdminStatsService, AdminStatsService>();

        services.AddValidatorsFromAssemblyContaining<UpsertBabyValidator>(ServiceLifetime.Singleton);

        return services;
    }
}
