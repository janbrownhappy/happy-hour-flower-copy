import imageCompression from 'browser-image-compression';
import { base44 } from '@/api/base44Client';

const toWebpName = (name) => `${(name || 'photo').replace(/\.[^.]+$/, '')}.webp`;

const compress = (file, maxPx, maxSizeMB) =>
  imageCompression(file, {
    maxWidthOrHeight: maxPx,
    maxSizeMB,
    fileType: 'image/webp',
    initialQuality: 0.8,
    useWebWorker: true,
  });

/**
 * Compresses an image (1600px / WebP / ≤400KB) plus a 400px thumbnail, uploads both.
 * onStage('optimizing' | 'uploading') lets the UI show progress.
 * Returns { url, thumbUrl }.
 */
export async function compressAndUpload(file, onStage) {
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose image files only');
  onStage?.('optimizing');
  const name = toWebpName(file.name);
  const [full, thumb] = await Promise.all([compress(file, 1600, 0.4), compress(file, 400, 0.1)]);
  onStage?.('uploading');
  const [a, b] = await Promise.all([
    base44.integrations.Core.UploadPublicFile({ file: new File([full], name, { type: 'image/webp' }) }),
    base44.integrations.Core.UploadPublicFile({ file: new File([thumb], `thumb-${name}`, { type: 'image/webp' }) }),
  ]);
  return { url: a.file_url, thumbUrl: b.file_url };
}

/** Thumbnail for a venue photo (falls back to the full image). */
export function thumbOf(venue, url) {
  if (!url) return url;
  return venue?.photo_thumbs?.[url] || url;
}