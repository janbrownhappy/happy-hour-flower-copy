import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, X } from 'lucide-react';

export default function BlogImageUpload({ label = 'Featured image', value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(file_url);
    } catch (err) {
      setError(err?.message || 'Upload failed. Please try again.');
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <Label>{label}</Label>
      {value && (
        <div className="relative mt-2 w-full max-w-xs">
          <img src={value} alt="" className="w-full rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-background/90 border border-border rounded-full p-1"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL, or upload a file"
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading' : 'Upload'}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}