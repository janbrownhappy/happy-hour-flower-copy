import { base44 } from '@/api/base44Client';

// Opens a claim proof file. Private uploads are stored as a file URI and need a
// short-lived signed URL; older public uploads are plain https links.
export default async function openProofFile(proofUrl) {
  if (/^https?:\/\//.test(proofUrl)) { window.open(proofUrl, '_blank'); return; }
  const win = window.open('', '_blank');
  const { data: { signed_url } } = await base44.functions.invoke('getProofFileUrl', { file_uri: proofUrl });
  if (win) win.location.href = signed_url; else window.open(signed_url, '_blank');
}