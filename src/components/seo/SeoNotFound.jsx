import { Link } from 'react-router-dom';

export default function SeoNotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-bold text-gray-900 mb-3">Page not found</h1>
      <Link to="/happy-hour" className="text-amber-700 font-semibold underline">Browse happy hours by city</Link>
    </div>
  );
}