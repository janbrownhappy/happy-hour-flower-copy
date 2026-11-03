import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Code, Mail, CheckCircle, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { EMAIL_CATALOG, EMAIL_CATALOG_BY_NAME, previewWithSampleData } from "@/lib/emailCatalog";

const TEMPLATE_VARIABLES = Object.fromEntries(EMAIL_CATALOG.map((e) => [e.name, e.variables]));
const TEMPLATE_LABELS = Object.fromEntries(EMAIL_CATALOG.map((e) => [e.name, e.label]));

export default function EmailTemplatesAdmin({ initialTemplateName = null, onConsumeInitial } = {}) {
  const [editingTemplate, setEditingTemplate] = useState(null); // null = list view
  const queryClient = useQueryClient();

  const { data: dbTemplates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => base44.entities.EmailTemplate.list('', 200),
  });

  // Merge the catalog (every known email) with what's in the DB. Catalog entries
  // that don't yet have a DB record show as "Not created" and can be created.
  const dbByName = Object.fromEntries(dbTemplates.map((t) => [t.name, t]));
  const catalogNames = new Set(EMAIL_CATALOG.map((e) => e.name));
  const templates = [
    ...EMAIL_CATALOG.map((e) => dbByName[e.name] || { name: e.name, subject: '', body: '', description: e.description, is_active: false, _missing: true }),
    // Any DB templates not in the catalog (custom ones) still appear
    ...dbTemplates.filter((t) => !catalogNames.has(t.name)),
  ];

  // When arriving from the "Automatic Emails" screen with a specific email
  // requested, open that template's editor directly (once data has loaded).
  useEffect(() => {
    if (!initialTemplateName || isLoading) return;
    const target = templates.find((t) => t.name === initialTemplateName);
    if (target) setEditingTemplate(target);
    onConsumeInitial?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateName, isLoading]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success("Template saved");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setEditingTemplate(null);
      toast.success("Template created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success("Template deleted");
    },
  });

  const handleSave = (templateData) => {
    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, data: templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Delete this template? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  if (editingTemplate !== null) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onSave={handleSave}
        onBack={() => setEditingTemplate(null)}
        saving={updateMutation.isPending || createMutation.isPending}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Edit the subject lines and content of automated emails — no code changes needed.
          </p>
        </div>
        <Button onClick={() => setEditingTemplate({})}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates…</div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id || template.name} className="border rounded-xl p-5 bg-card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-base">
                    {TEMPLATE_LABELS[template.name] || template.name}
                  </span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono">
                    {template.name}
                  </code>
                  {template._missing ? (
                    <Badge variant="outline" className="border-dashed text-muted-foreground">Not created yet</Badge>
                  ) : template.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                )}
                {!template._missing && (
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide mr-2">Subject:</span>
                    {template.subject}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(TEMPLATE_VARIABLES[template.name] || []).map(v => (
                    <span key={v} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                  <Edit className="w-4 h-4 mr-1.5" /> {template._missing ? 'Create' : 'Edit'}
                </Button>
                {!template._missing && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No email templates yet. Create your first one!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onBack, saving }) {
  const isNew = !template?.id;
  // A catalog-backed entry has a known name even before it exists in the DB —
  // lock the identifier so it always matches what the code looks up.
  const isCatalogEntry = !!(template?.name && EMAIL_CATALOG_BY_NAME[template.name]);
  const nameLocked = !isNew || isCatalogEntry;
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    description: template?.description || EMAIL_CATALOG_BY_NAME[template?.name]?.description || '',
    is_active: template?.is_active ?? true,
  });
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'html' | 'preview'
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const variables = TEMPLATE_VARIABLES[formData.name] || [];

  const handleSave = () => {
    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const insertVariable = (v) => {
    const tag = `{{${v}}}`;
    if (editorMode === 'visual') {
      // Append as plain text inside a span so Quill treats it as content
      setFormData(f => ({ ...f, body: f.body + `<span>${tag}</span>` }));
    } else {
      setFormData(f => ({ ...f, body: f.body + tag }));
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">
            {isNew ? 'New Template' : (TEMPLATE_LABELS[formData.name] || formData.name || 'Edit Template')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(v) => setFormData(f => ({ ...f, is_active: v }))}
            id="active-toggle"
          />
          <Label htmlFor="active-toggle" className="text-sm">Active</Label>
        </div>
        <Button variant="outline" onClick={() => setFullPreviewOpen(true)} disabled={!formData.body}>
          <Eye className="w-4 h-4 mr-1.5" /> Preview
        </Button>
        <Button onClick={handleSave} disabled={saving || !formData.name || !formData.subject || !formData.body}
          className={saved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          {saved ? <><CheckCircle className="w-4 h-4 mr-1.5" /> Saved!</> : saving ? 'Saving…' : 'Save Template'}
        </Button>
      </div>

      {/* Full-screen preview modal */}
      <Dialog open={fullPreviewOpen} onOpenChange={setFullPreviewOpen}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b bg-gray-50">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500" /> Email Preview
            </DialogTitle>
            <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
              <div><span className="font-medium text-gray-600">From:</span> Happy Hour Flower &lt;hello@happyhourflower.com&gt;</div>
              <div><span className="font-medium text-gray-600">Subject:</span> {previewWithSampleData(formData.subject || '(no subject)', formData.name)}</div>
            </div>
          </DialogHeader>
          <div className="bg-gray-100 p-4">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm" style={{ minHeight: '400px' }}>
              <iframe
                srcDoc={previewWithSampleData(formData.body, formData.name)}
                className="w-full border-0"
                style={{ height: '500px' }}
                title="Full Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
          <div className="px-5 py-3 border-t bg-gray-50 text-xs text-muted-foreground">
            Showing mock data — variables like <code className="bg-muted px-1 rounded">{'{{venue_name}}'}</code> are replaced with sample values.
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: editor */}
        <div className="space-y-4">
          <div>
            <Label>Template ID <span className="text-destructive">*</span></Label>
            <Input
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., welcome_email"
              className="font-mono"
              disabled={nameLocked}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Identifier used in code — {nameLocked ? 'cannot be changed' : 'use snake_case'}
            </p>
          </div>

          <div>
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              placeholder="When is this email sent?"
            />
          </div>

          <div>
            <Label>Subject Line <span className="text-destructive">*</span></Label>
            <Input
              value={formData.subject}
              onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))}
              placeholder="e.g., Welcome to Happy Hour Flower! 🌸"
            />
            {formData.subject && (
              <p className="text-xs text-muted-foreground mt-1">
                Preview: <span className="italic">{previewWithSampleData(formData.subject, formData.name)}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Email Body <span className="text-destructive">*</span></Label>
              <div className="flex rounded-md border overflow-hidden text-xs">
                {[
                  { key: 'visual', label: 'Visual' },
                  { key: 'html', label: 'HTML', icon: <Code className="w-3 h-3 inline mr-1" /> },
                  { key: 'preview', label: 'Preview', icon: <Eye className="w-3 h-3 inline mr-1" /> },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setEditorMode(key)}
                    className={`px-3 py-1 transition-colors ${editorMode === key ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>

            {editorMode === 'visual' && (
              <div className="border rounded-md overflow-hidden bg-white" style={{ minHeight: '300px' }}>
                <ReactQuill
                  value={formData.body}
                  onChange={(val) => setFormData(f => ({ ...f, body: val }))}
                  modules={quillModules}
                  theme="snow"
                  style={{ height: '260px' }}
                  className="h-full"
                />
              </div>
            )}
            {editorMode === 'html' && (
              <Textarea
                value={formData.body}
                onChange={e => setFormData(f => ({ ...f, body: e.target.value }))}
                placeholder="<p>Hello {{user_name}},</p>"
                className="h-72 font-mono text-xs"
              />
            )}
            {editorMode === 'preview' && (
              <div className="h-72 border rounded-md overflow-auto bg-white">
                <iframe
                  srcDoc={previewWithSampleData(formData.body, formData.name)}
                  className="w-full h-full border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>

          {variables.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-2">Available Variables — click to insert:</p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="text-xs bg-white border border-amber-300 text-amber-700 px-2 py-0.5 rounded font-mono hover:bg-amber-100 transition-colors"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="hidden lg:block">
          <Label className="mb-1.5 block">Live Preview (with sample data)</Label>
          <div className="border rounded-xl overflow-hidden bg-white" style={{ height: '520px' }}>
            {/* Fake email client chrome */}
            <div className="bg-gray-100 border-b px-4 py-2 text-xs text-gray-500 space-y-0.5">
              <div><span className="font-medium text-gray-700">From:</span> Happy Hour Flower &lt;hello@happyhourflower.com&gt;</div>
              <div><span className="font-medium text-gray-700">Subject:</span> {previewWithSampleData(formData.subject || '(no subject)', formData.name)}</div>
            </div>
            <iframe
              srcDoc={formData.body ? previewWithSampleData(formData.body, formData.name) : '<p style="font-family:sans-serif;color:#999;padding:20px">Start typing your email body to see a preview…</p>'}
              className="w-full border-0"
              style={{ height: 'calc(100% - 52px)' }}
              title="Email Live Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}