'use client';

/**
 * WhiteLabelShell
 *
 * Layout wrapper rendered for white-label tenants. Replaces the default
 * Harvesta Header/Footer with tenant-branded equivalents, while keeping
 * the content slot untouched so all existing pages work without changes.
 *
 * Usage:
 *   <WhiteLabelShell>
 *     {children}
 *   </WhiteLabelShell>
 *
 * When the current tenant is Harvesta itself, this component transparently
 * renders children with the default layout.
 */

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TreePine, Mail, ExternalLink } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';

// ── Tenant-branded header ─────────────────────────────────────────────────────

function TenantHeader() {
  const { tenant, isHarvesta } = useTenant();

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-white/5',
        'bg-stellar-navy/90 backdrop-blur-md',
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo / brand */}
        <Link href="/" className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <Image
              src={tenant.logoUrl}
              alt={`${tenant.displayName} logo`}
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
          ) : (
            <div className="flex items-center gap-2">
              <TreePine className="h-6 w-6 text-stellar-blue" />
              <span className="text-lg font-semibold text-white">
                {tenant.displayName}
              </span>
            </div>
          )}
        </Link>

        {/* Nav links — scoped to available features */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/projects">Projects</NavLink>
          {/* These links only render if the feature flag is enabled */}
          <FeatureNavLink feature="carbon_marketplace" href="/marketplace">
            Marketplace
          </FeatureNavLink>
          <FeatureNavLink feature="public_leaderboard" href="/leaderboard">
            Leaderboard
          </FeatureNavLink>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-3">
          {!isHarvesta && tenant.supportEmail && (
            <a
              href={`mailto:${tenant.supportEmail}`}
              className="hidden items-center gap-1 text-sm text-white/50 hover:text-white transition-colors md:flex"
            >
              <Mail className="h-3.5 w-3.5" />
              Support
            </a>
          )}
          <Link
            href="/dashboard"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-stellar-blue text-white hover:bg-stellar-blue/90',
            )}
          >
            My Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Small nav helper components ───────────────────────────────────────────────

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-white/70 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}

function FeatureNavLink({
  href,
  feature,
  children,
}: {
  href: string;
  feature: keyof ReturnType<typeof useTenant>['tenant']['features'];
  children: React.ReactNode;
}) {
  const { hasFeature } = useTenant();
  if (!hasFeature(feature)) return null;
  return <NavLink href={href}>{children}</NavLink>;
}

// ── Tenant-branded footer ─────────────────────────────────────────────────────

function TenantFooter() {
  const { tenant, isHarvesta } = useTenant();

  return (
    <footer className="mt-auto border-t border-white/5 bg-stellar-navy/60 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Brand mark */}
          <div className="flex items-center gap-2 text-sm text-white/40">
            {tenant.logoUrl ? (
              <Image
                src={tenant.logoUrl}
                alt={tenant.displayName}
                width={80}
                height={20}
                className="h-5 w-auto object-contain opacity-50"
              />
            ) : (
              <span>{tenant.displayName}</span>
            )}
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 text-xs text-white/30">
            <Link href="/terms-of-service" className="hover:text-white/60 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              Privacy
            </Link>
            {tenant.supportEmail && (
              <a
                href={`mailto:${tenant.supportEmail}`}
                className="hover:text-white/60 transition-colors"
              >
                Contact
              </a>
            )}
          </nav>

          {/* "Powered by" attribution — hidden on enterprise plan if desired */}
          {!isHarvesta && (
            <a
              href="https://harvesta.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-white/20 hover:text-white/50 transition-colors"
            >
              {tenant.poweredByLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

// ── Shell wrapper ─────────────────────────────────────────────────────────────

export interface WhiteLabelShellProps {
  children: React.ReactNode;
  /** When true, the tenant header/footer are omitted (e.g. for embed mode). */
  bare?: boolean;
}

/**
 * WhiteLabelShell wraps page content with a tenant-branded header and footer.
 *
 * For the default Harvesta tenant it renders identically to the standard
 * layout — partners get their own branding automatically.
 */
export function WhiteLabelShell({ children, bare = false }: WhiteLabelShellProps) {
  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-stellar-navy">
      <TenantHeader />
      <main className="flex-1">{children}</main>
      <TenantFooter />
    </div>
  );
}
