using Backend.Domain.Babies;
using Backend.Domain.Health;
using Backend.Domain.Reminders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

internal sealed class LabTestConfiguration : IEntityTypeConfiguration<LabTest>
{
    public void Configure(EntityTypeBuilder<LabTest> b)
    {
        b.ToTable("lab_tests");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Title).IsRequired().HasMaxLength(LabTest.TitleMaxLength);
        b.Property(x => x.LabName).HasMaxLength(LabTest.LabNameMaxLength);
        b.Property(x => x.Note).HasMaxLength(LabTest.NoteMaxLength);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Ignore(x => x.IsDeleted);
        b.HasOne<Baby>().WithMany().HasForeignKey(x => x.BabyId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Results).WithOne().HasForeignKey(r => r.LabTestId).OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Results).AutoInclude();

        b.HasIndex(x => new { x.BabyId, x.TakenOn }).IsDescending(false, true).HasDatabaseName("ix_lab_tests_baby_taken_on");
        // Changes feed for sync.
        b.HasIndex(x => new { x.BabyId, x.UpdatedAt, x.Id }).HasDatabaseName("ix_lab_tests_baby_changes");
    }
}

internal sealed class LabResultConfiguration : IEntityTypeConfiguration<LabResult>
{
    public void Configure(EntityTypeBuilder<LabResult> b)
    {
        b.ToTable("lab_results", t =>
            t.HasCheckConstraint("ck_lab_results_range", "ref_low IS NULL OR ref_high IS NULL OR ref_low <= ref_high"));
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Analyte).IsRequired().HasMaxLength(LabResult.AnalyteMaxLength);
        b.Property(x => x.Unit).IsRequired().HasMaxLength(LabResult.UnitMaxLength);
        b.HasIndex(x => new { x.LabTestId, x.Position }).HasDatabaseName("ix_lab_results_test_position");
    }
}

internal sealed class ReminderSettingsConfiguration : IEntityTypeConfiguration<ReminderSettings>
{
    public void Configure(EntityTypeBuilder<ReminderSettings> b)
    {
        b.ToTable("reminder_settings");
        b.HasKey(x => x.BabyId);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.HasOne<Baby>().WithOne().HasForeignKey<ReminderSettings>(x => x.BabyId).OnDelete(DeleteBehavior.Cascade);
    }
}
