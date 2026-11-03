import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Encodes ONLY the short URL. High error correction (H), 4-module quiet zone, pure black on white.
const OPTS = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#000000', light: '#FFFFFF' } };

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href; a.download = filename; a.click();
}

export default function QrImage({ url, qrId, showActions = true }) {
  const [preview, setPreview] = useState('');
  const [withLabel, setWithLabel] = useState(true);
  const { toast } = useToast();

  useEffect(() => { QRCode.toDataURL(url, { ...OPTS, width: 320 }).then(setPreview); }, [url]);

  const downloadPng = async () => {
    const qr = await QRCode.toCanvas(document.createElement('canvas'), url, { ...OPTS, width: 2048 });
    const canvas = document.createElement('canvas');
    canvas.width = qr.width; canvas.height = qr.height + (withLabel ? 160 : 0);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qr, 0, 0);
    if (withLabel) {
      ctx.fillStyle = '#000000'; ctx.font = 'bold 72px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(url.replace(/^https?:\/\//, ''), canvas.width / 2, qr.height + 90);
    }
    download(canvas.toDataURL('image/png'), `${qrId}.png`);
  };

  const downloadSvg = async () => {
    let svg = await QRCode.toString(url, { ...OPTS, type: 'svg' });
    if (withLabel) {
      const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] || 33);
      const h = size + 4;
      svg = svg.replace(/viewBox="0 0 (\d+) (\d+)"/, `viewBox="0 0 ${size} ${h}"`)
        .replace('</svg>', `<rect x="0" y="${size}" width="${size}" height="4" fill="#FFFFFF"/><text x="${size / 2}" y="${size + 2.2}" font-family="sans-serif" font-size="1.8" font-weight="bold" text-anchor="middle" fill="#000000">${url.replace(/^https?:\/\//, '')}</text></svg>`);
    }
    download(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })), `${qrId}.svg`);
  };

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center">
        {preview && <img src={preview} alt={`QR code for ${url}`} className="w-56 h-56" />}
        <p className="text-sm font-mono mt-2 allow-select">{url.replace(/^https?:\/\//, '')}</p>
      </div>
      {showActions && (
        <>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withLabel} onChange={(e) => setWithLabel(e.target.checked)} /> Print short URL below QR</label>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={downloadPng}><Download /> PNG</Button>
            <Button size="sm" variant="outline" onClick={downloadSvg}><Download /> SVG</Button>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); }}><Copy /> Copy Link</Button>
          </div>
        </>
      )}
    </div>
  );
}