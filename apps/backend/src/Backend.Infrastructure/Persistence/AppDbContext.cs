using Backend.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<SeoMetadata> SeoMetadataEntries => Set<SeoMetadata>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).IsRequired();
            entity.HasIndex(c => c.Name).IsUnique();
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired();
            entity.Property(p => p.Price).HasColumnType("decimal(10,2)");
            entity.HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId);
        });

        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.ToTable("menu_items");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.ProjectKey).IsRequired();
            entity.Property(m => m.Label).IsRequired();
            entity.Property(m => m.Slug).IsRequired();
            entity.HasIndex(m => new { m.ProjectKey, m.Slug });
            entity.HasOne(m => m.Parent)
                .WithMany(m => m.Children)
                .HasForeignKey(m => m.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SeoMetadata>(entity =>
        {
            entity.ToTable("seo_metadata");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.ProjectKey).IsRequired();
            entity.Property(s => s.Slug).IsRequired();
            entity.Property(s => s.Title).IsRequired();
            entity.HasIndex(s => new { s.ProjectKey, s.Slug }).IsUnique();
        });

        base.OnModelCreating(modelBuilder);
    }
}
