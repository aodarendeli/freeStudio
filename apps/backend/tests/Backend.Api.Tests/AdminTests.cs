using System.Net;

namespace Backend.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class AdminTests(ApiFactory api)
{
    private const string ApiAdmin = """{"minik-api":{"roles":["admin"]}}""";

    [Fact]
    public async Task Admin_client_role_can_read_aggregate_stats()
    {
        await api.ClientFor("admin-data-owner").CreateBaby();

        var stats = await (await api.ClientFor("ops-1", ApiAdmin).GetAsync("/v1/admin/stats")).Json(HttpStatusCode.OK);

        Assert.True(stats.GetProperty("users").GetInt32() >= 1);
        Assert.True(stats.GetProperty("activeBabies").GetInt32() >= 1);
    }

    [Theory]
    [InlineData(null)]                                                  // regular user
    [InlineData("""{"minik-api":{"roles":["viewer"]}}""")]              // other role on the API client
    [InlineData("""{"other-app":{"roles":["admin"]}}""")]               // admin of another client in the realm
    [InlineData("not json")]                                            // malformed claim
    public async Task Everyone_else_gets_403(string? resourceAccess)
    {
        var response = await api.ClientFor("ops-2", resourceAccess).GetAsync("/v1/admin/stats");

        Assert.Equal("Permission", (await response.Json(HttpStatusCode.Forbidden)).Code());
    }

    [Fact]
    public async Task Admin_role_grants_no_access_to_other_peoples_babies()
    {
        var babyId = await api.ClientFor("admin-data-owner-2").CreateBaby();
        var admin = api.ClientFor("ops-3", ApiAdmin);

        await (await admin.GetAsync($"/v1/babies/{babyId}")).Json(HttpStatusCode.NotFound);
        await (await admin.GetAsync($"/v1/babies/{babyId}/events")).Json(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Admin_endpoint_requires_a_token()
    {
        await (await api.ClientFor(null).GetAsync("/v1/admin/stats")).Json(HttpStatusCode.Unauthorized);
    }
}
