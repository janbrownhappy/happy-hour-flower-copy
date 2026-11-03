import { FileText, Upload, X } from 'lucide-react';

// Simple file picker for proof documents (PDF or image, max 10MB).
export default function ProofFileInput({ file, onChange }) {
  if (file) {
    return (
      <div className="flex items-center gap-2 border border-green-300 bg-green-50 rounded-xl px-3 py-3 text-sm text-green-800">
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span className="truncate flex-1">{file.name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-green-700 hover:text-green-900" aria-label="Remove file">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return (
    <label className="flex flex-col items-center gap-1 border-2 border-dashed border-amber-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400">
      <Upload className="w-5 h-5 text-amber-500" />
      <span className="text-sm font-semibold text-amber-900">Choose a file</span>
      <span className="text-xs text-amber-900/60">PDF or image, up to 10MB</span>
      <input
        type="file"
        accept="image/*,.pdf"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && f.size > 10 * 1024 * 1024) { alert('File must be under 10MB.'); return; }
          onChange(f || null);
        }}
      />
    </label>
  );
}