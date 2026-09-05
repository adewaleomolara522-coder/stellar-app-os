/**
 * Server-side tenant context helpers.
 *
 * Usage in Server Components and Route Handlers:
 *
 *   import { getTenant } from '@/lib/tenant/context';
 *   const tenant = await getTenant();
 *
 * The tenant is resolved once per request by middleware which sets the
 * `x-tenant-id` request header. Route handlers and Server Components
 * read that header via next/headers.
 */

import { headers } from 'next/headers';
import { resolveTenantBySlug, resolveTenantFromHostname } from './resolver';
import type { TenantConfig } from '@/lib/types/tenant';

/** Header name written by middleware and read by server components. */
export const TENANT_ID_HEADER = 'x-tenant-id';
export const TENANT_SLUG_HEADER = 'x-tenant-slug';

/**
 * Get the current request's TenantConfig from the server context.
 *
 * Falls back to hostname-based resolution if the header is missing
 * (e.g. during local dev without middleware).
 */
export async function getTenant(): Promise<TenantConfig> {
  const headerStore = await headers();

  // Fast path: middleware set the slug header
  const slug = headerStore.get(TENANT_SLUG_HEADER);
  if (slug) {
    const config = await resolveTenantBySlug(slug);
    if (config) return config;
  }

  // Fallback: resolve from host header
  const host = headerStore.get('host') ?? 'localhost';
  return resolveTenantFromHostname(host);
}

/**
 * Convenience: get only the tenant's feature flags.
 */
export async function getTenantFeatures() {
  const tenant = await getTenant();
  return tenant.features;
}

/**
 * Check whether a specific feature is enabled for the current tenant.
 *
 * @example
 * const canBulkBuy = await isTenantFeatureEnabled('bulk_purchase');
 */
export async function isTenantFeatureEnabled(
  feature: keyof TenantConfig['features'],
): Promise<boolean> {
  const features = await getTenantFeatures();
  return features[feature] === true;
}

/**
 * Build an inline <style> block from a TenantConfig's branding colours.
 * Inject this into the document <head> at SSR time to apply tenant
 * colours without a flash of un-themed content.
 */
export function buildTenantCssVars(config: TenantConfig): string {
  return `
    :root {
      --stellar-blue:   ${config.primaryColor};
      --stellar-purple: ${config.secondaryColor};
      --stellar-green:  ${config.accentColor};
    }
  `.trim();
}
