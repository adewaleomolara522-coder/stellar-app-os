/**
 * /api/tenants — CRUD for white-label tenant management.
 *
 * All routes require platform admin authentication.
 *
 * GET    /api/tenants          — list all tenants (paginated)
 * POST   /api/tenants          — create a new tenant
 * GET    /api/tenants?slug=x   — get a single tenant by slug
 * PATCH  /api/tenants?slug=x   — update a tenant
 * DELETE /api/tenants?slug=x   — deactivate a tenant (soft-delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/client';
import { isAdminRequest } from '@/lib/auth/admin';
import { invalidateTenantCache } from '@/lib/tenant/resolver';
import {
  rowToConfig,
  DEFAULT_FEATURES,
  type TenantRow,
  type CreateTenantRequest,
  type UpdateTenantRequest,
  type TenantPlan,
} from '@/lib/types/tenant';

// ── Auth guard ────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Validate that a hex colour string is safe to write to CSS. */
function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function sanitiseColor(value: unknown, fallback: string): string {
  return isValidHex(value) ? (value as string) : fallback;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const slug = req.nextUrl.searchParams.get('slug');
  const pool = getPool();

  if (slug) {
    const result = await pool.query<TenantRow>(
      `SELECT * FROM tenants WHERE slug = $1`,
      [slug],
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    return NextResponse.json({ tenant: rowToConfig(result.rows[0]) });
  }

  // Paginated list
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const result = await pool.query<TenantRow>(
    `SELECT * FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM tenants`,
  );

  return NextResponse.json({
    tenants: result.rows.map(rowToConfig),
    total: parseInt(countResult.rows[0].count, 10),
    page,
    pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const body = (await req.json()) as CreateTenantRequest;

  if (!body.slug || !body.displayName) {
    return NextResponse.json(
      { error: 'slug and displayName are required' },
      { status: 400 },
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens only' },
      { status: 400 },
    );
  }

  const plan: TenantPlan = body.plan ?? 'starter';
  const features = { ...DEFAULT_FEATURES[plan], ...body.features };

  const pool = getPool();

  try {
    const result = await pool.query<TenantRow>(
      `INSERT INTO tenants (
        slug, display_name, subdomain, custom_domain,
        logo_url, primary_color, secondary_color, accent_color,
        hero_headline, hero_subline, support_email,
        plan, features, allow_public_signup,
        sso_provider, sso_config
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        body.slug,
        body.displayName,
        body.subdomain ?? null,
        body.customDomain ?? null,
        body.logoUrl ?? null,
        sanitiseColor(body.primaryColor, '#14B6E7'),
        sanitiseColor(body.secondaryColor, '#3E1BDB'),
        sanitiseColor(body.accentColor, '#00B36B'),
        body.heroHeadline ?? null,
        body.heroSubline ?? null,
        body.supportEmail ?? null,
        plan,
        JSON.stringify(features),
        body.allowPublicSignup ?? false,
        body.ssoProvider ?? null,
        body.ssoConfig ? JSON.stringify(body.ssoConfig) : null,
      ],
    );

    return NextResponse.json(
      { tenant: rowToConfig(result.rows[0]) },
      { status: 201 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique')) {
      return NextResponse.json(
        { error: 'A tenant with that slug, subdomain, or domain already exists' },
        { status: 409 },
      );
    }
    throw err;
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug query param required' }, { status: 400 });
  }

  const body = (await req.json()) as UpdateTenantRequest;
  const pool = getPool();

  // Build SET clause dynamically from provided fields
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const addField = (col: string, val: unknown) => {
    fields.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (body.displayName !== undefined) addField('display_name', body.displayName);
  if (body.subdomain !== undefined) addField('subdomain', body.subdomain);
  if (body.customDomain !== undefined) addField('custom_domain', body.customDomain);
  if (body.logoUrl !== undefined) addField('logo_url', body.logoUrl);
  if (body.primaryColor !== undefined) addField('primary_color', sanitiseColor(body.primaryColor, '#14B6E7'));
  if (body.secondaryColor !== undefined) addField('secondary_color', sanitiseColor(body.secondaryColor, '#3E1BDB'));
  if (body.accentColor !== undefined) addField('accent_color', sanitiseColor(body.accentColor, '#00B36B'));
  if (body.heroHeadline !== undefined) addField('hero_headline', body.heroHeadline);
  if (body.heroSubline !== undefined) addField('hero_subline', body.heroSubline);
  if (body.supportEmail !== undefined) addField('support_email', body.supportEmail);
  if (body.plan !== undefined) addField('plan', body.plan);
  if (body.features !== undefined) addField('features', JSON.stringify(body.features));
  if (body.allowPublicSignup !== undefined) addField('allow_public_signup', body.allowPublicSignup);
  if (body.isActive !== undefined) addField('is_active', body.isActive);
  if (body.contractAddress !== undefined) addField('contract_address', body.contractAddress);
  if (body.monthlyTreeQuota !== undefined) addField('monthly_tree_quota', body.monthlyTreeQuota);
  if (body.ssoProvider !== undefined) addField('sso_provider', body.ssoProvider);
  if (body.ssoConfig !== undefined) addField('sso_config', JSON.stringify(body.ssoConfig));

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(slug);
  const result = await pool.query<TenantRow>(
    `UPDATE tenants SET ${fields.join(', ')} WHERE slug = $${i} RETURNING *`,
    values,
  );

  if (!result.rows.length) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Bust cache so the next request picks up the new branding
  await invalidateTenantCache(slug);

  return NextResponse.json({ tenant: rowToConfig(result.rows[0]) });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug query param required' }, { status: 400 });
  }

  if (slug === 'harvesta') {
    return NextResponse.json(
      { error: 'Cannot deactivate the root Harvesta tenant' },
      { status: 403 },
    );
  }

  const pool = getPool();
  const result = await pool.query<TenantRow>(
    `UPDATE tenants SET is_active = false WHERE slug = $1 RETURNING *`,
    [slug],
  );

  if (!result.rows.length) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  await invalidateTenantCache(slug);

  return NextResponse.json({ success: true, tenant: rowToConfig(result.rows[0]) });
}
