using Backend.Domain.Babies;
using Backend.Domain.Tracking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

internal sealed class CareEventConfiguration : IEntityTypeConfiguration<CareEvent>
{
    public void Configure(EntityTypeBuilder<CareEvent> b)
    {
        b.ToTable("care_events", t =>
        {
            t.HasCheckConstraint("ck_care_events_ended_after_started", "ended_at IS NULL OR ended_at >= started_at");
            t.HasCheckConstraint(
                "ck_care_events_bottle_amount",
                $"bottle_amount_ml IS NULL OR (bottle_amount_ml > 0 AND bottle_amount_ml <= {CareEvent.BottleMaxMl})");
        });
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Note).HasMaxLength(CareEvent.NoteMaxLength);
        b.Property(x => x.BreastSegments).HasJsonbConversion<BreastSegment>();
        b.Property(x => x.SolidItems).HasColumnType("text[]");
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Ignore(x => x.IsDeleted);
        b.HasOne<Baby>().WithMany().HasForeignKey(x => x.BabyId).OnDelete(DeleteBehavior.Cascade);

        // Timeline (range + keyset paging, newest first). Includes soft-deleted rows so includeDeleted reads use it too.
        b.HasIndex(x => new { x.BabyId, x.StartedAt, x.Id })
            .IsDescending(false, true, true)
            .HasDatabaseName("ix_care_events_baby_timeline");
        // "Last feeding / last diaper" and per-kind lists.
        b.HasIndex(x => new { x.BabyId, x.Kind, x.StartedAt, x.Id })
            .IsDescending(false, false, true, true)
            .HasDatabaseName("ix_care_events_baby_kind_timeline");
        // Changes feed for sync: (updated_at, id) keyset per baby.
        b.HasIndex(x => new { x.BabyId, x.UpdatedAt, x.Id }).HasDatabaseName("ix_care_events_baby_changes");
    }
}

internal sealed class ActiveSessionConfiguration : IEntityTypeConfiguration<ActiveSession>
{
    public void Configure(EntityTypeBuilder<ActiveSession> b)
    {
        b.ToTable("active_sessions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Segments).HasJsonbConversion<SessionSegment>();
        b.Property(x => x.Version).IsConcurrencyToken();
        b.HasOne<Baby>().WithMany().HasForeignKey(x => x.BabyId).OnDelete(DeleteBehavior.Cascade);
        // One running timer per (baby, kind).
        b.HasIndex(x => new { x.BabyId, x.Kind }).IsUnique().HasDatabaseName("ux_active_sessions_baby_kind");
    }
}
