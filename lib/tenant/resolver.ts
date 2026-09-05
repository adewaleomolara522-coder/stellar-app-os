/**
 * Tenant resolver — maps an incoming hostname to a TenantConfig.
 *
 * Resolution order:
 *  1. Exact match on `tenants.custom_domain`  (e.g. trees.acme.com)
 *  2. Subdomain match on `tenants.subdomain`  (e.g. acme.harvesta.app → 'acme')
 *  3. Fallback to the 'harvesta' default tenant
 *
 * Results are cached in Redis (TTL: 5 minutes) to avoid a DB hit per request.
 * Cache is invalidated by the admin tenant-update API.
 */

import { getPool } from '@/lib/db/client';
import { createClient } from 'redis';
import {
  type TenantConfig,
  type TenantRow,
  rowToConfig,
  HARVESTA_TENANT_SLUG,
} from '@/lib/types/tenant';

// ── Redis cache ───────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'tenant:hostname:';
const CACHE_KEY_SLUG_PREFIX = 'tenant:slug:';

function getRedisClient() {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return createClient({ url });
}

async function getCached(key: string): Promise<TenantConfig | null> {
  try {
    const redis = getRedisClient();
    await redis.connect();
    const raw = await redis.get(key);
    await redis.disconnect();
    if (!raw) return null;
    return JSON.parse(raw) as TenantConfig;
  } catch {
    // Redis unavailable — skip cache, fall through to DB
    return null;
  }
}

async function setCache(key: string, config: TenantConfig): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.connect();
    await redis.set(key, JSON.stringify(config), { EX: CACHE_TTL_SECONDS });
    await redis.disconnect();
  } catch {
    // Non-fatal — cache miss on next request is acceptable
  }
}

/** Invalidate all cached entries for a tenant (call after admin updates). */
export async function invalidateTenantCache(slug: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.connect();
    // Delete slug-keyed entry; hostname entries will naturally expire
    await redis.del(`${CACHE_KEY_SLUG_PREFIX}${slug}`);
    await redis.disconnect();
  } catch {
    // Non-fatal
  }
}

// ── DB queries ────────────────────────────────────────────────────────────────

async function queryTenantByCustomDomain(
  domain: string,
): Promise<TenantConfig | null> {
  const pool = getPool();
  const result = await pool.query<TenantRow>(
    `SELECT * FROM tenants WHERE custom_domain = $1 AND is_active = true LIMIT 1`,
    [domain],
  );
  if (!result.rows.length) return null;
  return rowToConfig(result.rows[0]);
}

async function queryTenantBySubdomain(
  subdomain: string,
): Promise<TenantConfig | null> {
  const pool = getPool();
  const result = await pool.query<TenantRow>(
    `SELECT * FROM tenants WHERE subdomain = $1 AND is_active = true LIMIT 1`,
    [subdomain],
  );
  if (!result.rows.length) return null;
  return rowToConfig(result.rows[0]);
}

async function queryTenantBySlug(slug: string): Promise<TenantConfig | null> {
  const pool = getPool();
  const result = await pool.query<TenantRow>(
    `SELECT * FROM tenants WHERE slug = $1 AND is_active = true LIMIT 1`,
    [slug],
  );
  if (!result.rows.length) return null;
  return rowToConfig(result.rows[0]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve a TenantConfig from a request hostname.
 *
 * @param hostname - The raw `host` header value (e.g. "acme.harvesta.app" or "trees.acme.com")
 * @returns The matched TenantConfig, or the Harvesta default tenant if no match.
 */
export async function resolveTenantFromHostname(
  hostname: string,
): Promise<TenantConfig> {
  // Strip port if present
  const host = hostname.split(':')[0].toLowerCase();

  const cacheKey = `${CACHE_KEY_PREFIX}${host}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  // 1. Custom domain match
  const byDomain = await queryTenantByCustomDomain(host);
  if (byDomain) {
    await setCache(cacheKey, byDomain);
    return byDomain;
  }

  // 2. Subdomain match — extract first label from hostname
  // e.g. "acme.harvesta.app" → "acme"
  // e.g. "localhost" → skip
  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const bySubdomain = await queryTenantBySubdomain(subdomain);
    if (bySubdomain) {
      await setCache(cacheKey, bySubdomain);
      return bySubdomain;
    }
  }

  // 3. Default to Harvesta tenant
  const fallback = await queryTenantBySlug(HARVESTA_TENANT_SLUG);
  const result = fallback ?? buildHarvestaFallback();
  await setCache(cacheKey, result);
  return result;
}

/**
 * Resolve a TenantConfig directly by slug (used in admin API routes).
 */
export async function resolveTenantBySlug(
  slug: string,
): Promise<TenantConfig | null> {
  const cacheKey = `${CACHE_KEY_SLUG_PREFIX}${slug}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const config = await queryTenantBySlug(slug);
  if (config) await setCache(cacheKey, config);
  return config;
}

// ── Fallback (no DB / missing seed) ──────────────────────────────────────────

function buildHarvestaFallback(): TenantConfig {
  return {
    id: 'harvesta',
    slug: HARVESTA_TENANT_SLUG,
    displayName: 'Harvesta',
    customDomain: null,
    subdomain: 'app',
    logoUrl: null,
    faviconUrl: null,
    primaryColor: '#14B6E7',
    secondaryColor: '#3E1BDB',
    accentColor: '#00B36B',
    heroHeadline: null,
    heroSubline: null,
    supportEmail: null,
    poweredByLabel: 'Powered by Harvesta',
    features: {
      anonymous_donations: true,
      carbon_marketplace: true,
      bulk_purchase: true,
      planter_registration: true,
      public_leaderboard: true,
      employee_impact_dashboard: true,
      gift_trees: true,
      esg_report_export: true,
    },
    allowPublicSignup: true,
    ssoProvider: null,
    plan: 'enterprise',
    contractAddress: null,
    monthlyTreeQuota: null,
  };
}
