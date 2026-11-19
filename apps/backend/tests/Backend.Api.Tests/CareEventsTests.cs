using System.Net;

namespace Backend.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class CareEventsTests(ApiFactory api)
{
    [Fact]
    public async Task Breast_feeding_round_trips_in_the_contract_shape()
    {
        var client = api.ClientFor("events-1");
        var babyId = await client.CreateBaby();
        var id = Guid.NewGuid();

        var created = await (await client.Put($"/v1/babies/{babyId}/events/{id}", new
        {
            kind = "feeding",
            method = "breast",
            startedAt = "2026-11-10T02:10:00Z",
            endedAt = "2026-11-10T02:28:30Z",
            breast = new
            {
                segments = new[]
                {
                    new { side = "left", startedAt = "2026-11-10T02:10:00Z", endedAt = "2026-11-10T02:19:00Z" },
                    new { side = "right", startedAt = "2026-11-10T02:19:00Z", endedAt = "2026-11-10T02:28:30Z" },
                },
            },
        })).Json(HttpStatusCode.Created);

        var fetched = await (await client.GetAsync($"/v1/babies/{babyId}/events/{id}")).Json(HttpStatusCode.OK);
        Assert.Equal("feeding", fetched.GetProperty("kind").GetString());
        Assert.Equal("2026-11-10T02:10:00.000Z", fetched.GetProperty("startedAt").GetString());
        var segments = fetched.GetProperty("breast").GetProperty("segments");
        Assert.Equal(2, segments.GetArrayLength());
        Assert.Equal("right", segments[1].GetProperty("side").GetString());
        Assert.False(fetched.TryGetProperty("bottle", out _));
        Assert.Equal(created.GetProperty("version").GetInt32(), fetched.GetProperty("version").GetInt32());
    }

