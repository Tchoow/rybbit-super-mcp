import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitClient, truncateResponse } from "../client.js";
import { siteIdSchema } from "../schemas.js";

const funnelStepSchema = z.object({
  value: z
    .string()
    .describe(
      "Page path pattern (supports wildcards: * = one segment, ** = multiple) or custom event name"
    ),
  type: z
    .enum(["page", "event"])
    .describe("'page' to match URL pathname, 'event' to match custom event name"),
  name: z
    .string()
    .optional()
    .describe("Human-readable display name for this step"),
  hostname: z
    .string()
    .optional()
    .describe("Restrict this step to a specific hostname"),
  eventPropertyKey: z
    .string()
    .optional()
    .describe("Optional: event property key to match"),
  eventPropertyValue: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("Optional: event property value to match"),
  propertyFilters: z
    .array(
      z.object({
        key: z.string().describe("Property key to filter on"),
        value: z.union([z.string(), z.number(), z.boolean()]).describe("Property value to match"),
      })
    )
    .optional()
    .describe("Optional property filters for this step"),
});

export function registerFunnelsCrudTools(
  server: McpServer,
  client: RybbitClient
): void {
  server.registerTool(
    "rybbit_create_funnel",
    {
      title: "Create Funnel",
      description:
        "Create and save a new funnel in Rybbit. Requires a name and at least 2 steps. " +
        "Each step is either a page path (supports wildcards) or a custom event name. " +
        "Use rybbit_list_funnels to verify creation afterward.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        name: z.string().describe("Display name for the funnel"),
        steps: z
          .array(funnelStepSchema)
          .min(2)
          .describe("Funnel steps (minimum 2). Order matters — first step is the entry point"),
      },
    },
    async ({ siteId, name, steps }) => {
      try {
        const data = await client.post(
          `/sites/${siteId}/funnels`,
          { name, steps }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Funnel '${name}' created successfully`,
                ...(data as Record<string, unknown>),
              }),
            },
          ],
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

  server.registerTool(
    "rybbit_update_funnel",
    {
      title: "Update Funnel",
      description:
        "Update an existing funnel's name and/or steps. Uses the create endpoint with reportId to perform an upsert. " +
        "Use rybbit_list_funnels to find funnel IDs (the 'id' field is the reportId).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        funnelId: z
          .number()
          .int()
          .describe("Funnel reportId to update. Use rybbit_list_funnels to find IDs (the 'id' field)."),
        name: z.string().describe("Display name for the funnel"),
        steps: z
          .array(funnelStepSchema)
          .min(2)
          .describe("Complete funnel steps (minimum 2). Replaces all existing steps."),
      },
    },
    async ({ siteId, funnelId, name, steps }) => {
      try {
        // Rybbit updates funnels via POST with reportId in body (upsert pattern)
        const data = await client.post(
          `/sites/${siteId}/funnels`,
          { name, steps, reportId: funnelId }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Funnel '${funnelId}' updated successfully`,
                ...(data as Record<string, unknown>),
              }),
            },
          ],
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

  server.registerTool(
    "rybbit_delete_funnel",
    {
      title: "Delete Funnel",
      description:
        "Permanently delete a saved funnel. This cannot be undone. " +
        "Use rybbit_list_funnels to find funnel IDs.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        funnelId: z
          .string()
          .describe("Funnel ID to delete. Use rybbit_list_funnels to find IDs."),
      },
    },
    async ({ siteId, funnelId }) => {
      try {
        const data = await client.delete(
          `/sites/${siteId}/funnels/${funnelId}`
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Funnel '${funnelId}' deleted successfully`,
                ...(data as Record<string, unknown>),
              }),
            },
          ],
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

  server.registerTool(
    "rybbit_batch_create_funnels",
    {
      title: "Batch Create Funnels",
      description:
        "Create multiple funnels at once. Each funnel is created sequentially to respect rate limits. " +
        "If one fails, the others still proceed. Returns a summary of successes and failures.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        funnels: z
          .array(
            z.object({
              name: z.string().describe("Display name for the funnel"),
              steps: z
                .array(funnelStepSchema)
                .min(2)
                .describe("Funnel steps (minimum 2)"),
            })
          )
          .min(1)
          .max(20)
          .describe("Array of funnels to create (1-20)"),
      },
    },
    async ({ siteId, funnels }) => {
      const results: Array<{
        name: string;
        success: boolean;
        error?: string;
        data?: unknown;
      }> = [];

      for (const funnel of funnels) {
        try {
          const data = await client.post(
            `/sites/${siteId}/funnels`,
            { name: funnel.name, steps: funnel.steps }
          );
          results.push({ name: funnel.name, success: true, data });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ name: funnel.name, success: false, error: message });
        }
      }

      const created = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        content: [
          {
            type: "text" as const,
            text: truncateResponse({
              summary: `${created} created, ${failed} failed`,
              results,
            }),
          },
        ],
      };
    }
  );
}
