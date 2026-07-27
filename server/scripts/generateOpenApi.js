/**
 * Generate docs/openapi.yaml from Express route mounts + route files.
 * Preserves existing operation summary/description/requestBody/responses when
 * the same path+method already exists in the current OpenAPI file.
 *
 * Usage: node server/scripts/generateOpenApi.js
 */
const fs = require("fs");
const path = require("path");
const YAML = require("yamljs");

const ROOT = path.join(__dirname, "..", "..");
const SERVER_JS = path.join(ROOT, "server", "server.js");
const ROUTES_DIR = path.join(ROOT, "server", "routes");
const OUT_FILE = path.join(ROOT, "docs", "openapi.yaml");

const MOUNT_TAG = {
  "/auth": "Auth",
  "/users": "Users",
  "/applications": "Applications",
  "/announcements": "Announcements",
  "/board": "Board",
  "/sponsors": "Sponsors",
  "/departments": "Departments",
  "/site-content": "SiteContent",
  "/members": "Members",
  "/attendance": "Attendance",
  "/events": "Events",
  "/competitions": "Competitions",
  "/teams": "Teams",
  "/submissions": "Submissions",
  "/quizzes": "Quizzes",
  "/quiz_attempts": "QuizAttempts",
  "/evaluation": "Evaluation",
  "/cloud": "Cloud",
  "/upload": "Upload",
  "/admin": "Admin",
  "/suggestions": "Suggestions",
  "/seasons": "Seasons",
  "/email-templates": "EmailTemplates",
  "/android-app": "AndroidApp",
};

const AUTH_HINTS = [
  "authenticateToken",
  "adminAuth",
  "authorizeJudgingAccess",
  "verifyRole",
  "verifyRoleOrDepartment",
  "authorize",
  "verifyDepartment",
];

function middlewareImpliesAuth(middlewareSrc) {
  return AUTH_HINTS.some((h) => String(middlewareSrc || "").includes(h));
}

function joinUrl(base, rel) {
  const b = String(base || "").replace(/\/$/, "");
  let r = String(rel || "");
  if (!r || r === "/") return b || "/";
  if (!r.startsWith("/")) r = `/${r}`;
  return `${b}${r}`.replace(/\/{2,}/g, "/") || "/";
}

function toOpenApiPath(expressPath) {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function pathParams(openApiPath) {
  const names = [...openApiPath.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]);
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseMounts(serverSrc) {
  const mounts = [];
  const re =
    /router\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\(\s*['"`](\.\/routes\/[^'"`]+)['"`]\s*\)/g;
  let m;
  while ((m = re.exec(serverSrc))) {
    mounts.push({ mount: m[1], requirePath: m[2] });
  }
  return mounts;
}

function resolveRouteFile(requirePath) {
  const base = path.join(ROOT, "server", requirePath.replace(/^\.\//, ""));
  if (fs.existsSync(base)) return base;
  if (fs.existsSync(`${base}.js`)) return `${base}.js`;
  throw new Error(`Cannot resolve route module: ${requirePath}`);
}

function detectRouterLevelAuth(src) {
  // router.use(authenticateToken) / router.use(adminAuth) without a path string
  const lines = src.split(/\r?\n/);
  let required = false;
  for (const line of lines) {
    if (/router\.use\(\s*['"`]/.test(line)) continue;
    if (/router\.use\(\s*authenticateToken/.test(line)) required = true;
    if (/router\.use\(\s*adminAuth/.test(line)) required = true;
  }
  return required;
}

/** Names of const arrays that include auth middleware (e.g. adminBoard). */
function collectAuthAliasNames(src) {
  const aliases = new Set();
  const re = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = re.exec(src))) {
    if (middlewareImpliesAuth(m[2])) aliases.add(m[1]);
  }
  return aliases;
}

function routeHasAuth(rest, aliases) {
  if (middlewareImpliesAuth(rest)) return true;
  for (const name of aliases) {
    if (new RegExp(`(?:\\.\\.\\.)?\\b${name}\\b`).test(rest)) return true;
  }
  return false;
}

function parseRouteHandlers(fileSrc) {
  const src = stripComments(fileSrc);
  const routes = [];
  const nested = [];
  const aliases = collectAuthAliasNames(src);

  // router.METHOD('path', ...handlers)
  const routeRe =
    /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]\s*((?:,[\s\S]*?)?)\s*\)\s*;/g;
  let m;
  while ((m = routeRe.exec(src))) {
    const method = m[1].toLowerCase();
    const routePath = m[2];
    const rest = m[3] || "";
    routes.push({
      method,
      path: routePath,
      auth: routeHasAuth(rest, aliases),
    });
  }

  // Nested: router.use('/prefix', someRouter) where someRouter was required
  const useRe =
    /router\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  while ((m = useRe.exec(src))) {
    const prefix = m[1];
    const varName = m[2];
    const reqRe = new RegExp(
      `(?:const|let|var)\\s+${varName}\\s*=\\s*require\\(\\s*['"\`](\\.\\/[^'"\`]+)['"\`]\\s*\\)`
    );
    const reqMatch = src.match(reqRe);
    if (reqMatch) {
      nested.push({ prefix, requirePath: reqMatch[1] });
    }
  }

  return { routes, nested, routerAuth: detectRouterLevelAuth(src) };
}

