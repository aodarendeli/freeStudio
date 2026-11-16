using System.Net;
using System.Text.Json;

namespace Backend.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class ChangesFeedTests(ApiFactory api)
{
    private static object Diaper(string at) => new { kind = "diaper", type = "wet", startedAt = at };

    [Fact]
    public async Task Feed_returns_creates_updates_and_deletes_once_in_change_order_and_resumes_from_cursor()
    {
        var client = api.ClientFor("sync-1");
        var babyId = await client.CreateBaby();
        Guid a = Guid.NewGuid(), b = Guid.NewGuid(), c = Guid.NewGuid();
        foreach (var id in new[] { a, b, c })
        {
            await (await client.Put($"/v1/babies/{babyId}/events/{id}", Diaper("2026-11-10T08:00:00Z"))).Json(HttpStatusCode.Created);
        }

        var all = new List<JsonElement>();
        string? cursor = null;
        bool hasMore;
        do
        {
            var url = $"/v1/babies/{babyId}/events/changes?limit=2" + (cursor is null ? "" : $"&since={cursor}");
            var page = await (await client.GetAsync(url)).Json(HttpStatusCode.OK);
            all.AddRange(page.GetProperty("items").EnumerateArray());
            cursor = page.GetProperty("cursor").GetString();
            hasMore = page.GetProperty("hasMore").GetBoolean();
        }
        while (hasMore);

        Assert.Equal([a, b, c], all.Select(e => e.GetProperty("id").GetGuid()));

        // Nothing new: same cursor comes back, no items.
        var idle = await (await client.GetAsync($"/v1/babies/{babyId}/events/changes?since={cursor}")).Json(HttpStatusCode.OK);
        Assert.Empty(idle.GetProperty("items").EnumerateArray());
        Assert.Equal(cursor, idle.GetProperty("cursor").GetString());

        // An edit and a delete appear after the cursor; the delete carries deletedAt.
        await (await client.Put($"/v1/babies/{babyId}/events/{a}", Diaper("2026-11-10T09:00:00Z"))).Json(HttpStatusCode.OK);
        await (await client.DeleteAsync($"/v1/babies/{babyId}/events/{b}")).Json(HttpStatusCode.NoContent);
        var delta = await (await client.GetAsync($"/v1/babies/{babyId}/events/changes?since={cursor}")).Json(HttpStatusCode.OK);
        var changed = delta.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal([a, b], changed.Select(e => e.GetProperty("id").GetGuid()));
        Assert.True(changed[1].TryGetProperty("deletedAt", out _));
    }

    [Fact]
    public async Task Lab_feed_includes_results_and_non_members_get_404()
    {
        var client = api.ClientFor("sync-2");
        var babyId = await client.CreateBaby();
        await (await client.Put($"/v1/babies/{babyId}/lab-tests/{Guid.NewGuid()}", new
        {
            takenOn = "2026-11-01", category = "urine", title = "Idrar",
            results = new[] { new { id = Guid.NewGuid(), analyte = "pH", value = 6.5m, unit = "" } },
        })).Json(HttpStatusCode.Created);

        var feed = await (await client.GetAsync($"/v1/babies/{babyId}/lab-tests/changes")).Json(HttpStatusCode.OK);
        Assert.Equal(1, feed.GetProperty("items")[0].GetProperty("results").GetArrayLength());

        await (await api.ClientFor("sync-stranger").GetAsync($"/v1/babies/{babyId}/lab-tests/changes")).Json(HttpStatusCode.NotFound);
        await (await client.GetAsync($"/v1/babies/{babyId}/events/changes?since=garbage")).Json(HttpStatusCode.BadRequest);
    }
}
