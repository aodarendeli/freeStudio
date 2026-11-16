using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class free1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "babies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    birth_date = table.Column<DateOnly>(type: "date", nullable: false),
                    sex = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    color = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    archived_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_babies", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "active_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    baby_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    segments = table.Column<string>(type: "jsonb", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_active_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_active_sessions_babies_baby_id",
                        column: x => x.baby_id,
                        principalTable: "babies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "care_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    baby_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    method = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    breast_segments = table.Column<string>(type: "jsonb", nullable: true),
                    bottle_amount_ml = table.Column<int>(type: "integer", nullable: true),
                    bottle_content = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    solid_items = table.Column<List<string>>(type: "text[]", nullable: true),
                    diaper_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_care_events", x => x.id);
                    table.CheckConstraint("ck_care_events_bottle_amount", "bottle_amount_ml IS NULL OR (bottle_amount_ml > 0 AND bottle_amount_ml <= 500)");
                    table.CheckConstraint("ck_care_events_ended_after_started", "ended_at IS NULL OR ended_at >= started_at");
                    table.ForeignKey(
                        name: "FK_care_events_babies_baby_id",
                        column: x => x.baby_id,
                        principalTable: "babies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lab_tests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    baby_id = table.Column<Guid>(type: "uuid", nullable: false),
                    taken_on = table.Column<DateOnly>(type: "date", nullable: false),
                    category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    lab_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_tests", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_tests_babies_baby_id",
                        column: x => x.baby_id,
                        principalTable: "babies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reminder_settings",
                columns: table => new
                {
                    baby_id = table.Column<Guid>(type: "uuid", nullable: false),
                    next_feed_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    next_feed_interval_min = table.Column<int>(type: "integer", nullable: false),
                    still_running_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    still_running_after_min = table.Column<int>(type: "integer", nullable: false),
                    quiet_hours_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    quiet_hours_start = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    quiet_hours_end = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reminder_settings", x => x.baby_id);
                    table.ForeignKey(
                        name: "FK_reminder_settings_babies_baby_id",
                        column: x => x.baby_id,
                        principalTable: "babies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "baby_caregivers",
                columns: table => new
                {
                    baby_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    invited_by = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_baby_caregivers", x => new { x.baby_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_baby_caregivers_babies_baby_id",
                        column: x => x.baby_id,
                        principalTable: "babies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_baby_caregivers_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_settings",
                columns: table => new
                {
                    user_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    locale = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    theme = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    volume_unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    weight_unit = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    auto_night = table.Column<bool>(type: "boolean", nullable: false),
                    haptics = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_settings", x => x.user_id);
                    table.ForeignKey(
                        name: "FK_user_settings_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lab_results",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    lab_test_id = table.Column<Guid>(type: "uuid", nullable: false),
                    analyte = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    value = table.Column<decimal>(type: "numeric", nullable: false),
                    unit = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ref_low = table.Column<decimal>(type: "numeric", nullable: true),
                    ref_high = table.Column<decimal>(type: "numeric", nullable: true),
                    position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_results", x => x.id);
                    table.CheckConstraint("ck_lab_results_range", "ref_low IS NULL OR ref_high IS NULL OR ref_low <= ref_high");
                    table.ForeignKey(
                        name: "FK_lab_results_lab_tests_lab_test_id",
                        column: x => x.lab_test_id,
                        principalTable: "lab_tests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_active_sessions_baby_kind",
                table: "active_sessions",
                columns: new[] { "baby_id", "kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_baby_caregivers_user_id",
                table: "baby_caregivers",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_care_events_baby_kind_timeline",
                table: "care_events",
                columns: new[] { "baby_id", "kind", "started_at", "id" },
                descending: new[] { false, false, true, true });

            migrationBuilder.CreateIndex(
                name: "ix_care_events_baby_timeline",
                table: "care_events",
                columns: new[] { "baby_id", "started_at", "id" },
                descending: new[] { false, true, true });

            migrationBuilder.CreateIndex(
                name: "ix_lab_results_test_position",
                table: "lab_results",
                columns: new[] { "lab_test_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_lab_tests_baby_taken_on",
                table: "lab_tests",
                columns: new[] { "baby_id", "taken_on" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "active_sessions");

            migrationBuilder.DropTable(
                name: "baby_caregivers");

            migrationBuilder.DropTable(
                name: "care_events");

            migrationBuilder.DropTable(
                name: "lab_results");

            migrationBuilder.DropTable(
                name: "reminder_settings");

            migrationBuilder.DropTable(
                name: "user_settings");

            migrationBuilder.DropTable(
                name: "lab_tests");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "babies");
        }
    }
}
