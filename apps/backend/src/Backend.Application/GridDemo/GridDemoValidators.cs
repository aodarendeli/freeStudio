using System.Text.Json;
using Backend.Domain.GridDemo;
using FluentValidation;
using FluentValidation.Results;

namespace Backend.Application.GridDemo;

public sealed class ProductSearchRequestValidator : AbstractValidator<ProductSearchRequest>
{
    public const int MaxPageSize = 200;

    public ProductSearchRequestValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Size).InclusiveBetween(1, MaxPageSize);
        RuleFor(x => x.SearchText).MaximumLength(200);
        // Ağaç katıdır: yapı, alan / operatör uyumu ve değer şekli burada; değerin tipe uyması sorguda denetlenir
        RuleFor(x => x.Filter).Custom((tree, context) =>
        {
            if (tree is not null)
            {
                FilterTreeRules.Validate(tree, context);
            }
        });
    }
}

/// <summary>react-querybuilder filtre ağacı yapı kuralları (bkz. <see cref="FilterNode"/>).</summary>
public static class FilterTreeRules
{
    public const int MaxDepth = 5;
    public const int MaxRules = 50;
    public const int MaxInValues = 200;

    public static void Validate<T>(FilterNode root, ValidationContext<T> context)
    {
        if (!root.IsGroup)
        {
            context.AddFailure("filter", "Filtre ağacının kökü bir grup olmalı.");
            return;
        }

        var ruleCount = 0;
        Visit(root, "filter", 1);
        if (ruleCount > MaxRules)
        {
            context.AddFailure("filter", $"En fazla {MaxRules} kural gönderilebilir.");
        }

        void Visit(FilterNode node, string path, int depth)
        {
            if (node.IsGroup)
            {
                if (depth > MaxDepth)
                {
                    context.AddFailure(path, $"En fazla {MaxDepth} seviye iç içe grup kullanılabilir.");
                    return;
                }

                if (node.Combinator is not ("and" or "or"))
                {
                    context.AddFailure($"{path}.combinator", "Bağlaç 'and' ya da 'or' olmalı.");
                }

                // Kök boş olabilir (filtre yok); boş alt grup anlamsızdır
                if (depth > 1 && node.Rules!.Count == 0)
                {
                    context.AddFailure($"{path}.rules", "Boş grup gönderilemez.");
                }

                for (var i = 0; i < node.Rules!.Count; i++)
                {
                    Visit(node.Rules[i], $"{path}.rules[{i}]", depth + 1);
                }

                return;
            }

            ruleCount++;
            if (!ProductGridFields.TryResolveTreeRule(node.Field, node.Operator, out _, out _, out var op))
            {
                context.AddFailure(path, $"'{node.Field}' alanı '{node.Operator}' operatörünü desteklemiyor.");
                return;
            }

            if (ValueShapeError(op, node.Value) is { } error)
            {
                context.AddFailure($"{path}.value", error);
            }
        }
    }

    private static string? ValueShapeError(string op, JsonElement? value)
    {
        static bool IsBlank(JsonElement v) => v.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
            || (v.ValueKind == JsonValueKind.String && string.IsNullOrWhiteSpace(v.GetString()));

        if (value is not { } v || IsBlank(v))
        {
            return "Değer zorunlu.";
        }

        return op switch
        {
            "between" when v.ValueKind != JsonValueKind.Array || v.GetArrayLength() != 2 || v.EnumerateArray().Any(IsBlank)
                => "'between' değeri iki dolu elemanlı dizi olmalı: [başlangıç, bitiş].",
            "in" when v.ValueKind != JsonValueKind.Array || v.GetArrayLength() == 0 || v.EnumerateArray().Any(IsBlank)
                => "'in' değeri boş eleman içermeyen bir dizi olmalı.",
            "in" when v.GetArrayLength() > MaxInValues => $"'in' değeri en fazla {MaxInValues} eleman içerebilir.",
            not ("between" or "in") when v.ValueKind is JsonValueKind.Array or JsonValueKind.Object
                => "Değer tek bir değer olmalı.",
            _ => null,
        };
    }
}

public sealed class ProductInputValidator : AbstractValidator<ProductInput>
{
    public ProductInputValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Ürün adı zorunlu.")
            .MaximumLength(Product.NameMaxLength);
        RuleFor(x => x.Price).InclusiveBetween(0, Product.PriceMax).WithMessage("Fiyat 0 ile 10.000.000 arasında olmalı.")
            .PrecisionScale(12, 2, ignoreTrailingZeros: true).WithMessage("Fiyat en fazla 2 ondalık basamak içerebilir.");
        RuleFor(x => x.CategoryId).NotEmpty().WithMessage("Kategori zorunlu.");
    }
}

public sealed class PageRequestValidator : AbstractValidator<PageRequest>
{
    public PageRequestValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.Size).InclusiveBetween(1, ProductSearchRequestValidator.MaxPageSize);
    }
}
