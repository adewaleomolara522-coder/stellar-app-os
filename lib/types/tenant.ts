/**
 * TypeScript types for the white-label tenant system.
 *
 * Row types match db/migrations/018_create_tenants.sql exactly.
 * Use TenantConfig (the enriched, camelCase client-facing shape) throughout
 * the application — convert from TenantRow at the DB boundary only.
 */

// ── Plan tiers ────────────────────────────────────────────────────────────────

export type TenantPlan = 'starter' | 'growth' | 'enterprise';

// ── Feature flags ─────────────────────────────────────────────────────────────

/**
 * Controls which platform capabilities are exposed per tenant.
 * All flags default to false; the seed migration enables appropriate
 * defaults per plan level.
 */
export interface TenantFeatures {
  /** Allow anonymous (wallet-less) one-time donations */
  anonymous_donations: boolean;
  /** Show the carbon credit marketplace tab */
  carbon_marketplace: boolean;
  /** Enable bulk tree purchase flow (enterprise / growth) */
  bulk_purchase: boolean;
  /** Allow new planters to register through the tenant portal */
  planter_registration: boolean;
  /** Show the global impact leaderboard */
  public_leaderboard: boolean;
  /** Per-employee impact dashboard (for corporate SSO tenants) */
  employee_impact_dashboard: boolean;
  /** Gift-a-tree feature */
  gift_trees: boolean;
  /** Allow exporting ESG PDF reports */
  esg_report_export: boolean;
}

// ── SSO config ────────────────────────────────────────────────────────────────

export type SsoProvider = 'google' | 'azure' | 'okta' | 'saml';

export interface SsoConfig {
  provider: SsoProvider;
  clientId?: string;
  tenantId?: string;         // Azure AD tenant ID
  domain?: string;           // Okta domain
  metadataUrl?: string;      // SAML metadata URL
  allowedDomains?: string[]; // Restrict login to these email domains
}

// ── DB row (snake_case, mirrors SQL schema) ───────────────────────────────────

export interface TenantRow {
  id: string;
  slug: string;
  display_name: string;
  custom_domain: string | null;
  subdomain: string | null;

  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;

  hero_headline: string | null;
  hero_subline: string | null;
  support_email: string | null;
  powered_by_label: string;

  features: TenantFeatures;

  allow_public_signup: boolean;
  sso_provider: SsoProvider | null;
  sso_config: SsoConfig | null;

  plan: TenantPlan;
  contract_address: string | null;
  monthly_tree_quota: number | null;

  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ── Application-level config (camelCase, safe to serialize to client) ─────────

export interface TenantConfig {
  id: string;
  slug: string;
  displayName: string;
  customDomain: string | null;
  subdomain: string | null;

  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Content
  heroHeadline: string | null;
  heroSubline: string | null;
  supportEmail: string | null;
  poweredByLabel: string;

  // Feature flags
  features: TenantFeatures;

  // Access
  allowPublicSignup: boolean;
  ssoProvider: SsoProvider | null;

  // Billing
  plan: TenantPlan;
  contractAddress: string | null;
  monthlyTreeQuota: number | null;
}

// ── Conversion helpers ────────────────────────────────────────────────────────

/** Convert a DB row to the application-level TenantConfig. */
export function rowToConfig(row: TenantRow): TenantConfig {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    customDomain: row.custom_domain,
    subdomain: row.subdomain,

    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,

    heroHeadline: row.hero_headline,
    heroSubline: row.hero_subline,
    supportEmail: row.support_email,
    poweredByLabel: row.powered_by_label,

    features: row.features,

    allowPublicSignup: row.allow_public_signup,
    ssoProvider: row.sso_provider,

    plan: row.plan,
    contractAddress: row.contract_address,
    monthlyTreeQuota: row.monthly_tree_quota,
  };
}

// ── API request/response shapes ───────────────────────────────────────────────

export interface CreateTenantRequest {
  slug: string;
  displayName: string;
  subdomain?: string;
  customDomain?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  heroHeadline?: string;
  heroSubline?: string;
  supportEmail?: string;
  plan?: TenantPlan;
  features?: Partial<TenantFeatures>;
  allowPublicSignup?: boolean;
  ssoProvider?: SsoProvider;
  ssoConfig?: SsoConfig;
}

export interface UpdateTenantRequest extends Partial<CreateTenantRequest> {
  isActive?: boolean;
  contractAddress?: string;
  monthlyTreeQuota?: number | null;
}

// ── Default feature sets by plan ──────────────────────────────────────────────

export const DEFAULT_FEATURES: Record<TenantPlan, TenantFeatures> = {
  starter: {
    anonymous_donations: true,
    carbon_marketplace: false,
    bulk_purchase: false,
    planter_registration: false,
    public_leaderboard: true,
    employee_impact_dashboard: false,
    gift_trees: true,
    esg_report_export: false,
  },
  growth: {
    anonymous_donations: true,
    carbon_marketplace: false,
    bulk_purchase: true,
    planter_registration: false,
    public_leaderboard: true,
    employee_impact_dashboard: true,
    gift_trees: true,
    esg_report_export: true,
  },
  enterprise: {
    anonymous_donations: true,
    carbon_marketplace: true,
    bulk_purchase: true,
    planter_registration: true,
    public_leaderboard: true,
    employee_impact_dashboard: true,
    gift_trees: true,
    esg_report_export: true,
  },
};

/** The Harvesta platform's own tenant slug — used as the fallback. */
export const HARVESTA_TENANT_SLUG = 'harvesta';
