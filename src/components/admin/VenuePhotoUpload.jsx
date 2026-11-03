import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { buildPhotoProvenance } from '@/lib/provenance';
import { compressAndUpload } from '@/lib/imageUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function VenuePhotoUpload({ venue, onSuccess, onClose }) {
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, previewUrl }
  const [existingPhotos, setExistingPhotos] = useState(venue.photo_urls?.filter(Boolean) || []);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const valid = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setError('Please select image files only'); continue; }
      valid.push(file);
    }

    valid.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedFiles(prev => [...prev, { file, previewUrl: ev.target?.result }]);
      reader.readAsDataURL(file);
    });
    if (valid.length) setError('');
    e.target.value = '';
  };

  const removeSelected = (idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  const removeExisting = (idx) => setExistingPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleUpload = async () => {
    setUploading(true);
    setError('');
    try {
      const uploadedUrls = [];
      const thumbs = { ...(venue.photo_thumbs || {}) };
      for (const { file } of selectedFiles) {
        const { url, thumbUrl } = await compressAndUpload(file, setStage);
        if (url) { uploadedUrls.push(url); thumbs[url] = thumbUrl; }
      }

      const photoUrls = [...existingPhotos, ...uploadedUrls].filter(Boolean);
      await base44.entities.Venue.update(venue.id, {
        photo_urls: photoUrls,
        photo_thumbs: thumbs,
        // Admin-uploaded photos are protected from the auto photo fetcher.
        photo_provenance: buildPhotoProvenance(venue, photoUrls, 'hhf_admin'),
      });

      onSuccess();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const hasChanges = selectedFiles.length > 0 || existingPhotos.length !== (venue.photo_urls?.filter(Boolean).length || 0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Photos for {venue.name}</DialogTitle>
          <DialogDescription>
            Upload multiple photos at once. New photos are added to the gallery — existing ones are kept unless you remove them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing photos */}
          {existingPhotos.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Current Photos ({existingPhotos.length})
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {existingPhotos.map((url, i) => (
                  <div key={url + i} className="relative group">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeExisting(i)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New photos to add */}
          <div>
            <Label className="mb-2 block">Add New Photos</Label>
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="relative group">
                    <img src={f.previewUrl} alt="Preview" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeSelected(i)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select one or more images</p>
                <p className="text-xs text-muted-foreground">Images are optimized automatically</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Select Files</span>
                  </Button>
                </Label>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!hasChanges || uploading}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {stage === 'optimizing' ? 'Optimizing…' : 'Saving...'}</>
            ) : (
              <><CheckCircle className="w-4 h-4 mr-2" /> Save Photos</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}