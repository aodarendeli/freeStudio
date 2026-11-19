using System.Net;

namespace Backend.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class HealthAndSettingsTests(ApiFactory api)
{
    [Fact]
    public async Task Lab_test_results_are_replaced_as_a_whole_and_keep_user_ranges()
    {
        var client = api.ClientFor("labs-1");
        var babyId = await client.CreateBaby();
        var id = Guid.NewGuid();
        Guid hb = Guid.NewGuid(), wbc = Guid.NewGuid(), plt = Guid.NewGuid();

        var created = await (await client.Put($"/v1/babies/{babyId}/lab-tests/{id}", new
        {
            takenOn = "2026-11-01", category = "blood", title = "Hemogram",
            results = new object[]
            {
                new { id = hb, analyte = "Hb", value = 11.4m, unit = "g/dL", refLow = 10.5m, refHigh = 13.5m },
                new { id = wbc, analyte = "WBC", value = 9.1m, unit = "10^3/µL" },
            },
        })).Json(HttpStatusCode.Created);
        Assert.Equal(2, created.GetProperty("results").GetArrayLength());

        var updated = await (await client.Put($"/v1/babies/{babyId}/lab-tests/{id}", new
        {
            takenOn = "2026-11-01", category = "blood", title = "Hemogram", labName = "Lab A",
            results = new object[]
            {
                new { id = plt, analyte = "PLT", value = 250m, unit = "10^3/µL" },
                new { id = hb, analyte = "Hb", value = 11.9m, unit = "g/dL", refLow = 10.5m, refHigh = 13.5m },
            },
        }, ifMatch: 1)).Json(HttpStatusCode.OK);

        var results = updated.GetProperty("results").EnumerateArray().ToList();
        Assert.Equal([plt, hb], results.Select(r => r.GetProperty("id").GetGuid()));
        Assert.Equal(11.9m, results[1].GetProperty("value").GetDecimal());
        Assert.Equal(10.5m, results[1].GetProperty("refLow").GetDecimal());
        Assert.False(results[0].TryGetProperty("refLow", out _));

        var list = await (await client.GetAsync($"/v1/babies/{babyId}/lab-tests?from=2026-10-01&to=2026-11-30")).Json(HttpStatusCode.OK);
        Assert.Single(list.GetProperty("items").EnumerateArray());

        await (await client.Put($"/v1/babies/{babyId}/lab-tests/{Guid.NewGuid()}", new
        {
            takenOn = "2026-11-01", category = "blood", title = "Bad range",
            results = new object[] { new { id = Guid.NewGuid(), analyte = "Hb", value = 1m, unit = "g/dL", refLow = 5m, refHigh = 2m } },
        })).Json(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task One_active_session_per_kind_and_delete_is_idempotent()
    {
        var client = api.ClientFor("sessions-1");
        var babyId = await client.CreateBaby();
        var sessionId = Guid.NewGuid();
        var running = new
        {
            id = sessionId, status = "running", startedAt = "2026-11-10T02:10:00Z",
            segments = new[] { new { side = "left", startedAt = "2026-11-10T02:10:00Z" } },
        };

        await (await client.Put($"/v1/babies/{babyId}/active-sessions/breastFeeding", running)).Json(HttpStatusCode.Created);
        var again = await (await client.Put($"/v1/babies/{babyId}/active-sessions/breastFeeding", running, ifMatch: 1)).Json(HttpStatusCode.OK);
        Assert.Equal(2, again.GetProperty("version").GetInt32());

        var other = new { id = Guid.NewGuid(), status = "running", startedAt = "2026-11-10T03:00:00Z", segments = Array.Empty<object>() };
        await (await client.Put($"/v1/babies/{babyId}/active-sessions/breastFeeding", other)).Json(HttpStatusCode.Conflict);
        await (await client.Put($"/v1/babies/{babyId}/active-sessions/sleep", other)).Json(HttpStatusCode.Created);

        var list = await (await client.GetAsync($"/v1/babies/{babyId}/active-sessions")).Json(HttpStatusCode.OK);
        Assert.Equal(2, list.GetArrayLength());

        await (await client.DeleteAsync($"/v1/babies/{babyId}/active-sessions/breastFeeding")).Json(HttpStatusCode.NoContent);
        await (await client.DeleteAsync($"/v1/babies/{babyId}/active-sessions/breastFeeding")).Json(HttpStatusCode.NoContent);
        await (await client.GetAsync($"/v1/babies/{babyId}/active-sessions/breastFeeding")).Json(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Reminder_settings_default_then_update()
    {
        var client = api.ClientFor("reminders-1");
        var babyId = await client.CreateBaby();

        var defaults = await (await client.GetAsync($"/v1/babies/{babyId}/reminder-settings")).Json(HttpStatusCode.OK);
        Assert.Equal(0, defaults.GetProperty("version").GetInt32());
        Assert.Equal("22:00", defaults.GetProperty("quietHours").GetProperty("start").GetString());

        var updated = await (await client.Put($"/v1/babies/{babyId}/reminder-settings", new
        {
            nextFeed = new { enabled = true, intervalMin = 150 },
            stillRunningNudge = new { enabled = true, afterMin = 40 },
            quietHours = new { enabled = true, start = "23:30", end = "06:15" },
        }, ifMatch: 0)).Json(HttpStatusCode.OK);
        Assert.Equal(1, updated.GetProperty("version").GetInt32());
        Assert.Equal("06:15", updated.GetProperty("quietHours").GetProperty("end").GetString());
    }

    [Fact]
    public async Task Me_returns_memberships_and_settings_persist()
    {
        var client = api.ClientFor("me-1");
        var babyId = await client.CreateBaby();

        var me = await (await client.GetAsync("/v1/me")).Json(HttpStatusCode.OK);
        Assert.Equal("me-1", me.GetProperty("id").GetString());
        Assert.Contains(me.GetProperty("memberships").EnumerateArray(), m => m.GetProperty("babyId").GetGuid() == babyId);

        var settings = await (await client.GetAsync("/v1/me/settings")).Json(HttpStatusCode.OK);
        Assert.Equal("tr", settings.GetProperty("locale").GetString());

        await (await client.Put("/v1/me/settings", new
        {
            locale = "en", theme = "night", units = new { volume = "oz", weight = "lb" }, autoNight = true, haptics = false,
        })).Json(HttpStatusCode.OK);
        var saved = await (await client.GetAsync("/v1/me/settings")).Json(HttpStatusCode.OK);
        Assert.Equal("night", saved.GetProperty("theme").GetString());
        Assert.Equal("oz", saved.GetProperty("units").GetProperty("volume").GetString());
    }
}
