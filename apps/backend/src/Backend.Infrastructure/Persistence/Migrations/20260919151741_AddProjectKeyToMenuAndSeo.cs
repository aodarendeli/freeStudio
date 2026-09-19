using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectKeyToMenuAndSeo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_seo_metadata_Slug",
                table: "seo_metadata");

            migrationBuilder.AddColumn<string>(
                name: "ProjectKey",
                table: "seo_metadata",
                type: "text",
                nullable: false,
                defaultValue: "client");

            migrationBuilder.AddColumn<string>(
                name: "ProjectKey",
                table: "menu_items",
                type: "text",
                nullable: false,
                defaultValue: "client");

            migrationBuilder.CreateIndex(
                name: "IX_seo_metadata_ProjectKey_Slug",
                table: "seo_metadata",
                columns: new[] { "ProjectKey", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_menu_items_ProjectKey_Slug",
                table: "menu_items",
                columns: new[] { "ProjectKey", "Slug" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_seo_metadata_ProjectKey_Slug",
                table: "seo_metadata");

            migrationBuilder.DropIndex(
                name: "IX_menu_items_ProjectKey_Slug",
                table: "menu_items");

            migrationBuilder.DropColumn(
                name: "ProjectKey",
                table: "seo_metadata");

            migrationBuilder.DropColumn(
                name: "ProjectKey",
                table: "menu_items");

            migrationBuilder.CreateIndex(
                name: "IX_seo_metadata_Slug",
                table: "seo_metadata",
                column: "Slug",
                unique: true);
        }
    }
}
