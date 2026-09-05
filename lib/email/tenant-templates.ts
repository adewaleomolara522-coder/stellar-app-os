/**
 * Tenant-aware email template factory.
 *
 * Wraps the existing SendGrid integration (lib/email/sendgrid.ts) with
 * per-tenant branding: logo, primary colour, display name, and support email.
 *
 * Usage:
 *   import { sendTenantEmail } from '@/lib/email/tenant-templates';
 *
 *   await sendTenantEmail(tenant, {
 *     type: 'tree_sponsored',
 *     to: 'donor@acme.com',
 *     data: { treeName: 'Oak #1042', sponsorName: 'Alice' },
 *   });
 */

import sgMail from '@sendgrid/mail';
import type { TenantConfig } from '@/lib/types/tenant';

// Configure SendGrid key once at module level
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) sgMail.setApiKey(apiKey);

// ── Email types ───────────────────────────────────────────────────────────────

export type TenantEmailType =
  | 'tree_sponsored'       // Sponsor confirmation
  | 'tree_planted'         // Planter uploaded photo proof
  | 'tree_verified'        // Verification complete + carbon certificate
  | 'esg_report_ready'     // ESG PDF report generated
  | 'bulk_purchase_receipt' // Bulk order confirmation (enterprise)
  | 'welcome'              // New user welcome
  | 'password_reset';      // Auth flow

export interface TenantEmailPayload<T extends Record<string, unknown> = Record<string, unknown>> {
  type: TenantEmailType;
  to: string;
  subject?: string; // Override auto-generated subject
  data: T;
}

// ── HTML template builder ─────────────────────────────────────────────────────

/**
 * Build a minimal branded HTML wrapper around a content block.
 * All existing Harvesta transactional emails share this chrome.
 */
