using Backend.Application.GridDemo;
using Backend.Domain.GridDemo;
using Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.GridDemo;

/// <summary>
/// Ürün tablosu boşsa 8 kategori ve <see cref="GridDemoOptions.SeedCount"/> ürün ekler.
/// Veri sabit tohumla üretilir: her kurulumda aynı adlar / fiyatlar, tarihler son 12 aya yayılır.
/// Fiyatlar 9,90 TL ile ~85.000 TL arasında, her kategoride en az birkaç ürün olacak şekilde dağılır
/// ki metin, sayı, tarih ve kategori filtreleri anlamlı sonuç versin.
/// </summary>
public sealed class GridDemoSeeder(
    AppDbContext db,
    IOptions<GridDemoOptions> options,
    TimeProvider clock,
    ILogger<GridDemoSeeder> logger)
{
    private static readonly (string Category, decimal MinPrice, decimal MaxPrice, string[] Items, string[] Variants)[] Catalog =
    [
        ("Elektronik", 299m, 85_000m,
            ["Kablosuz Kulaklık", "Akıllı Saat", "Bluetooth Hoparlör", "Dizüstü Bilgisayar", "Oyuncu Mouse", "Mekanik Klavye", "27\" Monitör", "Powerbank", "Tablet", "Web Kamerası"],
            ["Pro", "Mini", "Max", "Lite", "Siyah", "Beyaz"]),
        ("Kırtasiye", 9.9m, 750m,
            ["Tükenmez Kalem", "Spiral Defter", "Ajanda", "Keçeli Kalem Seti", "Dosya Klasörü", "Yapışkan Not", "Hesap Makinesi", "Kurşun Kalem"],
            ["A4", "A5", "12'li", "24'lü", "Mavi", "Kırmızı"]),
        ("Ev & Yaşam", 89m, 12_500m,
            ["Kahve Makinesi", "Nevresim Takımı", "Masa Lambası", "Tencere Seti", "Robot Süpürge", "Havlu Seti", "Çay Makinesi", "Duvar Saati"],
            ["Gri", "Krem", "Çift Kişilik", "Tek Kişilik", "Inox", "Bambu"]),
        ("Spor & Outdoor", 129m, 18_000m,
            ["Koşu Ayakkabısı", "Yoga Matı", "Dambıl Seti", "Kamp Çadırı", "Termos", "Bisiklet Kaskı", "Sırt Çantası", "Uyku Tulumu"],
            ["42 Numara", "44 Numara", "2 Kişilik", "4 Kişilik", "1 L", "Lacivert"]),
        ("Kitap", 45m, 650m,
            ["Roman", "Kişisel Gelişim Kitabı", "Çocuk Masalları", "Yemek Kitabı", "Tarih Ansiklopedisi", "Şiir Antolojisi", "Bilim Kurgu Serisi"],
            ["Ciltli", "Cep Boy", "Cilt 1", "Cilt 2", "Özel Baskı"]),
        ("Oyuncak", 59m, 4_500m,
            ["Yapboz", "Lego Seti", "Peluş Ayı", "Uzaktan Kumandalı Araba", "Ahşap Tren", "Kutu Oyunu", "Oyun Hamuru"],
            ["500 Parça", "1000 Parça", "Büyük", "Küçük", "Renkli"]),
        ("Kozmetik", 39m, 3_200m,
            ["Nemlendirici Krem", "Güneş Kremi", "Parfüm", "Şampuan", "Saç Kurutma Makinesi", "Ruj", "Yüz Temizleme Jeli"],
            ["50 ml", "100 ml", "SPF 50", "Kuru Saçlar", "Mat"]),
        ("Gıda", 19.9m, 1_250m,
            ["Türk Kahvesi", "Zeytinyağı", "Çiçek Balı", "Fındık Ezmesi", "Yeşil Çay", "Makarna", "Antep Fıstığı"],
            ["250 g", "500 g", "1 kg", "1 L", "Organik"]),
    ];

    public async Task RunAsync(CancellationToken ct = default)
    {
        if (await db.GridDemoProducts.AnyAsync(ct))
        {
            return;
        }

        var now = clock.GetUtcNow();
        var random = new Random(2026);

        var categories = await db.GridDemoCategories.ToDictionaryAsync(c => c.Name, ct);
        foreach (var (name, _, _, _, _) in Catalog)
        {
            if (!categories.ContainsKey(name))
            {
                var category = new Category { Id = Guid.CreateVersion7(), Name = name, CreatedAt = now.AddYears(-1) };
                categories[name] = category;
                db.GridDemoCategories.Add(category);
            }
        }

        var count = Math.Clamp(options.Value.SeedCount, 0, 10_000);
        var usedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < count; i++)
        {
            var (categoryName, min, max, items, variants) = Catalog[i % Catalog.Length];
            var name = UniqueName(items, variants, usedNames, random);

            // Ucuz ürünler daha sık: log ölçekli dağılım, ,90 / ,99 ile biten fiyatlar
            var price = Math.Round(min * (decimal)Math.Pow((double)(max / min), random.NextDouble()), 0);
            price = Math.Max(min, price - (random.Next(2) == 0 ? 0.10m : 0.01m));

            db.GridDemoProducts.Add(new Product
            {
                Id = Guid.CreateVersion7(),
                Name = name,
                Price = price,
                CategoryId = categories[categoryName].Id,
                CreatedAt = now
                    .AddDays(-random.Next(0, 365))
                    .AddMinutes(-random.Next(0, 24 * 60)),
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Grid demo seeded with {Count} products in {Categories} categories", count, categories.Count);
    }

    private static string UniqueName(string[] items, string[] variants, HashSet<string> used, Random random)
    {
        for (var attempt = 0; ; attempt++)
        {
            var name = $"{items[random.Next(items.Length)]} {variants[random.Next(variants.Length)]}";
            if (attempt > 20)
            {
                name += $" #{used.Count + 1}";
            }

            if (used.Add(name))
            {
                return name;
            }
        }
    }
}
