namespace Backend.Infrastructure.Caching;

public class RedisOptions
{
    public const string SectionName = "Redis";

    public string ConnectionString { get; set; } = "localhost:6379";
    public int TtlSeconds { get; set; } = 3600;
}
