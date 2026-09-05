'use client';

/**
 * Client-side TenantContext.
 *
 * TenantProvider (in components/providers/TenantProvider.tsx) sets this
 * context in the component tree. All client components can call
 * useTenant() to read branding and feature flags without prop drilling.
 */

import React, { createContext, useContext } from 'react';
import type { TenantConfig, TenantFeatures } from '@/lib/types/tenant';

// ── Context definition ────────────────────────────────────────────────────────

interface TenantContextValue {
  tenant: TenantConfig;
  /** Convenience: check whether a feature flag is enabled. */
  hasFeature: (flag: keyof TenantFeatures) => boolean;
  /** True when the current tenant is the root Harvesta platform. */
  isHarvesta: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);
TenantContext.displayName = 'TenantContext';

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Access the current tenant's config and branding.
 *
 * @throws if called outside a <TenantProvider> tree.
 *
 * @example
 * const { tenant, hasFeature } = useTenant();
 * if (hasFeature('bulk_purchase')) { ... }
 */
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used inside <TenantProvider>');
  }
  return ctx;
}

/**
 * Safe version — returns null if context is not available.
 * Useful in components that are shared between tenant and non-tenant trees.
 */
export function useTenantSafe(): TenantContextValue | null {
  return useContext(TenantContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export interface TenantProviderProps {
  config: TenantConfig;
  children: React.ReactNode;
}

export function TenantContextProvider({ config, children }: TenantProviderProps) {
  const value: TenantContextValue = {
    tenant: config,
    hasFeature: (flag) => config.features[flag] === true,
    isHarvesta: config.slug === 'harvesta',
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export { TenantContext };
export type { TenantContextValue };
