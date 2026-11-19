using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Api.Tests;

internal static class TestApi
{
    public static async Task<JsonElement> Json(this HttpResponseMessage response, HttpStatusCode expected)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(expected == response.StatusCode, $"Expected {expected}, got {response.StatusCode}: {body}");
        return body.Length == 0 ? default : JsonDocument.Parse(body).RootElement.Clone();
    }

    public static Task<HttpResponseMessage> Put(this HttpClient client, string url, object body, int? ifMatch = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, url) { Content = JsonContent.Create(body) };
        if (ifMatch is not null)
        {
            request.Headers.TryAddWithoutValidation("If-Match", $"\"{ifMatch}\"");
        }

        return client.SendAsync(request);
    }

    public static async Task<Guid> CreateBaby(this HttpClient client, string name = "Ada")
    {
        var id = Guid.NewGuid();
        await (await client.Put($"/v1/babies/{id}", Baby(name))).Json(HttpStatusCode.Created);
        return id;
    }

    public static object Baby(string name = "Ada") =>
        new { name, birthDate = "2026-09-01", sex = "girl", color = "teal" };

    public static string Code(this JsonElement problem) => problem.GetProperty("code").GetString() ?? "";
}
