import TextSlowCutInScene from '@/components/text-slow-cut-in/TextSlowCutInScene';

export default function TextSlowCutInPage() {
  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      <TextSlowCutInScene />

      {/* Overlay Content */}
      <div className="absolute top-8 left-8 z-[110] pointer-events-none max-w-md">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold tracking-wider uppercase mb-3">
          Visual Experiment 08
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Text Slow <br />
          <span className="text-yellow-400">Cut-In</span>
        </h1>
        <p className="text-sm text-white/40 font-medium leading-relaxed">
          Product launch style animated text with gradient colors and dynamic motion.
        </p>
      </div>

      <div className="absolute top-8 right-8 z-[110] pointer-events-none hidden md:block text-right">
        <div className="text-xs font-mono text-white/30">ENGINE: THREE.JS + R3F</div>
        <div className="text-xs font-mono text-white/30">TROIKA SDF TEXT</div>
      </div>
    </main>
  );
}
