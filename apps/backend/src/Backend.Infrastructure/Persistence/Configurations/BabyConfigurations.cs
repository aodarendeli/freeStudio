using Backend.Domain.Babies;
using Backend.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

internal sealed class BabyConfiguration : IEntityTypeConfiguration<Baby>
{
    public void Configure(EntityTypeBuilder<Baby> b)
    {
        b.ToTable("babies");
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Name).IsRequired().HasMaxLength(Baby.NameMaxLength);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Ignore(x => x.IsDeleted);
        b.HasMany(x => x.Caregivers).WithOne().HasForeignKey(c => c.BabyId).OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class BabyCaregiverConfiguration : IEntityTypeConfiguration<BabyCaregiver>
{
    public void Configure(EntityTypeBuilder<BabyCaregiver> b)
    {
        b.ToTable("baby_caregivers");
        // PK (baby_id, user_id) serves the per-request membership check; the user index serves "my babies".
        b.HasKey(x => new { x.BabyId, x.UserId });
        b.Property(x => x.UserId).HasMaxLength(255);
        b.Property(x => x.InvitedBy).HasMaxLength(255);
        b.HasIndex(x => x.UserId).HasDatabaseName("ix_baby_caregivers_user_id");
        b.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
