namespace Backend.Application.GridDemo;

/// <summary>Grid demo ürün / kategori deposu. Filtre çevirisi EF'e özgü olduğundan doğrudan Infrastructure'da uygulanır.</summary>
public interface IProductCatalog
{
    Task<PagedResult<ProductDto>> SearchAsync(ProductSearchRequest request, CancellationToken ct);

    /// <summary>Filtreye uyan tüm satırlar (sayfa yok sayılır), en fazla <paramref name="limit"/> kadar.</summary>
    Task<IReadOnlyList<ProductExportRow>> ExportAsync(ProductSearchRequest request, int limit, CancellationToken ct);

    Task<ProductDto> GetAsync(Guid id, CancellationToken ct);
    Task<ProductDto> CreateAsync(ProductInput input, CancellationToken ct);
    Task<ProductDto> UpdateAsync(Guid id, ProductInput input, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);

    Task<PagedResult<CategoryDto>> ListCategoriesAsync(PageRequest request, CancellationToken ct);
}
