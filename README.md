# rybbit-super-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.27-green.svg)](https://modelcontextprotocol.io/)

> Extended MCP server for Rybbit Analytics — **48 tools** with full CRUD for funnels, goals, and sites.
> Query statistics, manage funnels, create goals, and analyze performance directly from Claude Code.

## Why?

Instead of switching to the Rybbit dashboard, let the LLM query and manage your analytics directly:

- _"Create a checkout funnel: homepage → product → cart → order confirmation"_
- _"What's the drop-off rate on the signup funnel?"_
- _"Set up conversion goals for purchases and newsletter signups"_
- _"Delete all test funnels"_
- _"Show me top pages by bounce rate for the last 7 days"_
- _"Which countries drive the most traffic?"_

## Quick Start

### Installation

```bash
git clone https://github.com/Tchoow/rybbit-super-mcp.git
cd rybbit-super-mcp
npm install && npm run build
```

### Configuration

Add the MCP server to your Claude Code settings (`~/.claude/settings.json`):

**Option 1 — Local path (recommended):**

```json
{
  "mcpServers": {
    "rybbit": {
      "command": "node",
      "args": ["/absolute/path/to/rybbit-super-mcp/build/index.js"],
      "env": {
        "RYBBIT_URL": "https://your-rybbit-instance.com",
        "RYBBIT_API_KEY": "your-api-key-here",
        "RYBBIT_EMAIL": "your-email@example.com",
        "RYBBIT_PASSWORD": "your-password"
      }
    }
  }
}
```

