using Backend.Application.Categories;
using Backend.Application.Email;
using Backend.Application.Menu;
using Backend.Application.Products;
using Backend.Application.Seo;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IMenuItemService, MenuItemService>();
        services.AddScoped<ISeoMetadataService, SeoMetadataService>();

        services.AddValidatorsFromAssemblyContaining<CreateCategoryValidator>();

        return services;
    }
}
