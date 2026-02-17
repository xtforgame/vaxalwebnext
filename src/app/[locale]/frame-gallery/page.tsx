import FrameGallery from '@/components/frame-gallery/FrameGallery';

export default function FrameGalleryPage() {
  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      <FrameGallery />

      {/* Overlay Content */}
      <div className="absolute top-8 left-8 z-[110] pointer-events-none max-w-md">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold tracking-wider uppercase mb-3">
          Visual Experiment 02
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Frame Portal <br />
          <span className="text-blue-400">Gallery</span>
        </h1>
        <p className="text-sm text-white/40 font-medium leading-relaxed">
          Hexagonal portal transitions with stencil-masked video scenes.
        </p>
      </div>

      <div className="absolute top-8 right-8 z-[110] pointer-events-none hidden md:block text-right">
        <div className="text-xs font-mono text-white/30">ENGINE: THREE.JS + R3F</div>
        <div className="text-xs font-mono text-white/30">STENCIL PORTAL MASKING</div>
      </div>
    </main>
  );
}