function buildHtmlWrapper(
  tenant: TenantConfig,
  subject: string,
  bodyHtml: string,
): string {
  const primary = tenant.primaryColor;
  const logoBlock = tenant.logoUrl
    ? `<img src="${tenant.logoUrl}" alt="${tenant.displayName}" style="max-height:40px;max-width:180px;display:block;margin:0 auto 24px;">`
    : `<h2 style="margin:0 0 24px;text-align:center;color:${primary};font-family:sans-serif;">${tenant.displayName}</h2>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0D0B21;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="background:#1a1830;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header band -->
          <tr>
            <td style="background:${primary};padding:24px;text-align:center;">
              ${logoBlock}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;color:#e2e8f0;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.08);
                       text-align:center;font-size:12px;color:rgba(255,255,255,0.3);">
              ${tenant.poweredByLabel}
              ${tenant.supportEmail
                ? `&nbsp;·&nbsp;<a href="mailto:${tenant.supportEmail}" style="color:${primary};">${tenant.supportEmail}</a>`
                : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── Per-type subject + body generators ───────────────────────────────────────

type BodyResult = { subject: string; bodyHtml: string };

function buildBody(
  type: TenantEmailType,
  tenant: TenantConfig,
  data: Record<string, unknown>,
): BodyResult {
  const p = tenant.primaryColor;

  switch (type) {
    case 'tree_sponsored':
      return {
        subject: `🌱 Your tree has been sponsored — ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Tree Sponsorship Confirmed!</h3>
          <p>Thank you for sponsoring <strong>${data.treeName ?? 'your tree'}</strong>.
             A planter in ${data.region ?? 'your selected region'} will plant it shortly.</p>
          <p>Your unique Tree ID: <code style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;">${data.treeId ?? '—'}</code></p>
          <p style="margin-top:24px;">
            <a href="${data.dashboardUrl ?? '#'}"
               style="background:${p};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Track Your Tree
            </a>
          </p>
        `,
      };

    case 'tree_planted':
      return {
        subject: `📸 Your tree has been planted — ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Great news — your tree is in the ground!</h3>
          <p>Planter <strong>${data.planterName ?? 'your planter'}</strong> has uploaded
             photo and GPS proof for tree <strong>${data.treeRef ?? data.treeId}</strong>.</p>
          ${data.photoUrl ? `<img src="${data.photoUrl}" alt="Tree photo" style="width:100%;border-radius:8px;margin:16px 0;">` : ''}
          <p>Verification is underway. You'll hear from us once it's confirmed.</p>
        `,
      };

    case 'tree_verified':
      return {
        subject: `✅ Tree verified + CO₂ certificate issued — ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Your tree is verified!</h3>
          <p>Tree <strong>${data.treeRef ?? data.treeId}</strong> has been independently verified.
             Your estimated CO₂ offset: <strong>${data.co2Kg ?? '—'} kg/year</strong>.</p>
          <p style="margin-top:24px;">
            <a href="${data.certificateUrl ?? '#'}"
               style="background:${p};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Download Certificate
            </a>
          </p>
        `,
      };

    case 'esg_report_ready':
      return {
        subject: `📊 Your ESG Impact Report is ready — ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">ESG Report Ready</h3>
          <p>Your ${data.period ?? 'quarterly'} ESG report for
             <strong>${data.companyName ?? tenant.displayName}</strong> is ready to download.</p>
          <ul style="color:rgba(255,255,255,0.7);">
            <li>Trees planted: <strong>${data.totalTrees ?? '—'}</strong></li>
            <li>CO₂ offset: <strong>${data.totalCo2 ?? '—'} tCO₂e</strong></li>
          </ul>
          <p style="margin-top:24px;">
            <a href="${data.reportUrl ?? '#'}"
               style="background:${p};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Download Report
            </a>
          </p>
        `,
      };

    case 'bulk_purchase_receipt':
      return {
        subject: `🌳 Bulk tree order confirmed — ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Bulk Order Confirmed</h3>
          <p>Your order of <strong>${data.quantity ?? '—'} trees</strong> has been confirmed.
             Order reference: <code style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:4px;">${data.orderId ?? '—'}</code></p>
          <p>Planters will be assigned within 48 hours.</p>
        `,
      };

    case 'welcome':
      return {
        subject: `Welcome to ${tenant.displayName}`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Welcome aboard!</h3>
          <p>Your account on <strong>${tenant.displayName}</strong>'s tree sponsorship portal is ready.</p>
          <p style="margin-top:24px;">
            <a href="${data.loginUrl ?? '#'}"
               style="background:${p};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Get Started
            </a>
          </p>
        `,
      };

    case 'password_reset':
      return {
        subject: `Reset your ${tenant.displayName} password`,
        bodyHtml: `
          <h3 style="color:${p};margin:0 0 16px;">Password Reset Request</h3>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <p style="margin-top:24px;">
            <a href="${data.resetUrl ?? '#'}"
               style="background:${p};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Reset Password
            </a>
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,0.3);">
            If you didn't request this, you can safely ignore this email.
          </p>
        `,
      };

    default:
      return {
        subject: `Notification from ${tenant.displayName}`,
        bodyHtml: `<p>${JSON.stringify(data)}</p>`,
      };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a tenant-branded transactional email via SendGrid.
 */
export async function sendTenantEmail<T extends Record<string, unknown>>(
  tenant: TenantConfig,
  payload: TenantEmailPayload<T>,
): Promise<void> {
  if (!apiKey) {
    console.warn('[tenant-email] SENDGRID_API_KEY not set — skipping email send');
    return;
  }

  const { subject: autoSubject, bodyHtml } = buildBody(
    payload.type,
    tenant,
    payload.data as Record<string, unknown>,
  );

  const subject = payload.subject ?? autoSubject;
  const html = buildHtmlWrapper(tenant, subject, bodyHtml);
  const from = tenant.supportEmail ?? process.env.SENDGRID_FROM_EMAIL ?? 'noreply@harvesta.app';

  await sgMail.send({
    to: payload.to,
    from: { email: from, name: tenant.displayName },
    subject,
    html,
  });
}
