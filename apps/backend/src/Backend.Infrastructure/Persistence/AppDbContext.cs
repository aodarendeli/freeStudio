using System.Text;
using Backend.Domain.Babies;
using Backend.Domain.GridDemo;
using Backend.Domain.Health;
using Backend.Domain.Reminders;
using Backend.Domain.Tracking;
using Backend.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Backend.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Baby> Babies => Set<Baby>();
    public DbSet<BabyCaregiver> BabyCaregivers => Set<BabyCaregiver>();
    public DbSet<CareEvent> CareEvents => Set<CareEvent>();
    public DbSet<ActiveSession> ActiveSessions => Set<ActiveSession>();
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<LabResult> LabResults => Set<LabResult>();
    public DbSet<ReminderSettings> ReminderSettings => Set<ReminderSettings>();

    // VKDataGrid demo (grid_demo şeması)
    public DbSet<Product> GridDemoProducts => Set<Product>();
    public DbSet<Category> GridDemoCategories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyConventions(modelBuilder);
        base.OnModelCreating(modelBuilder);
    }

    /// <summary>snake_case columns, enums stored as their camelCase API value (readable, stable across reorders).</summary>
    private static void ApplyConventions(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));

                var enumType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
                if (enumType.IsEnum && property.GetValueConverter() is null)
                {
                    var converter = (ValueConverter)Activator.CreateInstance(
                        typeof(CamelCaseEnumConverter<>).MakeGenericType(enumType))!;
                    property.SetValueConverter(converter);
                    property.SetMaxLength(32);
                }
            }
        }
    }

    private static string ToSnakeCase(string name)
    {
        var sb = new StringBuilder(name.Length + 8);
        for (var i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c) && i > 0)
            {
                sb.Append('_');
            }

            sb.Append(char.ToLowerInvariant(c));
        }

        return sb.ToString();
    }
}
