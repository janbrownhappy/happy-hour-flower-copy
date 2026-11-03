export default function ComingSoonBanner({ onPreRegister }) {
  return (
    <div
      className="relative w-full overflow-hidden flex flex-col items-center justify-center text-center px-6 py-24"
      style={{ minHeight: '420px' }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=1600&q=80')" }}
      />
      {/* Dark + amber overlay */}
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0" style={{ background: 'rgba(200,80,0,0.25)' }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <img
          src="https://media.base44.com/images/public/6a1cac8c2b2302908a57d02a/1f2f11c0e_Untitled1024x1024px512x512px256x256px.gif"
          alt="Happy Hour Flower"
          className="w-40 h-40 rounded-full object-cover shadow-xl border-2 border-white/20 mb-2"
        />
        <h1
          className="text-7xl sm:text-9xl font-black tracking-tight leading-none"
          style={{ color: '#f97316', textShadow: '0 2px 30px rgba(0,0,0,0.5)' }}
        >
          COMING SOON
        </h1>

        <p className="text-white text-xl sm:text-2xl font-semibold mt-2">Be first to know</p>
        <button
          onClick={onPreRegister}
          className="text-orange-400 text-lg sm:text-xl font-semibold hover:text-orange-300 transition-colors underline underline-offset-4"
        >
          Sign up now to be notified
        </button>

        <div className="mt-4 border-2 border-orange-500/70 rounded-xl px-8 py-5 max-w-md bg-black/30 backdrop-blur-sm">
          <p className="text-white font-bold text-base sm:text-lg">First 100 get premium access for the first year</p>
          <p className="text-orange-400 font-semibold text-sm sm:text-base mt-1">Standard access is FREE forever</p>
        </div>
      </div>
    </div>
  );
}