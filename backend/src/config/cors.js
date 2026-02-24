import { env } from "./env.js";

function isLocalDevOrigin(origin) {
  if (!origin) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesConfiguredOrigin(origin, configured) {
  if (!configured) {
    return false;
  }

  if (configured === origin) {
    return true;
  }

  // Supports wildcard patterns like https://your-app-git-*.vercel.app
  if (configured.includes("*")) {
    const pattern = `^${configured.split("*").map(escapeRegex).join(".*")}$`;
    return new RegExp(pattern).test(origin);
  }

  return false;
}

export function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (env.clientUrls.some((configured) => matchesConfiguredOrigin(origin, configured))) {
    return true;
  }

  if (env.nodeEnv !== "production" && isLocalDevOrigin(origin)) {
    return true;
  }

  return false;
}
