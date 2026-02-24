import { env } from "./env.js";

function normalizeOrigin(value) {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/+$/, "");
}

function isLocalDevOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesConfiguredOrigin(origin, configured) {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedConfigured = normalizeOrigin(configured);

  if (!normalizedConfigured || !normalizedOrigin) {
    return false;
  }

  if (normalizedConfigured === normalizedOrigin) {
    return true;
  }

  // Supports wildcard patterns like https://your-app-git-*.vercel.app
  if (normalizedConfigured.includes("*")) {
    const pattern = `^${normalizedConfigured.split("*").map(escapeRegex).join(".*")}$`;
    return new RegExp(pattern).test(normalizedOrigin);
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
