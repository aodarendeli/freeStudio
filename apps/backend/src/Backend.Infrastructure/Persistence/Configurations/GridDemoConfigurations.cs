using Backend.Domain.GridDemo;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Infrastructure.Persistence.Configurations;

/// <summary>
/// VKDataGrid demo tabloları (apps/react18). Uygulamanın alanından bağımsız oldukları için ayrı "grid_demo"
/// şemasındalar; demo kaldırılırken bu dosya, entity'ler ve şema silinir.
/// </summary>
internal static class GridDemoSchema
{
    public const string Name = "grid_demo";
}

internal sealed class GridDemoCategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> b)
    {
        b.ToTable("categories", GridDemoSchema.Name);
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Name).IsRequired().HasMaxLength(Category.NameMaxLength);
        b.HasIndex(x => x.Name).IsUnique().HasDatabaseName("ux_grid_demo_categories_name");
    }
}

internal sealed class GridDemoProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> b)
    {
        b.ToTable("products", GridDemoSchema.Name);
        b.HasKey(x => x.Id);
        b.Property(x => x.Id).ValueGeneratedNever();
        b.Property(x => x.Name).IsRequired().HasMaxLength(Product.NameMaxLength);
        b.Property(x => x.Price).HasPrecision(12, 2);
        b.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);

        // Varsayılan sıralama (created_at desc, id) ve sık kullanılan filtreler için
        b.HasIndex(x => new { x.CreatedAt, x.Id }).HasDatabaseName("ix_grid_demo_products_created_at");
        b.HasIndex(x => x.CategoryId).HasDatabaseName("ix_grid_demo_products_category_id");
        b.HasIndex(x => x.Price).HasDatabaseName("ix_grid_demo_products_price");
    }
}
