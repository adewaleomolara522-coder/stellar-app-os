'use client';

/**
 * TenantProvider
 *
 * Wraps the app with:
 *  1. TenantContextProvider — makes tenant config available via useTenant()
 *  2. An injected <style> tag that overrides Stellar CSS variables with the
 *     tenant's brand colours (zero-flicker, applied before first paint)
 *
 * Usage in app/layout.tsx (Server Component):
 *
 *   import { getTenant, buildTenantCssVars } from '@/lib/tenant/context';
 *   const tenant = await getTenant();
 *   ...
 *   <TenantProvider config={tenant}>
 *     {children}
 *   </TenantProvider>
 */

import React from 'react';
import { TenantContextProvider } from '@/contexts/TenantContext';
import { buildTenantCssVars } from '@/lib/tenant/context';
import type { TenantConfig } from '@/lib/types/tenant';

export interface TenantProviderProps {
  config: TenantConfig;
  children: React.ReactNode;
}

export function TenantProvider({ config, children }: TenantProviderProps) {
  const cssVars = buildTenantCssVars(config);

  return (
    <TenantContextProvider config={config}>
      {/* Inject tenant brand colours as CSS custom-property overrides.
          dangerouslySetInnerHTML is safe here — values come from our own DB,
          not from user input. Sanitise hex values at write time. */}
      <style
        dangerouslySetInnerHTML={{ __html: cssVars }}
        data-tenant={config.slug}
      />
      {children}
    </TenantContextProvider>
  );
}
