import { base44 } from '@/api/base44Client';

const URL_RE = /(https?:\/\/[^\s,;"'<>]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s,;"'<>]*)?)/gi;

export function urlsFromText(text) {
  const found = (text.match(URL_RE) || [])
    .filter(u => !/@/.test(u))
    .map(u => (/^https?:\/\//i.test(u) ? u : `https://${u}`).replace(/[).]+$/, ''));
  return [...new Set(found)];
}

// CSV/TXT are read directly; Excel files are uploaded privately and read by the extractor.
export async function urlsFromFile(file) {
  if (!/\.xlsx?$/i.test(file.name)) return urlsFromText(await file.text());
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const res = await base44.functions.invoke('extractSheetUrls', { file_uri })
    .catch((e) => { throw new Error(e.response?.data?.error || 'Could not read the Excel file'); });
  return urlsFromText((res.data?.urls || []).join('\n'));
}