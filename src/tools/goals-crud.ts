import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RybbitClient, truncateResponse } from "../client.js";
import { siteIdSchema } from "../schemas.js";

const goalTypeSchema = z
  .enum(["path", "event"])
  .describe("'path' to match URL pathname, 'event' to match custom event name");

const goalConfigSchema = z.object({
  pathPattern: z
    .string()
    .optional()
    .describe("URL path pattern to match (required for goalType='path'). Supports wildcards: * = one segment, ** = multiple."),
  eventName: z
    .string()
    .optional()
    .describe("Custom event name to match (required for goalType='event')"),
  eventPropertyKey: z
    .string()
    .optional()
    .describe("Optional: event property key to match (must be paired with eventPropertyValue)"),
  eventPropertyValue: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("Optional: event property value to match (must be paired with eventPropertyKey)"),
  propertyFilters: z
    .array(
      z.object({
        key: z.string().describe("Property key"),
        value: z.union([z.string(), z.number(), z.boolean()]).describe("Property value"),
      })
    )
    .optional()
    .describe("Optional: array of property filters for advanced matching"),
});

export function registerGoalsCrudTools(
  server: McpServer,
  client: RybbitClient
): void {
  server.registerTool(
    "rybbit_create_goal",
    {
      title: "Create Goal",
      description:
        "Create a new conversion goal in Rybbit. A goal tracks conversions when users visit a specific page path or trigger a custom event. " +
        "For path goals: set goalType='path' and config.pathPattern (e.g. '/order-confirmation'). " +
        "For event goals: set goalType='event' and config.eventName (e.g. 'purchase'). " +
        "Use rybbit_list_goals to verify creation afterward.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        name: z.string().optional().describe("Display name for the goal (e.g. 'Purchase Completed')"),
        goalType: goalTypeSchema,
        config: goalConfigSchema,
      },
    },
    async ({ siteId, name, goalType, config }) => {
      try {
        const data = await client.post(
          `/sites/${siteId}/goals`,
          { name, goalType, config }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Goal '${name || goalType}' created successfully`,
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
    "rybbit_update_goal",
    {
      title: "Update Goal",
      description:
        "Update an existing goal. You must provide the full goal definition (goalType + config) as the update replaces the entire goal. " +
        "Use rybbit_list_goals to find goal IDs and current configuration.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        goalId: z
          .number()
          .int()
          .describe("Goal ID (numeric) to update. Use rybbit_list_goals to find IDs."),
        name: z.string().optional().describe("New display name for the goal"),
        goalType: goalTypeSchema,
        config: goalConfigSchema,
      },
    },
    async ({ siteId, goalId, name, goalType, config }) => {
      try {
        const data = await client.put(
          `/sites/${siteId}/goals/${goalId}`,
          {
            goalId,
            siteId: Number(siteId),
            name,
            goalType,
            config,
          }
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Goal '${goalId}' updated successfully`,
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
    "rybbit_delete_goal",
    {
      title: "Delete Goal",
      description:
        "Permanently delete a conversion goal. This cannot be undone. " +
        "Use rybbit_list_goals to find goal IDs.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        goalId: z
          .string()
          .describe("Goal ID to delete. Use rybbit_list_goals to find IDs."),
      },
    },
    async ({ siteId, goalId }) => {
      try {
        const data = await client.delete(
          `/sites/${siteId}/goals/${goalId}`
        );

        return {
          content: [
            {
              type: "text" as const,
              text: truncateResponse({
                message: `Goal '${goalId}' deleted successfully`,
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
    "rybbit_batch_create_goals",
    {
      title: "Batch Create Goals",
      description:
        "Create multiple conversion goals at once. Each goal is created sequentially to respect rate limits. " +
        "If one fails, the others still proceed. Returns a summary of successes and failures.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        siteId: siteIdSchema,
        goals: z
          .array(
            z.object({
              name: z.string().optional().describe("Display name for the goal"),
              goalType: goalTypeSchema,
              config: goalConfigSchema,
            })
          )
          .min(1)
          .max(30)
          .describe("Array of goals to create (1-30)"),
      },
    },
    async ({ siteId, goals }) => {
      const results: Array<{
        name: string;
        success: boolean;
        error?: string;
        data?: unknown;
      }> = [];

      for (const goal of goals) {
        try {
          const data = await client.post(
            `/sites/${siteId}/goals`,
            { name: goal.name, goalType: goal.goalType, config: goal.config }
          );
          results.push({ name: goal.name || goal.goalType, success: true, data });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ name: goal.name || goal.goalType, success: false, error: message });
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
