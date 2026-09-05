-- Migration 018: White-label tenant registry
-- Allows corporate partners to run branded tree sponsorship programs
-- on their own domains with custom branding and feature flags.

CREATE TABLE IF NOT EXISTS tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT        UNIQUE NOT NULL,            -- 'acme-corp' (URL-safe identifier)
  display_name     TEXT        NOT NULL,                   -- 'Acme Corporation'
  custom_domain    TEXT        UNIQUE,                     -- 'trees.acme.com' (CNAME target)
  subdomain        TEXT        UNIQUE,                     -- 'acme' → acme.harvesta.app

  -- Branding
  logo_url         TEXT,                                   -- Full URL to partner logo (SVG/PNG)
  favicon_url      TEXT,                                   -- Full URL to custom favicon
  primary_color    TEXT        NOT NULL DEFAULT '#14B6E7', -- Maps to --stellar-blue
  secondary_color  TEXT        NOT NULL DEFAULT '#3E1BDB', -- Maps to --stellar-purple
  accent_color     TEXT        NOT NULL DEFAULT '#00B36B', -- Maps to --stellar-green

  -- Content overrides
  hero_headline    TEXT,                                   -- Landing page H1
  hero_subline     TEXT,                                   -- Landing page subtext
  support_email    TEXT,                                   -- Partner support address
  powered_by_label TEXT        NOT NULL DEFAULT 'Powered by Harvesta',

  -- Feature flags (boolean fields controlling platform capabilities)
  features         JSONB       NOT NULL DEFAULT '{
    "anonymous_donations": true,
    "carbon_marketplace": false,
    "bulk_purchase": false,
    "planter_registration": false,
    "public_leaderboard": true,
    "employee_impact_dashboard": true,
    "gift_trees": true,
    "esg_report_export": true
  }',

  -- Access control
  allow_public_signup   BOOLEAN NOT NULL DEFAULT false,
  sso_provider          TEXT,                             -- 'google' | 'azure' | 'okta'
  sso_config            JSONB,                            -- Provider-specific OIDC config

  -- Stellar / billing
  plan                  TEXT    NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
  contract_address      TEXT,                             -- Partner's dedicated escrow contract
  monthly_tree_quota    INTEGER,                          -- NULL = unlimited (enterprise)

  -- Metadata
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups for hostname resolution (called on every request)
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain
  ON tenants (subdomain)
  WHERE subdomain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_active
  ON tenants (is_active)
  WHERE is_active = true;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_tenants_updated_at();

-- Seed a default Harvesta tenant so existing routes resolve correctly
INSERT INTO tenants (
  slug, display_name, subdomain, primary_color, secondary_color, accent_color,
  allow_public_signup, plan, features
) VALUES (
  'harvesta',
  'Harvesta',
  'app',
  '#14B6E7',
  '#3E1BDB',
  '#00B36B',
  true,
  'enterprise',
  '{
    "anonymous_donations": true,
    "carbon_marketplace": true,
    "bulk_purchase": true,
    "planter_registration": true,
    "public_leaderboard": true,
    "employee_impact_dashboard": true,
    "gift_trees": true,
    "esg_report_export": true
  }'
) ON CONFLICT (slug) DO NOTHING;
