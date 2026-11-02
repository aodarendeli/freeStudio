using Backend.Domain.Enums;

namespace Backend.Application.Articles;

public record ArticleDto(
    string Id,
    string Title,
    string Slug,
    string? Summary,
    string Content,
    ArticleStatus Status,
    DateTime? PublishedAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record ArticleListItemDto(
    string Id,
    string Title,
    string Slug,
    string? Summary,
    ArticleStatus Status,
    DateTime? PublishedAt,
    DateTime CreatedAt);

public record CreateArticleDto(string Title, string Content, string? Summary, string? Slug);

public record UpdateArticleDto(string Title, string Slug, string Content, string? Summary, ArticleStatus Status);

public record ArticleQueryDto(int Page = 1, int Limit = 20, ArticleStatus? Status = null, string? Search = null);