function collectFromFile(absFile, pathPrefix, tag, out, seenFiles, inheritedAuth) {
  const key = path.resolve(absFile);
  if (seenFiles.has(key)) return;
  seenFiles.add(key);

  const src = fs.readFileSync(absFile, "utf8");
  const { routes, nested, routerAuth } = parseRouteHandlers(src);
  const authDefault = Boolean(inheritedAuth || routerAuth);

  for (const r of routes) {
    const full = joinUrl(pathPrefix, r.path);
    out.push({
      method: r.method,
      path: toOpenApiPath(full),
      tag,
      auth: authDefault || r.auth,
    });
  }

  for (const n of nested) {
    let nestedFile;
    if (n.requirePath.startsWith("./")) {
      nestedFile = path.join(path.dirname(absFile), n.requirePath);
      if (!nestedFile.endsWith(".js")) nestedFile += ".js";
    } else {
      nestedFile = resolveRouteFile(n.requirePath);
    }
    const nestedTag =
      n.prefix.includes("announcement") ? "CompetitionAnnouncements" : tag;
    collectFromFile(
      nestedFile,
      joinUrl(pathPrefix, n.prefix),
      nestedTag,
      out,
      seenFiles,
      authDefault
    );
  }
}

function defaultSummary(method, openApiPath) {
  const leaf = openApiPath.split("/").filter(Boolean).pop() || "root";
  return `${method.toUpperCase()} ${openApiPath}`.replace(
    /^([A-Z]+)\s/,
    (_, m) => {
      const map = {
        GET: "Get",
        POST: "Create/submit",
        PUT: "Update",
        PATCH: "Patch",
        DELETE: "Delete",
      };
      return `${map[m] || m} `;
    }
  );
}

function buildOperation(route, previous) {
  const op = previous
    ? { ...previous }
    : {
        summary: defaultSummary(route.method, route.path),
        responses: {
          "200": { description: "Success" },
        },
      };

  op.tags = [route.tag];
  const params = pathParams(route.path);
  if (params.length) {
    // Keep prior param docs when names match; otherwise replace
    const prevParams = Array.isArray(previous?.parameters)
      ? previous.parameters.filter((p) => p.in !== "path")
      : [];
    op.parameters = [...params, ...prevParams];
  } else if (previous?.parameters) {
    op.parameters = previous.parameters.filter((p) => p.in !== "path");
    if (!op.parameters.length) delete op.parameters;
  }

  if (route.auth) {
    op.security = [{ bearerAuth: [] }];
  } else {
    delete op.security;
  }

  if (!op.responses) {
    op.responses = { "200": { description: "Success" } };
  }

  return op;
}

function generate() {
  const serverSrc = fs.readFileSync(SERVER_JS, "utf8");
  const mounts = parseMounts(serverSrc);
  const collected = [];
  const seenFiles = new Set();

  for (const mount of mounts) {
    const file = resolveRouteFile(mount.requirePath);
    const tag = MOUNT_TAG[mount.mount] || mount.mount.replace(/^\//, "");
    collectFromFile(file, mount.mount, tag, collected, seenFiles, false);
  }

  // Stable order: path then method
  const methodOrder = { get: 1, post: 2, put: 3, patch: 4, delete: 5 };
  collected.sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return (methodOrder[a.method] || 9) - (methodOrder[b.method] || 9);
  });

  let previous = {};
  if (fs.existsSync(OUT_FILE)) {
    try {
      previous = YAML.load(OUT_FILE) || {};
    } catch (_) {
      previous = {};
    }
  }

  const prevPaths = previous.paths || {};
  const paths = {};

  for (const route of collected) {
    if (!paths[route.path]) paths[route.path] = {};
    const prevOp = prevPaths[route.path]?.[route.method];
    paths[route.path][route.method] = buildOperation(route, prevOp);
  }

  const tagNames = [
    ...new Set([
      ...Object.values(MOUNT_TAG),
      "CompetitionAnnouncements",
      ...collected.map((r) => r.tag),
    ]),
  ];

  const doc = {
    openapi: "3.0.3",
    info: previous.info || {
      title: "MSP-MIU Website API",
      description:
        "REST API for the MSP Tech Club MIU platform.\n\nCall `POST /auth/login` — the JWT is applied to Authorize automatically.\n",
      version: "1.0.0",
      contact: { name: "MSP Tech Club MIU", url: "https://msp-miu.tech" },
    },
    servers: previous.servers || [
      { url: "https://msp-miu.tech/api", description: "Production" },
    ],
    tags: tagNames.map((name) => ({ name })),
    components: previous.components || {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: previous.security ?? [],
    paths,
  };

  // Keep useful shared pieces
  if (previous.components?.schemas) {
    doc.components.schemas = previous.components.schemas;
  }
  if (previous.components?.parameters) {
    doc.components.parameters = previous.components.parameters;
  }

  const yaml = YAML.stringify(doc, 12, 2);
  const header = `# Generated by server/scripts/generateOpenApi.js — do not hand-edit paths.\n# Re-run: npm run docs:openapi (also runs on git pre-commit).\n`;
  fs.writeFileSync(OUT_FILE, header + yaml, "utf8");

  const pathCount = Object.keys(paths).length;
  const opCount = collected.length;
  console.log(
    `Wrote ${path.join("docs", "openapi.yaml")} (${pathCount} paths, ${opCount} operations)`
  );
}

generate();
