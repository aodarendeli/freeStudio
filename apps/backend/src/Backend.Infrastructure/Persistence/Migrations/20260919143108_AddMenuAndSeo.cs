using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuAndSeo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "menu_items",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ParentId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_menu_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_menu_items_menu_items_ParentId",
                        column: x => x.ParentId,
                        principalTable: "menu_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "seo_metadata",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    OgImage = table.Column<string>(type: "text", nullable: true),
                    CanonicalUrl = table.Column<string>(type: "text", nullable: true),
                    NoIndex = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seo_metadata", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_menu_items_ParentId",
                table: "menu_items",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_seo_metadata_Slug",
                table: "seo_metadata",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "menu_items");

            migrationBuilder.DropTable(
                name: "seo_metadata");
        }
    }
}
