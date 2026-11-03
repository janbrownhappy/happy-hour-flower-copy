import { useState } from 'react';
import { compressAndUpload } from '@/lib/imageUpload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';

/**
 * Photo picker that uploads files straight from the device (camera roll included)
 * and returns the resulting public URLs. No URL typing required.
 */
export default function PhotoUploadField({ value = [], onChange, thumbs = {}, onThumbsChange, label = 'Photos', inputId = 'photo-upload' }) {
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setError('');
    setUploading(true);
    const urls = [];
    const newThumbs = {};
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) { setError('Please choose image files only'); continue; }
        const { url, thumbUrl } = await compressAndUpload(file, setStage);
        if (url) { urls.push(url); newThumbs[url] = thumbUrl; }
      }
      if (urls.length) {
        onChange([...(value || []), ...urls]);
        onThumbsChange?.({ ...(thumbs || {}), ...newThumbs });
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx) => onChange((value || []).filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value?.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={url + i} className="relative group">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-border" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
        <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" id={inputId} />
        <Label htmlFor={inputId} className="cursor-pointer">
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <span>
              {uploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {stage === 'optimizing' ? 'Optimizing…' : 'Uploading…'}</>
                : <><Upload className="w-4 h-4 mr-2" /> Upload photos</>}
            </span>
          </Button>
        </Label>
        <p className="text-xs text-muted-foreground mt-2">Take a photo or pick from your device — images are optimized automatically</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}