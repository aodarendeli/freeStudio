using System.Net;
using Backend.Domain.Babies;
using Backend.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class BabiesTests(ApiFactory api)
{
    [Fact]
    public async Task Requests_without_a_token_get_problem_details_401()
    {
        var response = await api.ClientFor(null).GetAsync("/v1/babies");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("Unauthorized", (await response.Json(HttpStatusCode.Unauthorized)).Code());
    }

    [Fact]
    public async Task Put_creates_then_updates_with_versions_and_etag()
    {
        var client = api.ClientFor("parent-1");
        var id = Guid.NewGuid();

        var createdResponse = await client.Put($"/v1/babies/{id}", TestApi.Baby());
        var created = await createdResponse.Json(HttpStatusCode.Created);
        Assert.Equal("\"1\"", createdResponse.Headers.ETag?.Tag);
        Assert.Equal("owner", created.GetProperty("role").GetString());
        Assert.Equal("girl", created.GetProperty("sex").GetString());
        Assert.False(created.TryGetProperty("deletedAt", out _)); // nulls are omitted

        var updated = await (await client.Put($"/v1/babies/{id}", TestApi.Baby("Ada Lovelace"), ifMatch: 1))
            .Json(HttpStatusCode.OK);
        Assert.Equal(2, updated.GetProperty("version").GetInt32());

        var stale = await (await client.Put($"/v1/babies/{id}", TestApi.Baby("Old"), ifMatch: 1))
            .Json(HttpStatusCode.Conflict);
        Assert.Equal("Conflict", stale.Code());

        var list = await (await client.GetAsync("/v1/babies")).Json(HttpStatusCode.OK);
        Assert.Contains(list.GetProperty("items").EnumerateArray(), b => b.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Non_members_cannot_see_or_take_over_a_baby()
    {
        var id = await api.ClientFor("parent-2").CreateBaby();
        var stranger = api.ClientFor("stranger");

        Assert.Equal("NotFound", (await (await stranger.GetAsync($"/v1/babies/{id}")).Json(HttpStatusCode.NotFound)).Code());
        Assert.Equal("NotFound", (await (await stranger.GetAsync($"/v1/babies/{id}/events")).Json(HttpStatusCode.NotFound)).Code());
        Assert.Equal("Permission", (await (await stranger.Put($"/v1/babies/{id}", TestApi.Baby("Mine"))).Json(HttpStatusCode.Forbidden)).Code());
        var mine = await (await stranger.GetAsync("/v1/babies")).Json(HttpStatusCode.OK);
        Assert.DoesNotContain(mine.GetProperty("items").EnumerateArray(), b => b.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Viewers_can_read_but_not_write()
    {
        var id = await api.ClientFor("parent-3").CreateBaby();
        await using (var scope = api.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Users.Add(new Domain.Users.User { Id = "grandma", CreatedAt = DateTimeOffset.UtcNow });
            db.BabyCaregivers.Add(new BabyCaregiver
            {
                BabyId = id, UserId = "grandma", Role = CaregiverRole.Viewer, CreatedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        var viewer = api.ClientFor("grandma");
        await (await viewer.GetAsync($"/v1/babies/{id}/events")).Json(HttpStatusCode.OK);
        var write = await viewer.Put($"/v1/babies/{id}/events/{Guid.NewGuid()}",
            new { kind = "diaper", type = "wet", startedAt = "2026-11-10T08:00:00Z" });
        Assert.Equal("Permission", (await write.Json(HttpStatusCode.Forbidden)).Code());
        await (await viewer.DeleteAsync($"/v1/babies/{id}")).Json(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Owner_soft_deletes_and_restores_with_put()
    {
        var client = api.ClientFor("parent-4");
        var id = await client.CreateBaby();

        await (await client.DeleteAsync($"/v1/babies/{id}")).Json(HttpStatusCode.NoContent);
        await (await client.GetAsync($"/v1/babies/{id}")).Json(HttpStatusCode.NotFound);
        var withDeleted = await (await client.GetAsync("/v1/babies?includeDeleted=true")).Json(HttpStatusCode.OK);
        Assert.Contains(withDeleted.GetProperty("items").EnumerateArray(),
            b => b.GetProperty("id").GetGuid() == id && b.TryGetProperty("deletedAt", out _));

        var restored = await (await client.Put($"/v1/babies/{id}", TestApi.Baby())).Json(HttpStatusCode.OK);
        Assert.False(restored.TryGetProperty("deletedAt", out _));
    }

    [Fact]
    public async Task Invalid_input_returns_validation_problem()
    {
        var client = api.ClientFor("parent-5");

        var future = await (await client.Put($"/v1/babies/{Guid.NewGuid()}",
            new { name = "Ada", birthDate = "2999-01-01", sex = "girl", color = "teal" })).Json(HttpStatusCode.BadRequest);
        Assert.Equal("Validation", future.Code());
        Assert.True(future.GetProperty("errors").TryGetProperty("birthDate", out _));

        var badEnum = await (await client.Put($"/v1/babies/{Guid.NewGuid()}",
            new { name = "Ada", birthDate = "2026-01-01", sex = "dragon", color = "teal" })).Json(HttpStatusCode.BadRequest);
        Assert.Equal("Validation", badEnum.Code());
    }
}
