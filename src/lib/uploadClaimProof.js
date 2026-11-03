import { base44 } from '@/api/base44Client';

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});

// Uploads a proof document for a claim, authorized by the claim's one-time proof token.
export default async function uploadClaimProof(claimId, token, file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('File must be under 10MB.');
  const base64 = await toBase64(file);
  const res = await base44.functions.invoke('claimProof', {
    action: 'upload', claimId, token, fileName: file.name, contentType: file.type, base64,
  });
  if (res.data?.error) throw new Error(res.data.error);
}