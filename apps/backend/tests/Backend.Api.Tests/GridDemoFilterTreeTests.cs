using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Backend.Infrastructure.GridDemo;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Api.Tests;

/// <summary>
/// POST /api/products <c>filter</c> (react-querybuilder ağacı). Her test kendi ürünlerini benzersiz bir önekle
/// ekler ve ağacı <c>name beginsWith önek</c> ile sınırlar; seed verisinden etkilenmez.
/// </summary>
[Collection(ApiCollection.Name)]
public sealed class GridDemoFilterTreeTests(ApiFactory api)
{
    private readonly HttpClient _client = api.ClientFor(null);

    private sealed record Seeded(string Prefix, Guid[] Categories, Dictionary<string, Guid> Ids);

    /// <summary>Önek + ad -> fiyat / kategori sırası. Kategoriler seed'deki ilk iki kategori.</summary>
    private async Task<Seeded> SeedAsync(params (string Name, decimal Price, int Category)[] products)
    {
        await using (var scope = api.Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<GridDemoSeeder>().RunAsync();
        }

        var categories = (await (await _client.PostAsJsonAsync("/api/categories", new { page = 1, size = 10 }))
                .Json(HttpStatusCode.OK))
            .GetProperty("data").EnumerateArray().Select(c => c.GetProperty("id").GetGuid()).Take(2).ToArray();

        var prefix = $"ft{Guid.NewGuid():N}"[..10];
        var ids = new Dictionary<string, Guid>();
        foreach (var (name, price, category) in products)
        {
            var created = await (await _client.PostAsJsonAsync("/api/products/create",
                new { name = $"{prefix} {name}", price, categoryId = categories[category] })).Json(HttpStatusCode.Created);
            ids[name] = created.GetProperty("data").GetProperty("id").GetGuid();
        }

        return new Seeded(prefix, categories, ids);
    }

    private static object Rule(string field, string op, object? value) => new { field, @operator = op, value };

    /// <summary>Kök: önek kuralı VE verilen düğüm</summary>
    private static object Scoped(Seeded s, object node) =>
        new { combinator = "and", rules = new[] { Rule("name", "beginsWith", s.Prefix), node } };

    private async Task<string[]> SearchNames(Seeded s, object filter)
    {
        var body = await (await _client.PostAsJsonAsync("/api/products",
            new { page = 1, size = 200, filter })).Json(HttpStatusCode.OK);
        return body.GetProperty("data").EnumerateArray()
            .Select(p => p.GetProperty("name").GetString()![(s.Prefix.Length + 1)..])
            .Order()
            .ToArray();
    }

    [Fact]
    public async Task Or_group_not_between_and_in_are_applied()
    {
        var s = await SeedAsync(("Kalem", 10m, 0), ("Defter", 50m, 0), ("Tren", 120m, 1), ("Top", 300m, 1));

        // Fiyat 40-150 arası VEYA adı "Top" ile biter
        Assert.Equal(["Defter", "Top", "Tren"], await SearchNames(s, Scoped(s, new
        {
            combinator = "or",
            rules = new[] { Rule("price", "between", new[] { 40, 150 }), Rule("name", "endsWith", "top") },
        })));

        // DEĞİL(1. kategoride) = 2. kategori
        Assert.Equal(["Top", "Tren"], await SearchNames(s, Scoped(s, new
        {
            combinator = "and",
            not = true,
            rules = new[] { Rule("categoryId", "=", s.Categories[0]) },
        })));

        // Sayı alanında in: değerlerden herhangi birine eşit
        Assert.Equal(["Kalem", "Top"], await SearchNames(s, Scoped(s, Rule("price", "in", new[] { 10, 300 }))));

        Assert.Equal(["Defter", "Kalem"], await SearchNames(s, Scoped(s, Rule("categoryId", "in", new[] { s.Categories[0] }))));
    }

    [Fact]
    public async Task Text_operators_use_rqb_names_and_are_case_insensitive()
    {
        var s = await SeedAsync(("Kırmızı Kalem", 10m, 0), ("Mavi Kalem", 12m, 0), ("Kırmızı Top", 30m, 1));

        Assert.Equal(["Kırmızı Kalem", "Mavi Kalem"], await SearchNames(s, Scoped(s, Rule("name", "contains", "KALEM"))));
        Assert.Equal(["Kırmızı Top", "Mavi Kalem"], await SearchNames(s, Scoped(s, new
        {
            combinator = "and",
            rules = new[] { Rule("name", "doesNotContain", "kırmızı kalem") },
        })));
        Assert.Equal(["Mavi Kalem"], await SearchNames(s, Scoped(s, new
        {
            combinator = "and",
            rules = new[] { Rule("price", "!=", 10), Rule("price", "<", 20) },
        })));
    }

    [Fact]
    public async Task Empty_root_group_means_no_filter()
    {
        var s = await SeedAsync(("A", 10m, 0), ("B", 20m, 0));
        var all = await (await _client.PostAsJsonAsync("/api/products", new
        {
            page = 1,
            size = 1,
            filter = new { combinator = "and", rules = Array.Empty<object>() },
        })).Json(HttpStatusCode.OK);
        var unfiltered = await (await _client.PostAsJsonAsync("/api/products", new { page = 1, size = 1 }))
            .Json(HttpStatusCode.OK);
        Assert.Equal(unfiltered.GetProperty("totalCount").GetInt32(), all.GetProperty("totalCount").GetInt32());
        Assert.Equal(["A", "B"], await SearchNames(s, new { combinator = "and", rules = new[] { Rule("name", "beginsWith", s.Prefix) } }));
    }

    [Fact]
    public async Task Invalid_tree_is_rejected_with_paths_instead_of_ignored()
    {
        var response = await _client.PostAsJsonAsync("/api/products", new
        {
            page = 1,
            size = 10,
            filter = new
            {
                combinator = "xor",
                rules = new object[]
                {
                    Rule("price", "contains", "1"),
                    Rule("unknown", "=", "x"),
                    Rule("price", "between", new[] { 10 }),
                    Rule("name", "in", Array.Empty<string>()),
                    new { combinator = "and", rules = Array.Empty<object>() },
                },
            },
        });
        var errors = (await response.Json(HttpStatusCode.BadRequest)).GetProperty("errors");
        string[] expected =
        [
            "filter.combinator", "filter.rules[0]", "filter.rules[1]", "filter.rules[2].value",
            "filter.rules[3].value", "filter.rules[4].rules",
        ];
        Assert.Equal(expected, errors.EnumerateObject().Select(e => e.Name).Order(StringComparer.Ordinal).ToArray());
    }

    [Theory]
    [InlineData("price", ">", "\"abc\"")]
    [InlineData("createdAt", "<", "\"dün\"")]
    [InlineData("categoryId", "=", "\"kırtasiye\"")]
    [InlineData("price", "between", "[10, \"x\"]")]
    public async Task Values_that_do_not_match_the_field_type_are_rejected(string field, string op, string valueJson)
    {
        var response = await _client.PostAsJsonAsync("/api/products", new
        {
            page = 1,
            size = 10,
            filter = new { combinator = "and", rules = new[] { Rule(field, op, JsonDocument.Parse(valueJson).RootElement) } },
        });
        var errors = (await response.Json(HttpStatusCode.BadRequest)).GetProperty("errors");
        Assert.True(errors.TryGetProperty("filter.rules[0].value", out _), errors.ToString());
    }
}
