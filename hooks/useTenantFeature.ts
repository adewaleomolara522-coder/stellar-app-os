/**
 * useTenantFeature — client-side feature flag hook.
 *
 * Returns true if the current tenant has the specified feature enabled.
 * Safely returns false when called outside a TenantProvider tree (e.g.
 * during SSR or in components that haven't been wrapped yet).
 *
 * Usage:
 *   const canBulkBuy = useTenantFeature('bulk_purchase');
 *   if (!canBulkBuy) return <UpgradePrompt />;
 *
 * For gating entire page sections:
 *   <TenantFeatureGate feature="carbon_marketplace">
 *     <MarketplaceGrid />
 *   </TenantFeatureGate>
 */

import { useTenantSafe } from '@/contexts/TenantContext';
import type { TenantFeatures } from '@/lib/types/tenant';

/**
 * Returns true if the current tenant has the given feature enabled.
 * Returns false (safe default) if no TenantProvider is in the tree.
 */
export function useTenantFeature(feature: keyof TenantFeatures): boolean {
  const ctx = useTenantSafe();
  if (!ctx) return false;
  return ctx.tenant.features[feature] === true;
}

/**
 * Returns the full feature flags object for the current tenant.
 * Useful when checking multiple flags in one place.
 */
export function useTenantFeatures(): TenantFeatures | null {
  const ctx = useTenantSafe();
  return ctx?.tenant.features ?? null;
}

/**
 * Returns the current tenant's plan.
 * Useful for rendering plan-specific upgrade prompts.
 */
export function useTenantPlan() {
  const ctx = useTenantSafe();
  return ctx?.tenant.plan ?? 'starter';
}

// ── React component gate ──────────────────────────────────────────────────────

import React from 'react';

export interface TenantFeatureGateProps {
  /** The feature flag to check. */
  feature: keyof TenantFeatures;
  /** Rendered when the feature is enabled. */
  children: React.ReactNode;
  /** Rendered when the feature is disabled. Defaults to null. */
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders `children` only when the tenant has `feature` enabled.
 *
 * @example
 * <TenantFeatureGate feature="bulk_purchase" fallback={<UpgradeBanner />}>
 *   <BulkPurchaseFlow />
 * </TenantFeatureGate>
 */
export function TenantFeatureGate({
  feature,
  children,
  fallback = null,
}: TenantFeatureGateProps): React.ReactElement | null {
  const enabled = useTenantFeature(feature);
  return (enabled ? children : fallback) as React.ReactElement | null;
}
