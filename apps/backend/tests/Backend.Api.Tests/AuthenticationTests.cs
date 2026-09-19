using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Backend.Api.Tests;

public class AuthenticationTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task CreateCategory_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/categories", new { name = "Electronics" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SendEmail_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/email/send", new
        {
            to = "user@example.com",
            subject = "Test",
            templateKey = "welcome",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/products", new { name = "Phone", price = 10, categoryId = "x" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateCategory_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/categories/some-id", new { name = "Electronics" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteCategory_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/categories/some-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProduct_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/products/some-id", new { name = "Phone", price = 10, categoryId = "x" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteProduct_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/products/some-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateMenuItem_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/menu-items", new { label = "Ana Sayfa", slug = "anasayfa", order = 0, isActive = true });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMenuItem_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/menu-items/some-id", new { label = "Ana Sayfa", slug = "anasayfa", order = 0, isActive = true });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMenuItem_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/menu-items/some-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateSeoMetadata_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/seo", new { slug = "anasayfa", title = "Test" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateSeoMetadata_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.PutAsJsonAsync("/api/seo/some-id", new { title = "Test" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSeoMetadata_WithoutToken_ReturnsUnauthorized()
    {
        var client = factory.CreateClient();

        var response = await client.DeleteAsync("/api/seo/some-id");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
