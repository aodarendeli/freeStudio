using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_lab_tests_baby_changes",
                table: "lab_tests",
                columns: new[] { "baby_id", "updated_at", "id" });

            migrationBuilder.CreateIndex(
                name: "ix_care_events_baby_changes",
                table: "care_events",
                columns: new[] { "baby_id", "updated_at", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_lab_tests_baby_changes",
                table: "lab_tests");

            migrationBuilder.DropIndex(
                name: "ix_care_events_baby_changes",
                table: "care_events");
        }
    }
}
