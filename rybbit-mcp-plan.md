# Mission Brief — rybbit-super-mcp

## Contexte

Fork et extension complète du MCP `@nks-hub/rybbit-mcp` (v0.4.1) pour Rybbit Analytics.
Le MCP original expose 32 outils dont seulement 3 en écriture. Notre objectif est de construire un MCP **complet** avec CRUD sur toutes les ressources gérables (funnels, goals, sites) + les 32 outils de lecture originaux.

- **Repo source (upstream)** : `https://github.com/nks-hub/rybbit-mcp`
- **Repo cible** : `https://github.com/Tchoow/rybbit-super-mcp`
- **Distribution** : GitHub uniquement (pas de publication NPM)
- **Licence** : MIT (comme l'original)

---

## Architecture de l'original à comprendre

### Structure des fichiers (upstream v0.4.1)

```
src/
├── index.ts          # Point d'entrée — crée McpServer, enregistre tous les tools, lance stdio transport
├── auth.ts           # Auth — API key (Bearer) ou email/password (better-auth session cookie)
├── client.ts         # RybbitClient — GET/POST/PUT/DELETE, buildAnalyticsParams(), truncateResponse()
├── constants.ts      # CHARACTER_LIMIT=25000, REQUEST_TIMEOUT_MS=30000
├── schemas.ts        # Zod schemas partagés (siteIdSchema, filterSchema, analyticsInputSchema, etc.)
└── tools/
    ├── config.js     # 6 tools : get_config, list_sites, create_site, get_site_id, update_site_config, delete_site
    ├── overview.js   # 4 tools : live_users, get_overview, get_overview_timeseries, get_session_locations
    ├── metrics.js    # 2 tools : get_metric, get_retention
    ├── sessions.js   # 2 tools : list_sessions, get_session
    ├── users.js      # 4 tools : list_users, get_user, get_user_traits, get_user_event_breakdown
    ├── events.js     # 5 tools : list_events, get_event_names, get_event_properties, get_event_timeseries, get_outbound_links
    ├── errors.js     # 1 tool  : get_errors (multi-mode: names, events, timeseries via paramètre mode)
    ├── performance.js# 2 tools : get_performance, get_performance_timeseries
    ├── funnels.js    # 3 tools : list_funnels, analyze_funnel, get_funnel_step_sessions
    ├── goals.js      # 2 tools : list_goals, get_goal_sessions
    └── journeys.js   # 1 tool  : get_journeys
```

### Patterns à reproduire exactement

Chaque outil suit ce pattern :

```typescript
server.registerTool(
  "rybbit_<nom_du_tool>",          // Convention : rybbit_ + snake_case
  {
    title: "Titre Lisible",
    description: "Description complète pour le LLM...",
    annotations: {
      readOnlyHint: true|false,      // true si lecture seule
      destructiveHint: true|false,    // true si suppression
      idempotentHint: true|false,     // true si rejouer = même résultat
      openWorldHint: true,            // toujours true (API externe)
    },
    inputSchema: {
      // Zod schemas pour chaque paramètre
    },
  },
  async (args) => {
    try {
      // Appel API via client.get/post/put/delete
      const data = await client.get(`/sites/${siteId}/...`, params);
      return {
        content: [{ type: "text", text: truncateResponse(data) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  }
);
```

### Client HTTP (client.ts)

Le `RybbitClient` expose 4 méthodes :

```typescript
client.get(path: string, params?: Record<string, any>)     // → GET  /api{path}?params
client.post(path: string, body: any, params?: Record<string, any>)  // → POST /api{path}?params
client.put(path: string, body: any, params?: Record<string, any>)   // → PUT  /api{path}?params
client.delete(path: string, params?: Record<string, any>)  // → DELETE /api{path}?params
```

Le client gère automatiquement : auth headers, JSON parsing, timeout 30s, retry sur 401, truncation à 25k chars.

### Auth (auth.ts)

Deux modes d'authentification :

| Mode | Variables d'environnement | Usage |
|------|--------------------------|-------|
| API Key (recommandé) | `RYBBIT_API_KEY` | Header `Authorization: Bearer <key>` |
| Email/Password | `RYBBIT_EMAIL`, `RYBBIT_PASSWORD` | Login → session cookie better-auth |

Les deux nécessitent `RYBBIT_URL` (URL de l'instance Rybbit, sans trailing slash).

### Zod Schemas partagés (schemas.ts)

```typescript
siteIdSchema         // z.string() — "Site ID (numeric ID or domain identifier)"
filterSchema         // z.object({ parameter, type, value[] })
analyticsInputSchema // { siteId, startDate?, endDate?, timeZone?, filters?, pastMinutesStart?, pastMinutesEnd? }
bucketSchema         // z.enum(["minute","five_minutes","ten_minutes","fifteen_minutes","hour","day","week","month","year"])
paginationSchema     // { page?: number, limit?: number }
metricParameterSchema // z.enum(["browser","operating_system","language",...22 dimensions])
```

---

## Inventaire complet des 32 outils originaux

### Lecture (29 outils)

| # | Tool | Méthode | Endpoint API | Fichier |
|---|------|---------|-------------|---------|
| 1 | `rybbit_get_config` | GET | `/version` + `/config` | config.ts |
| 2 | `rybbit_list_sites` | GET | `/organizations` | config.ts |
| 3 | `rybbit_get_site_id` | GET | `/organizations` (filtre client-side) | config.ts |
| 4 | `rybbit_live_users` | GET | `/sites/{siteId}/live-user-count` | overview.ts |
| 5 | `rybbit_get_overview` | GET | `/sites/{siteId}/overview` | overview.ts |
| 6 | `rybbit_get_overview_timeseries` | GET | `/sites/{siteId}/overview-bucketed` | overview.ts |
| 7 | `rybbit_get_session_locations` | GET | `/sites/{siteId}/session-locations` | overview.ts |
| 8 | `rybbit_get_metric` | GET | `/sites/{siteId}/metric` | metrics.ts |
| 9 | `rybbit_get_retention` | GET | `/sites/{siteId}/retention` | metrics.ts |
| 10 | `rybbit_list_sessions` | GET | `/sites/{siteId}/sessions` | sessions.ts |
| 11 | `rybbit_get_session` | GET | `/sites/{siteId}/sessions/{sessionId}` | sessions.ts |
| 12 | `rybbit_list_users` | GET | `/sites/{siteId}/users` | users.ts |
| 13 | `rybbit_get_user` | GET | `/sites/{siteId}/users/{userId}` | users.ts |
| 14 | `rybbit_get_user_traits` | GET | `/sites/{siteId}/user-traits/...` (multi-mode) | users.ts |
| 15 | `rybbit_get_user_event_breakdown` | GET | `/sites/{siteId}/events/names` (filtered) | users.ts |
| 16 | `rybbit_list_events` | GET | `/sites/{siteId}/events` | events.ts |
| 17 | `rybbit_get_event_names` | GET | `/sites/{siteId}/events/names` | events.ts |
| 18 | `rybbit_get_event_properties` | GET | `/sites/{siteId}/events/properties` | events.ts |
| 19 | `rybbit_get_event_timeseries` | GET | `/sites/{siteId}/events/bucketed` | events.ts |
| 20 | `rybbit_get_outbound_links` | GET | `/sites/{siteId}/events/outbound` | events.ts |
| 21 | `rybbit_get_errors` | GET | `/sites/{siteId}/error-names` ou `error-events` ou `error-bucketed` | errors.ts |
| 22 | `rybbit_get_performance` | GET | `/sites/{siteId}/performance/overview` + `/performance/by-dimension` | performance.ts |
| 23 | `rybbit_get_performance_timeseries` | GET | `/sites/{siteId}/performance/time-series` | performance.ts |
| 24 | `rybbit_list_funnels` | GET | `/sites/{siteId}/funnels` | funnels.ts |
| 25 | `rybbit_analyze_funnel` | POST | `/sites/{siteId}/funnels/analyze` | funnels.ts |
| 26 | `rybbit_get_funnel_step_sessions` | POST | `/sites/{siteId}/funnels/{step}/sessions` | funnels.ts |
| 27 | `rybbit_list_goals` | GET | `/sites/{siteId}/goals` | goals.ts |
| 28 | `rybbit_get_goal_sessions` | GET | `/sites/{siteId}/goals/{goalId}/sessions` | goals.ts |
| 29 | `rybbit_get_journeys` | GET | `/sites/{siteId}/journeys` | journeys.ts |

### Écriture (3 outils existants)

| # | Tool | Méthode | Endpoint API | Fichier |
|---|------|---------|-------------|---------|
| 30 | `rybbit_create_site` | POST | `/organizations/{orgId}/sites` | config.ts |
| 31 | `rybbit_update_site_config` | PUT | `/sites/{siteId}/config` | config.ts |
| 32 | `rybbit_delete_site` | DELETE | `/sites/{siteId}` | config.ts |

---

## Outils à AJOUTER (CRUD manquants)

### Funnels CRUD (+3 outils)

| Tool | Méthode | Endpoint | annotations |
|------|---------|----------|-------------|
| `rybbit_create_funnel` | POST | `/sites/{siteId}/funnels` | readOnly:false, destructive:false |
| `rybbit_update_funnel` | PUT | `/sites/{siteId}/funnels/{funnelId}` | readOnly:false, destructive:false, idempotent:true |
| `rybbit_delete_funnel` | DELETE | `/sites/{siteId}/funnels/{funnelId}` | readOnly:false, destructive:true |

**Body pour create/update funnel :**
```json
{
  "name": "Checkout Flow",
  "steps": [
    { "value": "/products/**", "type": "page", "name": "Browse Products" },
    { "value": "add_to_cart", "type": "event", "name": "Add to Cart" },
    { "value": "/checkout", "type": "page", "name": "Checkout" },
    { "value": "/order-confirmation", "type": "page", "name": "Order Confirmed" }
  ]
}
```

Chaque step supporte aussi des champs optionnels :
- `hostname` (string) — restreindre à un domaine spécifique
- `propertyFilters` (array) — filtres par propriété URL ou event property

### Goals CRUD (+3 outils)

| Tool | Méthode | Endpoint | annotations |
|------|---------|----------|-------------|
| `rybbit_create_goal` | POST | `/sites/{siteId}/goals` | readOnly:false, destructive:false |
| `rybbit_update_goal` | PUT | `/sites/{siteId}/goals/{goalId}` | readOnly:false, destructive:false, idempotent:true |
| `rybbit_delete_goal` | DELETE | `/sites/{siteId}/goals/{goalId}` | readOnly:false, destructive:true |

**Body pour create/update goal :**
```json
{
  "name": "Purchase Completed",
  "type": "page",
  "value": "/order-confirmation"
}
```
`type` est soit `"page"` (match pathname) soit `"event"` (match custom event name).

### Batch operations (+2 outils utilitaires)

| Tool | Description |
|------|-------------|
| `rybbit_batch_create_funnels` | Crée N funnels d'un coup (input: `{ siteId, funnels: [...] }`) |
| `rybbit_batch_create_goals` | Crée N goals d'un coup (input: `{ siteId, goals: [...] }`) |

Ces batch tools sont séquentiels (pas parallèles) pour respecter le rate limit de Rybbit (500 req / 10 min).
Chaque item est indépendant : si un échoue, les autres continuent. La réponse résume le nombre de succès/échecs.

### Total final : 40 outils (32 originaux + 8 nouveaux)

---

## Plan de découpage en sub-agents

### Sub-agent 1 : Scaffold du projet

**Objectif** : Initialiser le repo `rybbit-super-mcp` proprement.

**Tâches** :
1. Cloner `https://github.com/nks-hub/rybbit-mcp` dans un dossier temporaire
2. Copier le contenu du dossier `src/` vers le nouveau projet
3. Créer le `package.json` suivant (NE PAS réutiliser celui de l'original) :

```json
{
  "name": "rybbit-super-mcp",
  "version": "1.0.0",
  "description": "Extended MCP server for Rybbit Analytics — full CRUD for funnels, goals, and sites. Fork of @nks-hub/rybbit-mcp with 40 tools.",
  "type": "module",
  "main": "build/index.js",
  "bin": {
    "rybbit-super-mcp": "./build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node build/index.js",
    "prepare": "npm run build"
  },
  "keywords": [
    "mcp", "rybbit", "analytics", "claude", "claude-code",
    "model-context-protocol", "web-analytics", "funnels", "goals",
    "prestashop", "e-commerce"
  ],
  "author": "Tchoow <contact@flowcode.fr>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Tchoow/rybbit-super-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/Tchoow/rybbit-super-mcp/issues"
  },
  "homepage": "https://github.com/Tchoow/rybbit-super-mcp#readme",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

4. Créer le `tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

5. Créer le `.gitignore` :

```
node_modules/
build/
*.js.map
*.d.ts.map
.env
```

6. Créer le fichier `LICENSE` MIT avec copyright `Tchoow / Flowcode`
7. `npm install`
8. `npm run build` → doit compiler sans erreur avec les 32 outils originaux
9. Tester : `RYBBIT_URL=https://example.com RYBBIT_API_KEY=test node build/index.js` → doit démarrer sans crash immédiat (il échouera aux requêtes mais ne crashera pas)

**Critère de succès** : `npm run build` passe sans erreur, le binaire démarre.

---

### Sub-agent 2 : Ajout des outils CRUD Funnels

**Objectif** : Créer `src/tools/funnels-crud.ts` avec 4 nouveaux outils.

**Tâches** :
1. Créer `src/tools/funnels-crud.ts` exportant `registerFunnelsCrudTools(server, client)`
2. Implémenter `rybbit_create_funnel` :
   - Input : `siteId`, `name` (string), `steps` (array min 2)
   - Step schema : `{ value: string, type: "page"|"event", name?: string, hostname?: string, propertyFilters?: [{key, value, type?}] }`
   - Appel : `client.post(\`/sites/${siteId}/funnels\`, { name, steps })`
   - annotations : `readOnlyHint: false, destructiveHint: false, idempotentHint: false`

3. Implémenter `rybbit_update_funnel` :
   - Input : `siteId`, `funnelId` (string), `name?`, `steps?`
   - Filtrer les champs `undefined` du body
   - Appel : `client.put(\`/sites/${siteId}/funnels/${funnelId}\`, payload)`
   - annotations : `readOnlyHint: false, destructiveHint: false, idempotentHint: true`

4. Implémenter `rybbit_delete_funnel` :
   - Input : `siteId`, `funnelId`
   - Appel : `client.delete(\`/sites/${siteId}/funnels/${funnelId}\`)`
   - annotations : `readOnlyHint: false, destructiveHint: true, idempotentHint: false`

5. Implémenter `rybbit_batch_create_funnels` :
   - Input : `siteId`, `funnels` (array 1-20, chaque élément = `{ name, steps }`)
   - Boucle séquentielle avec try/catch par item
   - Retour : `{ summary: "X created, Y failed", results: [...] }`

6. Importer et enregistrer dans `src/index.ts` :
   ```typescript
   import { registerFunnelsCrudTools } from "./tools/funnels-crud.js";
   // ... après les outils originaux :
   registerFunnelsCrudTools(server, client);
   ```

**Critère de succès** : `npm run build` passe, les 4 outils sont enregistrés.

---

### Sub-agent 3 : Ajout des outils CRUD Goals

**Objectif** : Créer `src/tools/goals-crud.ts` avec 4 nouveaux outils.

**Tâches** :
1. Créer `src/tools/goals-crud.ts` exportant `registerGoalsCrudTools(server, client)`
2. Implémenter `rybbit_create_goal` :
   - Input : `siteId`, `name` (string), `type` ("page"|"event"), `value` (string)
   - Appel : `client.post(\`/sites/${siteId}/goals\`, { name, type, value })`

3. Implémenter `rybbit_update_goal` :
   - Input : `siteId`, `goalId`, `name?`, `type?`, `value?`
   - Appel : `client.put(\`/sites/${siteId}/goals/${goalId}\`, payload)`

4. Implémenter `rybbit_delete_goal` :
   - Input : `siteId`, `goalId`
   - Appel : `client.delete(\`/sites/${siteId}/goals/${goalId}\`)`

5. Implémenter `rybbit_batch_create_goals` :
   - Input : `siteId`, `goals` (array 1-30)
   - Même pattern que batch_create_funnels

6. Importer et enregistrer dans `src/index.ts`

**Critère de succès** : `npm run build` passe, 8 nouveaux outils enregistrés au total (4 funnels + 4 goals).

---

### Sub-agent 4 : Mise à jour de index.ts et instructions MCP

**Objectif** : Mettre à jour le point d'entrée avec les instructions enrichies pour le LLM.

**Tâches** :
1. Mettre à jour le `McpServer` dans `src/index.ts` :

```typescript
const server = new McpServer(
  {
    name: "rybbit-super-mcp",
    version: "1.0.0",
  },
  {
    instructions:
      "Rybbit Analytics MCP server with full CRUD support. 40 tools covering analytics, funnels, goals, and site management.\n\n" +
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
```

2. Mettre à jour le message de démarrage stderr :
```typescript
console.error("Rybbit Super MCP server running on stdio (40 tools)");
```

3. S'assurer que l'ordre d'enregistrement est logique :
   - config (sites)
   - overview
   - metrics
   - sessions
   - users
   - events
   - errors
   - performance
   - funnels (lecture)
   - funnels-crud (écriture)
   - goals (lecture)
   - goals-crud (écriture)
   - journeys

**Critère de succès** : build OK, server démarre avec le bon nom et le bon nombre d'outils.

---

### Sub-agent 5 : README.md de qualité open-source

**Objectif** : Créer un README.md complet et professionnel, inspiré du README de l'upstream mais enrichi.

**Structure du README** :

```markdown
# rybbit-super-mcp

Badges: License MIT, TypeScript, MCP SDK

> Extended MCP server for Rybbit Analytics — 40 tools with full CRUD for funnels, goals, and sites.
> Query statistics, manage funnels, create goals, and analyze performance directly from Claude Code.

## Why?

(Même principe que l'original : au lieu de checker le dashboard manuellement, le LLM query directement)
Exemples de prompts enrichis avec les CRUD :
- "Create a checkout funnel: homepage → product → cart → order confirmation"
- "What's the drop-off rate on the signup funnel?"
- "Set up conversion goals for purchases and newsletter signups"
- "Delete all test funnels"

## Quick Start

### Installation

git clone https://github.com/Tchoow/rybbit-super-mcp.git
cd rybbit-super-mcp
npm install && npm run build

### Configuration

Montrer la config pour Claude Code (~/.claude/settings.json) avec les 2 modes :

1. Via chemin local (recommandé — build une fois, utilise partout) :

{
  "mcpServers": {
    "rybbit": {
      "command": "node",
      "args": ["/absolute/path/to/rybbit-super-mcp/build/index.js"],
      "env": {
        "RYBBIT_URL": "https://your-rybbit-instance.com",
        "RYBBIT_API_KEY": "your-api-key"
      }
    }
  }
}

2. Via npx directement depuis GitHub (sans clone, sans build) :

{
  "mcpServers": {
    "rybbit": {
      "command": "npx",
      "args": ["-y", "github:Tchoow/rybbit-super-mcp"],
      "env": {
        "RYBBIT_URL": "https://your-rybbit-instance.com",
        "RYBBIT_API_KEY": "your-api-key"
      }
    }
  }
}

## Features

Tableau des 40 outils organisé par catégorie (copier le style de l'original avec le tableau Features).
Mettre en avant les 8 NOUVEAUX outils avec un badge "NEW" ou "✨".

## Tools (40)

Reprendre exactement le format tableau de l'original :
- Configuration & Site Management (6)
- Real-time & Overview (4)
- Metrics & Dimensions (2)
- Sessions (2)
- Users (4)
- Events (5)
- Errors (1)
- Performance (2)
- Funnels (3 lecture + 4 CRUD) ← ENRICHI
- Goals (2 lecture + 4 CRUD) ← ENRICHI
- Journeys (1)

## Common Parameters

Reprendre exactement la section de l'original (filters, time ranges, buckets, pagination).

## Authentication

Reprendre exactement la section de l'original (API Key vs Email/Password).

## E-commerce Examples

Section NOUVELLE montrant des exemples concrets pour PrestaShop/WooCommerce/Shopify :

### PrestaShop Checkout Funnel
{
  "siteId": "1",
  "name": "Checkout Flow",
  "steps": [
    { "type": "page", "value": "/", "name": "Homepage" },
    { "type": "page", "value": "/en/*/*.html", "name": "Product Page" },
    { "type": "event", "value": "add_to_cart", "name": "Add to Cart" },
    { "type": "page", "value": "/en/order", "name": "Checkout" },
    { "type": "page", "value": "/en/order-confirmation", "name": "Purchase" }
  ]
}

### Conversion Goals
Montrer batch create avec : Purchase, Add to Cart, Newsletter, Contact, Account Created

## Differences from upstream

Tableau clair montrant ce qui est ajouté par rapport à @nks-hub/rybbit-mcp.

## Development

npm install
npm run build
npm run dev (watch mode)

## Credits

Fork de @nks-hub/rybbit-mcp par NKS Hub. Étendu par Tchoow / Flowcode.

## License

MIT
```

**Critère de succès** : Le README est complet, bien formaté, avec des badges, des tableaux propres, et des exemples concrets.

---

### Sub-agent 6 : Build final et validation

**Objectif** : Valider que tout compile et fonctionne.

**Tâches** :
1. `npm run build` → 0 erreurs TypeScript
2. Vérifier que `build/` contient tous les fichiers JS attendus :
   - `index.js`
   - `auth.js`, `client.js`, `constants.js`, `schemas.js`
   - `tools/config.js`, `tools/overview.js`, `tools/metrics.js`, `tools/sessions.js`
   - `tools/users.js`, `tools/events.js`, `tools/errors.js`, `tools/performance.js`
   - `tools/funnels.js`, `tools/funnels-crud.js`
   - `tools/goals.js`, `tools/goals-crud.js`
   - `tools/journeys.js`
3. Vérifier que `build/index.js` commence par `#!/usr/bin/env node`
4. `chmod +x build/index.js`
5. Test de démarrage : `RYBBIT_URL=https://test.example.com RYBBIT_API_KEY=test node build/index.js` → doit afficher "Rybbit Super MCP server running on stdio (40 tools)" sur stderr sans crash
6. Vérifier que le `.gitignore` exclut bien `node_modules/` et `build/`
7. Vérifier qu'il n'y a aucune référence hardcodée à `tracking.ltcshc.com` ou à des URLs spécifiques dans le code

**Critère de succès** : Le projet est prêt à être push sur GitHub.

---

## Règles impératives pour tous les sub-agents

### TypeScript

- **Strict mode** : `strict: true` dans tsconfig. Pas de `any` implicite.
- **Types explicites** sur les retours des fonctions publiques
- Utiliser `as const` pour les annotations readOnlyHint/destructiveHint
- Cast `(data as Record<string, unknown>)` si besoin de spread sur des réponses API dont le type n'est pas connu

### Sécurité

- **Jamais** de clé API hardcodée
- **Jamais** de `console.log` des données utilisateur (seulement `console.error` pour les messages de debug)
- Toujours valider les inputs via Zod avant d'appeler l'API
- Les descriptions d'outils doivent guider le LLM vers les bons paramètres sans ambiguïté

### Conventions de nommage

- Tools : `rybbit_<verbe>_<ressource>` en snake_case (ex: `rybbit_create_funnel`, `rybbit_batch_create_goals`)
- Fichiers : kebab-case (ex: `funnels-crud.ts`, `goals-crud.ts`)
- Exports : camelCase (ex: `registerFunnelsCrudTools`)

### Descriptions des outils

Les descriptions doivent être **orientées LLM** : expliquer quand utiliser l'outil, quels sont les pré-requis, et ce que l'outil retourne. Exemples :

- **Bon** : "Create and save a new funnel in Rybbit. Requires a name and at least 2 steps. Use rybbit_list_funnels to verify creation."
- **Mauvais** : "Creates a funnel."

### Gestion d'erreurs

Toujours le même pattern try/catch avec message explicite :
```typescript
catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
```

### Pas de dépendance additionnelle

Le projet ne doit dépendre QUE de `@modelcontextprotocol/sdk` et `zod`. Pas de `axios`, pas de `node-fetch`, pas de lib HTTP tierce. Le `fetch` natif de Node 18+ est utilisé via le client existant.

---

## Résumé final

| Aspect | Valeur |
|--------|--------|
| Nombre total d'outils | 40 |
| Outils lecture | 29 |
| Outils écriture (existants) | 3 (create_site, update_site_config, delete_site) |
| Outils écriture (nouveaux) | 8 (CRUD funnels + CRUD goals + 2 batch) |
| Dépendances | 2 (MCP SDK + Zod) |
| Node minimum | 18+ |
| Auth | API Key ou Email/Password |
| Licence | MIT |
| Upstream | @nks-hub/rybbit-mcp v0.4.1 |