    [Theory]
    [InlineData("""{"kind":"feeding","method":"bottle","startedAt":"2026-11-10T08:00:00Z","bottle":{"amountMl":0,"content":"formula"}}""")]
    [InlineData("""{"kind":"feeding","method":"bottle","startedAt":"2026-11-10T08:00:00Z"}""")]
    [InlineData("""{"kind":"diaper","method":"breast","type":"wet","startedAt":"2026-11-10T08:00:00Z"}""")]
    [InlineData("""{"kind":"diaper","startedAt":"2026-11-10T08:00:00Z"}""")]
    [InlineData("""{"kind":"sleep","startedAt":"2026-11-10T08:00:00Z","endedAt":"2026-11-10T07:00:00Z"}""")]
    [InlineData("""{"kind":"sleep","startedAt":"2026-11-10T08:00:00Z","endedAt":"2026-11-13T08:00:00Z"}""")]
    [InlineData("""{"kind":"feeding","method":"breast","startedAt":"2026-11-10T02:00:00Z","breast":{"segments":[{"side":"left","startedAt":"2026-11-10T02:00:00Z","endedAt":"2026-11-10T02:10:00Z"},{"side":"right","startedAt":"2026-11-10T02:05:00Z","endedAt":"2026-11-10T02:15:00Z"}]}}""")]
    public async Task Invalid_events_are_rejected(string json)
    {
        var client = api.ClientFor("events-2");
        var babyId = await client.CreateBaby();

        var response = await client.PutAsync($"/v1/babies/{babyId}/events/{Guid.NewGuid()}",
            new StringContent(json, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal("Validation", (await response.Json(HttpStatusCode.BadRequest)).Code());
    }

    [Fact]
    public async Task Range_returns_overlapping_events_including_sleep_across_midnight()
    {
        var client = api.ClientFor("events-3");
        var babyId = await client.CreateBaby();
        var sleep = Guid.NewGuid();
        await (await client.Put($"/v1/babies/{babyId}/events/{sleep}",
            new { kind = "sleep", startedAt = "2026-11-09T22:00:00Z", endedAt = "2026-11-10T05:00:00Z" })).Json(HttpStatusCode.Created);
        var diaper = Guid.NewGuid();
        await (await client.Put($"/v1/babies/{babyId}/events/{diaper}",
            new { kind = "diaper", type = "dirty", startedAt = "2026-11-10T09:00:00Z" })).Json(HttpStatusCode.Created);
        await (await client.Put($"/v1/babies/{babyId}/events/{Guid.NewGuid()}",
            new { kind = "diaper", type = "wet", startedAt = "2026-11-08T09:00:00Z" })).Json(HttpStatusCode.Created);

        var day = await (await client.GetAsync(
            $"/v1/babies/{babyId}/events?from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z")).Json(HttpStatusCode.OK);

        var ids = day.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("id").GetGuid()).ToList();
        Assert.Equal([sleep, diaper], ids);

        var diapersOnly = await (await client.GetAsync(
            $"/v1/babies/{babyId}/events?from=2026-11-10T00:00:00Z&to=2026-11-11T00:00:00Z&kind=diaper")).Json(HttpStatusCode.OK);
        Assert.Single(diapersOnly.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Cursor_paging_walks_newest_first_without_gaps_or_duplicates()
    {
        var client = api.ClientFor("events-4");
        var babyId = await client.CreateBaby();
        var start = new DateTimeOffset(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);
        var expected = new List<Guid>();
        for (var i = 0; i < 5; i++)
        {
            var id = Guid.NewGuid();
            expected.Add(id);
            // Two events share a timestamp to exercise the id tie-breaker.
            var at = start.AddHours(i == 4 ? 3 : i);
            await (await client.Put($"/v1/babies/{babyId}/events/{id}",
                new { kind = "diaper", type = "wet", startedAt = at })).Json(HttpStatusCode.Created);
        }

        var seen = new List<Guid>();
        string? cursor = null;
        do
        {
            var url = $"/v1/babies/{babyId}/events?limit=2" + (cursor is null ? "" : $"&cursor={cursor}");
            var page = await (await client.GetAsync(url)).Json(HttpStatusCode.OK);
            seen.AddRange(page.GetProperty("items").EnumerateArray().Select(e => e.GetProperty("id").GetGuid()));
            cursor = page.TryGetProperty("nextCursor", out var next) ? next.GetString() : null;
        }
        while (cursor is not null);

        Assert.Equal(5, seen.Count);
        Assert.Equal(expected.Order(), seen.Order());
        Assert.Equal(expected[0], seen[^1]); // oldest last
    }

    [Fact]
    public async Task Soft_delete_hides_the_event_and_put_restores_it()
    {
        var client = api.ClientFor("events-5");
        var babyId = await client.CreateBaby();
        var id = Guid.NewGuid();
        var body = new { kind = "feeding", method = "bottle", startedAt = "2026-11-10T08:00:00Z",
            bottle = new { amountMl = 120, content = "breastMilk" } };
        await (await client.Put($"/v1/babies/{babyId}/events/{id}", body)).Json(HttpStatusCode.Created);

        await (await client.DeleteAsync($"/v1/babies/{babyId}/events/{id}")).Json(HttpStatusCode.NoContent);
        await (await client.DeleteAsync($"/v1/babies/{babyId}/events/{id}")).Json(HttpStatusCode.NoContent); // idempotent

        var live = await (await client.GetAsync($"/v1/babies/{babyId}/events")).Json(HttpStatusCode.OK);
        Assert.Empty(live.GetProperty("items").EnumerateArray());
        var all = await (await client.GetAsync($"/v1/babies/{babyId}/events?includeDeleted=true")).Json(HttpStatusCode.OK);
        Assert.Single(all.GetProperty("items").EnumerateArray());

        var restored = await (await client.Put($"/v1/babies/{babyId}/events/{id}", body)).Json(HttpStatusCode.OK);
        Assert.False(restored.TryGetProperty("deletedAt", out _));
        Assert.Equal(120, restored.GetProperty("bottle").GetProperty("amountMl").GetInt32());
        Assert.Equal("breastMilk", restored.GetProperty("bottle").GetProperty("content").GetString());
    }

    [Fact]
    public async Task An_event_id_cannot_be_moved_to_another_baby()
    {
        var client = api.ClientFor("events-6");
        var first = await client.CreateBaby("A");
        var second = await client.CreateBaby("B");
        var id = Guid.NewGuid();
        var body = new { kind = "diaper", type = "wet", startedAt = "2026-11-10T08:00:00Z" };
        await (await client.Put($"/v1/babies/{first}/events/{id}", body)).Json(HttpStatusCode.Created);

        Assert.Equal("Conflict", (await (await client.Put($"/v1/babies/{second}/events/{id}", body)).Json(HttpStatusCode.Conflict)).Code());
    }
}
