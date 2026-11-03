const SHOTS = [
  { src: "https://happyhourflower.info/__l5e/assets-v1/22edd6ea-ee75-44d1-92e5-a3d3e458bd19/venue-screen-1.jpg", caption: "Owner dashboard", alt: "Owner dashboard listing venues with tier badges" },
  { src: "https://happyhourflower.info/__l5e/assets-v1/2afc6248-ff2c-40f2-831d-a7bb09c3350f/venue-screen-2.jpg", caption: "Website & socials", alt: "Venue editor showing website and social media links" },
  { src: "https://happyhourflower.info/__l5e/assets-v1/f90c9e8a-61a2-4289-8785-040e2d18bb46/venue-screen-3.jpg", caption: "Amenities", alt: "Amenities manager showing active amenities selected for a venue" },
  { src: "https://happyhourflower.info/__l5e/assets-v1/b0e336dc-8bc0-4208-8794-38a00cbda22c/venue-screen-4.jpg", caption: "Reservations", alt: "Reservation policy picker with walk-ins, accepted, and required options" },
  { src: "https://happyhourflower.info/__l5e/assets-v1/bc0c762c-87c0-475d-ab61-051e017dec36/venue-screen-5.jpg", caption: "Photos", alt: "Photo manager with uploaded venue photos" },
  { src: "https://happyhourflower.info/__l5e/assets-v1/812d7182-d596-4c53-92af-e17cb963c79e/venue-screen-6.jpg", caption: "Message your fans", alt: "Send message to fans screen with push, SMS, and RCS channel options" },
];

export default function SiteOwnerDashboardShowcase() {
  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="max-w-2xl mb-12">
          <span className="inline-block bg-teal-500/10 text-teal-700 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
            Inside the owner dashboard
          </span>
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Run your venue from your phone.
          </h2>
          <p className="text-gray-600 text-lg">
            Update hours and deals, manage amenities and photos, and message your fans — all in a few taps.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {SHOTS.map((shot) => (
            <figure key={shot.caption} className="text-center">
              <img
                src={shot.src}
                alt={shot.alt}
                className="w-full rounded-2xl shadow-lg border border-gray-100"
              />
              <figcaption className="mt-3 text-sm font-semibold text-gray-700">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}