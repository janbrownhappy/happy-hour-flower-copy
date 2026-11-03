// Shared helper: render an editable EmailTemplate from the database.
//
// Every automated email fetches its subject/body from an EmailTemplate record
// (by its stable `name`), so admins can edit the wording from the dashboard
// without any code change. This helper centralizes that lookup + variable
// substitution so all sending functions behave identically.
//
// Usage inside a backend function:
//   import { renderEmailTemplate } from '../../shared/renderEmailTemplate.ts';
//   const rendered = await renderEmailTemplate(base44, 'consumer_welcome', { first_name: 'Jane' });
//   if (!rendered) return Response.json({ skipped: true, reason: 'Template not found or inactive' });
//   await resend.emails.send({ ..., subject: rendered.subject, html: rendered.html });

function fillVariables(text, variables) {
  if (!text) return '';
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = variables?.[key];
    return val === undefined || val === null ? '' : String(val);
  });
}

// Fetches the template by name (service role), returns null if missing or inactive.
// Returns { subject, html } with all {{variables}} substituted.
export async function renderEmailTemplate(base44, name, variables = {}) {
  const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ name });
  const template = templates?.[0];
  if (!template || !template.is_active) return null;
  return {
    subject: fillVariables(template.subject, variables),
    html: fillVariables(template.body, variables),
    raw: template,
  };
}