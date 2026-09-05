'use client';

/**
 * /admin/tenants — White-label tenant management page.
 *
 * Lists all tenants with branding previews, allows creating new ones,
 * editing branding/features, and deactivating partners.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Globe,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/Card';
import { Button } from '@/components/atoms/Button';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import type { TenantConfig, TenantPlan, CreateTenantRequest } from '@/lib/types/tenant';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantsResponse {
  tenants: TenantConfig[];
  total: number;
  page: number;
  pages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<TenantPlan, string> = {
  starter: 'bg-white/10 text-white/60',
  growth: 'bg-stellar-blue/20 text-stellar-blue',
  enterprise: 'bg-stellar-purple/20 text-stellar-purple',
};

function PlanBadge({ plan }: { plan: TenantPlan }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[plan]}`}
    >
      {plan}
    </span>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-4 w-4 rounded-full border border-white/10"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-white/40">{label}</span>
    </div>
  );
}

// ── Create tenant form ────────────────────────────────────────────────────────

interface CreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

function CreateTenantForm({ onCreated, onCancel }: CreateFormProps) {
  const [form, setForm] = useState<CreateTenantRequest>({
    slug: '',
    displayName: '',
    subdomain: '',
    primaryColor: '#14B6E7',
    secondaryColor: '#3E1BDB',
    accentColor: '#00B36B',
    plan: 'starter',
    allowPublicSignup: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create tenant');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof CreateTenantRequest,
    props?: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase text-white/50">{label}</label>
      <input
        {...props}
        value={(form[key] as string) ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-stellar-blue/50 focus:outline-none"
      />
    </div>
  );

  return (
    <Card className="border-white/10 bg-stellar-navy/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Plus className="h-4 w-4 text-stellar-blue" />
          New White-Label Tenant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('Slug *', 'slug', {
              placeholder: 'acme-corp',
              pattern: '[a-z0-9-]+',
              required: true,
            })}
            {field('Display Name *', 'displayName', {
              placeholder: 'Acme Corporation',
              required: true,
            })}
            {field('Subdomain', 'subdomain', { placeholder: 'acme → acme.harvesta.app' })}
            {field('Custom Domain', 'customDomain', { placeholder: 'trees.acme.com' })}
            {field('Logo URL', 'logoUrl', { placeholder: 'https://cdn.acme.com/logo.svg' })}
            {field('Support Email', 'supportEmail', {
              type: 'email',
              placeholder: 'green@acme.com',
            })}
          </div>

          {/* Brand colours */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-white/50">Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-white/60">{form.primaryColor}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-white/50">Secondary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-white/60">{form.secondaryColor}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-white/50">Accent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-white/60">{form.accentColor}</span>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase text-white/50">Plan</label>
            <select
              value={form.plan}
              onChange={(e) =>
                setForm((f) => ({ ...f, plan: e.target.value as TenantPlan }))
              }
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-stellar-blue/50 focus:outline-none"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-stellar-blue hover:bg-stellar-blue/90"
            >
              {loading ? 'Creating…' : 'Create Tenant'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Tenant row ────────────────────────────────────────────────────────────────

function TenantRow({
  tenant,
  onDeactivate,
}: {
  tenant: TenantConfig;
  onDeactivate: (slug: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/2 p-4 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-4">
        {/* Colour swatches */}
        <div className="flex flex-col gap-1">
          <div
            className="h-10 w-10 rounded-lg border border-white/10"
            style={{ background: `linear-gradient(135deg, ${tenant.primaryColor}, ${tenant.secondaryColor})` }}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{tenant.displayName}</span>
            <PlanBadge plan={tenant.plan} />
            {!tenant.id.startsWith('harvesta') && (
              tenant.customDomain ? (
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Globe className="h-3 w-3" />
                  {tenant.customDomain}
                </span>
              ) : tenant.subdomain ? (
                <span className="text-xs text-white/30">{tenant.subdomain}.harvesta.app</span>
              ) : null
            )}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-white/30">/{tenant.slug}</span>
            <ColorSwatch color={tenant.primaryColor} label="primary" />
            <ColorSwatch color={tenant.accentColor} label="accent" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Active status */}
        {tenant.slug !== 'harvesta' ? (
          <button
            onClick={() => onDeactivate(tenant.slug)}
            className="rounded p-1.5 text-white/30 hover:text-red-400 transition-colors"
            title="Deactivate tenant"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <CheckCircle className="h-4 w-4 text-stellar-green" />
        )}
        <ChevronRight className="h-4 w-4 text-white/20" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminTenantsPage() {
  const [data, setData] = useState<TenantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const handleDeactivate = async (slug: string) => {
    if (!confirm(`Deactivate tenant "${slug}"? Their branded portal will stop resolving.`)) return;
    await fetch(`/api/tenants?slug=${slug}`, { method: 'DELETE' });
    void fetchTenants();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text variant="h2" className="text-2xl font-bold text-white">
            White-Label Tenants
          </Text>
          <Text variant="muted" className="mt-1">
            Manage corporate partners running branded tree sponsorship portals.
          </Text>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="gap-2 bg-stellar-blue hover:bg-stellar-blue/90"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Tenants', value: data.total },
            {
              label: 'Enterprise',
              value: data.tenants.filter((t) => t.plan === 'enterprise').length,
            },
            {
              label: 'Growth',
              value: data.tenants.filter((t) => t.plan === 'growth').length,
            },
            {
              label: 'Custom Domains',
              value: data.tenants.filter((t) => t.customDomain).length,
            },
          ].map(({ label, value }) => (
            <Card key={label} className="border-white/5 bg-stellar-navy/40">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateTenantForm
          onCreated={() => {
            setShowCreate(false);
            void fetchTenants();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Tenant list */}
      <Card className="border-white/5 bg-stellar-navy/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="h-5 w-5 text-stellar-blue" />
            Active Tenants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="py-8 text-center text-sm text-white/30">Loading tenants…</p>
          )}
          {!loading && data?.tenants.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No tenants found.</p>
          )}
          {data?.tenants.map((tenant) => (
            <TenantRow
              key={tenant.id}
              tenant={tenant}
              onDeactivate={handleDeactivate}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
