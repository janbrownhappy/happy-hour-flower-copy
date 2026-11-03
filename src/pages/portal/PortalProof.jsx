import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import ProofFileInput from '@/components/portal/ProofFileInput';
import uploadClaimProof from '@/lib/uploadClaimProof';

// Public page linked from the "please verify your claim" email.
export default function PortalProof() {
  const { claimId } = useParams();
  const token = new URLSearchParams(window.location.search).get('t');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    base44.functions.invoke('claimProof', { action: 'info', claimId, token })
      .then((res) => (res.data?.error ? setError(res.data.error) : setInfo(res.data)))
      .catch((e) => setError(e.response?.data?.error || 'This link is invalid or has already been used.'));
  }, [claimId, token]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await uploadClaimProof(claimId, token, file);
      setDone(true);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const wrap = (children) => <div className="max-w-xl mx-auto px-6 py-14">{children}</div>;
  if (error) return wrap(<p className="text-center text-amber-900">{error}</p>);
  if (!info) return wrap(<div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>);
  if (done) return wrap(
    <div className="text-center">
      <img
        src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png"
        alt="Happy Hour Flower"
        className="w-24 h-24 rounded-full mx-auto mb-6 shadow-md"
      />
      <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
      <h1 className="font-heading text-2xl font-bold text-amber-900">Thanks, we got it</h1>
      <p className="text-amber-900/70 mt-2">Our team will review your document and email you once your claim for {info.venue_name} is approved.</p>
      <Link to="/" className="inline-flex items-center justify-center mt-6 px-6 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700">Back to Happy Hour Flower</Link>
    </div>
  );

  return wrap(
    <>
      <img
        src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png"
        alt="Happy Hour Flower"
        className="w-24 h-24 rounded-full mx-auto mb-6 shadow-md"
      />
      <h1 className="font-heading text-3xl font-bold text-amber-900 mb-1">Verify your claim</h1>
      <p className="text-amber-900/70 mb-6">Hi {info.claimant_name}, upload proof that you represent <strong>{info.venue_name}</strong>: a business license, utility bill or lease in the business name, liquor license, or a signed letter from the owner.</p>
      <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm space-y-4">
        <ProofFileInput file={file} onChange={setFile} />
        <div className="flex items-start gap-2 text-xs text-amber-900/60">
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>Your document is stored privately and only seen by our review team.</p>
        </div>
        <Button onClick={submit} disabled={!file || submitting} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : 'Submit proof'}
        </Button>
      </div>
    </>
  );
}