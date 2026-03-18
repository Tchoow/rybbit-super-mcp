import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitClient, truncateResponse } from "../client.js";
import {
  analyticsInputSchema,
  bucketSchema,
  paginationSchema,
  siteIdSchema,
} from "../schemas.js";

export function registerExtrasTools(
  server: McpServer,
  client: RybbitClient
): void {
  // ── 1. Page Titles ──────────────────────────────────────────────────

  server.registerTool(
    "rybbit_get_page_titles",
    {
      title: "Page Titles",
      description:
        "Get page titles with visit counts, percentages, and average time on page. " +
        "Useful for understanding content engagement. Returns title, pathname, visits, percentage, and avg time.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        ...analyticsInputSchema,
        ...paginationSchema,
      },
    },
    async (args) => {
      try {
        const params = client.buildAnalyticsParams(args);
        const data = await client.get(
          `/sites/${args.siteId}/page-titles`,
          params
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 2. Site Event Count ─────────────────────────────────────────────

  server.registerTool(
    "rybbit_get_site_event_count",
    {
      title: "Site Event Count",
      description:
        "Get time-bucketed event counts broken down by type: pageviews, custom events, " +
        "performance, outbound, errors, button clicks, copy, form submits, input changes. " +
        "Useful for understanding the volume and mix of tracking events over time.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        ...analyticsInputSchema,
        bucket: bucketSchema,
      },
    },
    async (args) => {
      try {
        const params = client.buildAnalyticsParams(args);
        const data = await client.get(
          `/sites/${args.siteId}/events/count`,
          params
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 3. Organization Event Count ─────────────────────────────────────

  server.registerTool(
    "rybbit_get_org_event_count",
    {
      title: "Organization Event Count",
      description:
        "Get aggregated daily event counts across all sites in an organization. " +
        "Includes breakdown by event type (pageviews, custom events, errors, etc.). " +
        "Use rybbit_list_sites to find organization IDs. " +
        "Note: may require session-based auth (email/password) — API key auth can return 403.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        organizationId: z
          .string()
          .describe("Organization ID. Use rybbit_list_sites to find organization IDs."),
        startDate: z
          .string()
          .optional()
          .describe("Start date in ISO format (YYYY-MM-DD)"),
        endDate: z
          .string()
          .optional()
          .describe("End date in ISO format (YYYY-MM-DD)"),
        timeZone: z
          .string()
          .optional()
          .describe("IANA timezone (e.g., Europe/Paris). Default: UTC"),
      },
    },
    async (args) => {
      try {
        const params = client.buildAnalyticsParams({
          startDate: args.startDate,
          endDate: args.endDate,
          timeZone: args.timeZone,
        });
        const data = await client.get(
          `/org-event-count/${args.organizationId}`,
          params
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 4. Site Has Data ────────────────────────────────────────────────

  server.registerTool(
    "rybbit_check_site_has_data",
    {
      title: "Check Site Has Data",
      description:
        "Check if a site has any recorded events. Returns a boolean. " +
        "Useful for verifying that the tracking script is properly installed before querying analytics.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
      },
    },
    async (args) => {
      try {
        const data = await client.get(`/sites/${args.siteId}/has-data`);
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 5. User Session Count ───────────────────────────────────────────

  server.registerTool(
    "rybbit_get_user_session_count",
    {
      title: "User Session Count",
      description:
        "Get daily session counts for a specific user over time. " +
        "Useful for analyzing individual user activity patterns and retention.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        userId: z
          .string()
          .describe("User ID (user_id or identified_user_id). Use rybbit_list_users to find user IDs."),
        startDate: z
          .string()
          .optional()
          .describe("Start date (YYYY-MM-DD)"),
        endDate: z
          .string()
          .optional()
          .describe("End date (YYYY-MM-DD)"),
        timeZone: z
          .string()
          .optional()
          .describe("IANA timezone (default UTC)"),
      },
    },
    async (args) => {
      try {
        const params = client.buildAnalyticsParams({
          startDate: args.startDate,
          endDate: args.endDate,
          timeZone: args.timeZone,
        });
        params.user_id = args.userId;
        const data = await client.get(
          `/sites/${args.siteId}/users/session-count`,
          params
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 6. Excluded IPs ────────────────────────────────────────────────

  server.registerTool(
    "rybbit_get_excluded_ips",
    {
      title: "Excluded IPs",
      description:
        "Get the list of IP addresses excluded from tracking for a site. " +
        "Useful for auditing tracking configuration.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
      },
    },
    async (args) => {
      try {
        const data = await client.get(
          `/sites/${args.siteId}/excluded-ips`
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 7. Excluded Countries ───────────────────────────────────────────

  server.registerTool(
    "rybbit_get_excluded_countries",
    {
      title: "Excluded Countries",
      description:
        "Get the list of country codes excluded from tracking for a site. " +
        "Useful for compliance auditing (GDPR, etc.).",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
      },
    },
    async (args) => {
      try {
        const data = await client.get(
          `/sites/${args.siteId}/excluded-countries`
        );
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // ── 8. Site Details ─────────────────────────────────────────────────

  server.registerTool(
    "rybbit_get_site_details",
    {
      title: "Site Details",
      description:
        "Get full site configuration and metadata: domain, name, creation date, " +
        "tracking flags (blockBots, trackIp, sessionReplay, webVitals, trackErrors, " +
        "trackOutbound, trackUrlParams, trackButtonClicks, trackCopy, trackFormInteractions, etc.). " +
        "Complementary to rybbit_update_site_config — this reads the current config.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
      },
    },
    async (args) => {
      try {
        const data = await client.get(`/sites/${args.siteId}`);
        return {
          content: [{ type: "text" as const, text: truncateResponse(data) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
