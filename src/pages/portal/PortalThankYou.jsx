import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function PortalThankYou() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') === 'add' ? 'add' : 'claim';

  return (
    <div className="max-w-xl mx-auto px-6 py-20 text-center">
      <img
        src="https://media.base44.com/images/public/6a1f45eb9cf7513caebbab49/65d765106_HappyHourFlowerLogo.png"
        alt="Happy Hour Flower"
        className="w-24 h-24 rounded-full mx-auto mb-6 shadow-md"
      />
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-amber-600" />
      </div>
      <h1 className="font-heading text-3xl font-bold text-amber-900 mb-2">
        {type === 'add' ? 'Business submitted!' : 'Claim submitted!'}
      </h1>
      <p className="text-amber-900/70 text-lg">
        {type === 'add'
          ? "Thanks — we've received your business details. Our team will review and set up your venue, typically within 1–2 business days."
          : "Thanks — we've received your claim. Our team reviews every request, typically within 1–2 business days."}
      </p>

      <div className="bg-white border border-amber-100 rounded-2xl p-6 text-left mt-8 shadow-sm">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">What happens next</p>
        <ol className="text-sm text-amber-900/80 space-y-2 list-decimal list-inside">
          <li>Our team reviews your submission and may reach out to verify.</li>
          <li>Once approved, you'll get an email with steps to finish setting up.</li>
          <li>Download the Happy Hour Flower app to manage your venue and deals.</li>
        </ol>
      </div>

      <a href="https://happyhourflower.com" className="inline-block mt-8 text-amber-600 font-semibold hover:underline">
        Go to happyhourflower.com →
      </a>
    </div>
  );
}