> **API key is used first** for all read operations (stateless, fast). For CRUD operations (funnels/goals), the MCP automatically falls back to session auth if the API key returns 403. See [Authentication](#authentication) for details.

**Option 2 — Via npx (no clone needed):**

```json
{
  "mcpServers": {
    "rybbit": {
      "command": "npx",
      "args": ["-y", "github:Tchoow/rybbit-super-mcp"],
      "env": {
        "RYBBIT_URL": "https://your-rybbit-instance.com",
        "RYBBIT_API_KEY": "your-api-key-here",
        "RYBBIT_EMAIL": "your-email@example.com",
        "RYBBIT_PASSWORD": "your-password"
      }
    }
  }
}
```

## Features

| Category | Tools | Description |
|----------|-------|-------------|
| Configuration & Sites | 8 | Server config, list/create/update/delete sites, site details, excluded IPs/countries |
| Real-time & Overview | 4 | Live users, overview metrics, time series, session locations |
| Metrics & Dimensions | 3 | Metric breakdown by 22 dimensions, retention, page titles |
| Sessions | 2 | List sessions with IP filtering, session detail with event timeline |
| Users | 5 | List users, user detail, user traits, event breakdown, session count timeline |
| Events | 6 | List events, event names, properties, time series, outbound links, event count by type |
| Errors | 1 | Error tracking (names, events, timeseries modes) |
| Performance | 2 | Core Web Vitals (LCP, CLS, INP, FCP, TTFB) with time series |
| Funnels | 7 | List, analyze, step sessions + **create, update, delete, batch create** |
| Goals | 6 | List, goal sessions + **create, update, delete, batch create** |
| Journeys | 1 | User journey/flow analysis |
| Organization | 2 | Org event count, check site has data |

## Tools (48)

### Configuration & Site Management (8)

| Tool | Description |
|------|-------------|
| `rybbit_get_config` | Get Rybbit server version and configuration |
| `rybbit_list_sites` | List all sites and organizations |
| `rybbit_get_site_id` | Look up a site ID by domain name |
| `rybbit_get_site_details` | **NEW** — Get full site config (tracking flags, domain, etc.) |
| `rybbit_create_site` | Create a new site in an organization |
| `rybbit_update_site_config` | Update site tracking settings (IP, errors, replay, etc.) |
| `rybbit_delete_site` | Delete a site permanently |
| `rybbit_get_excluded_ips` | **NEW** — List IPs excluded from tracking |
| `rybbit_get_excluded_countries` | **NEW** — List countries excluded from tracking |

### Real-time & Overview (4)

| Tool | Description |
|------|-------------|
| `rybbit_live_users` | Current live/active user count |
| `rybbit_get_overview` | Aggregated metrics: sessions, pageviews, users, bounce rate |
| `rybbit_get_overview_timeseries` | Overview metrics as time-series with configurable buckets |
| `rybbit_get_session_locations` | Geographic session data with coordinates |

### Metrics & Dimensions (3)

| Tool | Description |
|------|-------------|
| `rybbit_get_metric` | Breakdown by dimension (browser, country, pathname, UTM, etc.) |
| `rybbit_get_retention` | User retention cohort analysis |
| `rybbit_get_page_titles` | **NEW** — Page titles with visit counts and avg time on page |

### Sessions (2)

| Tool | Description |
|------|-------------|
| `rybbit_list_sessions` | List sessions with filtering, pagination, IP search |
| `rybbit_get_session` | Session detail with full event timeline |

### Users (5)

| Tool | Description |
|------|-------------|
| `rybbit_list_users` | List users with search, sorting, identified-only filter |
| `rybbit_get_user` | User detail with traits and activity |
| `rybbit_get_user_traits` | User trait keys, values, or find users by trait |
| `rybbit_get_user_event_breakdown` | Per-user event count breakdown |
| `rybbit_get_user_session_count` | **NEW** — Daily session count timeline for a specific user |

### Events (6)

| Tool | Description |
|------|-------------|
| `rybbit_list_events` | Raw event records with filtering |
| `rybbit_get_event_names` | All custom event names with counts |
| `rybbit_get_event_properties` | Property breakdown for a specific event |
| `rybbit_get_event_timeseries` | Event counts as time-series |
| `rybbit_get_outbound_links` | Outbound link click tracking |
| `rybbit_get_site_event_count` | **NEW** — Event counts by type (pageviews, custom, errors, etc.) |

### Errors (1)

| Tool | Description |
|------|-------------|
| `rybbit_get_errors` | Error tracking: names, individual events, or timeseries |

### Performance (2)

| Tool | Description |
|------|-------------|
| `rybbit_get_performance` | Core Web Vitals with percentiles, optional dimension breakdown |
| `rybbit_get_performance_timeseries` | Web Vitals trends over time |

### Funnels (3 read + 4 CRUD)

| Tool | Description |
|------|-------------|
| `rybbit_list_funnels` | List all saved funnels |
| `rybbit_analyze_funnel` | Ad-hoc funnel analysis (without saving) |
| `rybbit_get_funnel_step_sessions` | Sessions that reached/dropped at a funnel step |
| `rybbit_create_funnel` | **NEW** — Create and save a funnel |
| `rybbit_update_funnel` | **NEW** — Update a funnel's name or steps |
| `rybbit_delete_funnel` | **NEW** — Delete a saved funnel |
| `rybbit_batch_create_funnels` | **NEW** — Create multiple funnels at once |

### Goals (2 read + 4 CRUD)

| Tool | Description |
|------|-------------|
| `rybbit_list_goals` | List goals with conversion metrics |
| `rybbit_get_goal_sessions` | Sessions that completed a goal |
| `rybbit_create_goal` | **NEW** — Create a conversion goal |
| `rybbit_update_goal` | **NEW** — Update a goal |
| `rybbit_delete_goal` | **NEW** — Delete a goal |
| `rybbit_batch_create_goals` | **NEW** — Create multiple goals at once |

### Journeys (1)

| Tool | Description |
|------|-------------|
| `rybbit_get_journeys` | User journey/flow analysis with common navigation paths |

### Organization & Utilities (2)

| Tool | Description |
|------|-------------|
| `rybbit_get_org_event_count` | **NEW** — Aggregated event counts across all sites in an org |
| `rybbit_check_site_has_data` | **NEW** — Check if a site has any recorded events (boolean) |

## Common Parameters

### Date Ranges

Most analytics tools accept either absolute or relative date ranges:

- **Absolute**: `startDate` / `endDate` in `YYYY-MM-DD` format
- **Relative**: `pastMinutesStart` / `pastMinutesEnd` (e.g., `pastMinutesStart: 60` = last hour)

### Filters

```json
[
  { "parameter": "country", "type": "equals", "value": ["US", "FR"] },
  { "parameter": "browser", "type": "not_equals", "value": ["IE"] },
  { "parameter": "pathname", "type": "contains", "value": ["/blog"] }
]
```

Available filter dimensions: `browser`, `operating_system`, `language`, `country`, `region`, `city`, `device_type`, `referrer`, `hostname`, `pathname`, `page_title`, `querystring`, `event_name`, `channel`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `entry_page`, `exit_page`, `user_id`.

Filter types: `equals`, `not_equals`, `contains`, `not_contains`, `regex`, `not_regex`, `greater_than`, `less_than`.

### Time Buckets

For time-series endpoints: `minute`, `five_minutes`, `ten_minutes`, `fifteen_minutes`, `hour`, `day`, `week`, `month`, `year`.

### Pagination

- `page`: Page number (1-indexed)
- `limit`: Results per page (max 200)

## Authentication

Two modes are supported. **API key + email/password** is the recommended setup for full access:

| Mode | Environment Variables | CRUD Support |
|------|----------------------|--------------|
| **API Key + Email/Password** (recommended) | `RYBBIT_API_KEY`, `RYBBIT_EMAIL`, `RYBBIT_PASSWORD` | All 48 tools (automatic fallback) |
| **API Key only** | `RYBBIT_API_KEY` | Read + site config (CRUD may fail on older Rybbit versions) |
| **Email/Password only** | `RYBBIT_EMAIL`, `RYBBIT_PASSWORD` | All 48 tools |

All modes require `RYBBIT_URL` — the URL of your Rybbit instance (without trailing slash).

**How it works:** API key is used first (stateless, fast). If a CRUD request returns 403 and email/password credentials are available, the MCP automatically retries with session auth. This transparent fallback ensures all 48 tools work regardless of the Rybbit server version.

**Recommended config** (full access):

```json
{
  "mcpServers": {
    "rybbit": {
      "command": "node",
      "args": ["/path/to/rybbit-super-mcp/build/index.js"],
      "env": {
        "RYBBIT_URL": "https://your-rybbit-instance.com",
        "RYBBIT_API_KEY": "your-api-key-here",
        "RYBBIT_EMAIL": "your-email@example.com",
        "RYBBIT_PASSWORD": "your-password"
      }
    }
  }
}
```

## E-commerce Examples

### PrestaShop Checkout Funnel

```
"Create a checkout funnel for my PrestaShop store with these steps:
1. Homepage (/)
2. Product Page (/en/*/*.html)
3. Add to Cart (event: add_to_cart)
4. Checkout (/en/order)
5. Purchase Confirmation (/en/order-confirmation)"
```

### Conversion Goals (Batch)

Goals use `goalType` ("path" or "event") and a `config` object:

```
"Create these conversion goals for my e-commerce site:
- Purchase: goalType=path, config.pathPattern=/order-confirmation
- Add to Cart: goalType=event, config.eventName=add_to_cart
- Newsletter: goalType=event, config.eventName=newsletter_subscribe
- Contact Form: goalType=path, config.pathPattern=/contact-success
- Account Created: goalType=event, config.eventName=user_registered"
```

### Funnel Drop-off Analysis

```
"Analyze the checkout funnel and show me which step has the highest drop-off.
Then get the sessions that dropped off at that step so I can understand why."
```

## Differences from upstream

| Feature | `@nks-hub/rybbit-mcp` | `rybbit-super-mcp` |
|---------|----------------------|---------------------|
| Total tools | 32 | **48** |
| Create funnel | — | `rybbit_create_funnel` |
| Update funnel | — | `rybbit_update_funnel` |
| Delete funnel | — | `rybbit_delete_funnel` |
| Batch create funnels | — | `rybbit_batch_create_funnels` |
| Create goal | — | `rybbit_create_goal` |
| Update goal | — | `rybbit_update_goal` |
| Delete goal | — | `rybbit_delete_goal` |
| Batch create goals | — | `rybbit_batch_create_goals` |
| Page titles | — | `rybbit_get_page_titles` |
| Site event count | — | `rybbit_get_site_event_count` |
| Org event count | — | `rybbit_get_org_event_count` |
| Site has data | — | `rybbit_check_site_has_data` |
| User session count | — | `rybbit_get_user_session_count` |
| Site details | — | `rybbit_get_site_details` |
| Excluded IPs | — | `rybbit_get_excluded_ips` |
| Excluded countries | — | `rybbit_get_excluded_countries` |
| Auth priority | API key first | API key first + automatic session fallback on 403 |
| LLM instructions | Basic workflow | Full CRUD workflow guide |

## Development

```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript
npm run dev        # Watch mode (recompile on change)
npm start          # Run the compiled server
```

## Credits

Fork of [@nks-hub/rybbit-mcp](https://github.com/nks-hub/rybbit-mcp) by NKS Hub. Extended by [Tchoow / Flowcode](https://flowcode.fr).

## License

[MIT](LICENSE)
