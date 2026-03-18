#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getAuthConfig } from "./auth.js";
import { RybbitClient } from "./client.js";
import { registerConfigTools } from "./tools/config.js";
import { registerOverviewTools } from "./tools/overview.js";
import { registerMetricsTools } from "./tools/metrics.js";
import { registerSessionsTools } from "./tools/sessions.js";
import { registerUsersTools } from "./tools/users.js";
import { registerEventsTools } from "./tools/events.js";
import { registerErrorsTools } from "./tools/errors.js";
import { registerPerformanceTools } from "./tools/performance.js";
import { registerFunnelsTools } from "./tools/funnels.js";
import { registerFunnelsCrudTools } from "./tools/funnels-crud.js";
import { registerGoalsTools } from "./tools/goals.js";
import { registerGoalsCrudTools } from "./tools/goals-crud.js";
import { registerJourneysTools } from "./tools/journeys.js";
import { registerExtrasTools } from "./tools/extras.js";

async function main() {
  const config = getAuthConfig();
  const client = new RybbitClient(config);

  const server = new McpServer(
    {
      name: "rybbit-super-mcp",
      version: "1.0.0",
    },
    {
      instructions:
        "Rybbit Analytics MCP server with full CRUD support. 48 tools covering analytics, funnels, goals, and site management.\n\n" +
        "QUICK START:\n" +
        "1. rybbit_list_sites → discover sites and their IDs\n" +
        "2. rybbit_get_overview → site snapshot (sessions, users, bounce rate)\n" +
        "3. Drill into metrics, sessions, users, events, errors, performance\n\n" +
        "FUNNEL MANAGEMENT:\n" +
        "- rybbit_list_funnels → see saved funnels\n" +
        "- rybbit_create_funnel / rybbit_batch_create_funnels → create funnels\n" +
        "- rybbit_update_funnel → modify name or steps\n" +
        "- rybbit_delete_funnel → remove a funnel\n" +
        "- rybbit_analyze_funnel → ad-hoc analysis without saving\n" +
        "- rybbit_get_funnel_step_sessions → drill into drop-offs\n\n" +
        "GOAL MANAGEMENT:\n" +
        "- rybbit_list_goals → see goals with conversion metrics\n" +
        "- rybbit_create_goal / rybbit_batch_create_goals → create goals\n" +
        "- rybbit_update_goal → modify a goal\n" +
        "- rybbit_delete_goal → remove a goal\n\n" +
        "SITE MANAGEMENT:\n" +
        "- rybbit_create_site / rybbit_delete_site / rybbit_update_site_config\n\n" +
        "TIPS:\n" +
        "- Date ranges: startDate/endDate (YYYY-MM-DD) or pastMinutesStart/pastMinutesEnd\n" +
        "- Filters: [{parameter:'country',type:'equals',value:['US']}]\n" +
        "- Page wildcards: '*' = one segment, '**' = multiple segments\n" +
        "- Funnel steps: type 'page' for URLs, type 'event' for custom events",
    }
  );

  // Configuration & Site Management (6 tools)
  registerConfigTools(server, client);

  // Real-time & Overview (4 tools)
  registerOverviewTools(server, client);

  // Metrics & Dimensions (2 tools)
  registerMetricsTools(server, client);

  // Sessions (2 tools)
  registerSessionsTools(server, client);

  // Users (4 tools)
  registerUsersTools(server, client);

  // Events (5 tools)
  registerEventsTools(server, client);

  // Errors (1 tool)
  registerErrorsTools(server, client);

  // Performance (2 tools)
  registerPerformanceTools(server, client);

  // Funnels — Read (3 tools)
  registerFunnelsTools(server, client);

  // Funnels — CRUD (4 tools)
  registerFunnelsCrudTools(server, client);

  // Goals — Read (2 tools)
  registerGoalsTools(server, client);

  // Goals — CRUD (4 tools)
  registerGoalsCrudTools(server, client);

  // Journeys (1 tool)
  registerJourneysTools(server, client);

  // Extra analytics & site tools (8 tools)
  registerExtrasTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Rybbit Super MCP server running on stdio (48 tools)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
