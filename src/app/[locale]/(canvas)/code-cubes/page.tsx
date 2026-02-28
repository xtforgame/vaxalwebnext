import CodeCubesScene from '@/components/code-cubes/CodeCubesScene';

export default function CodeCubesPage() {
  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      <CodeCubesScene />

      {/* Overlay Content */}
      <div className="absolute top-8 left-8 z-[110] pointer-events-none max-w-md">
        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold tracking-wider uppercase mb-3">
          Visual Experiment 05
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Code <br />
          <span className="text-purple-400">Cubes</span>
        </h1>
        <p className="text-sm text-white/40 font-medium leading-relaxed">
          Raymarched glowing towers with code texture and lightning bolts.
        </p>
      </div>

      <div className="absolute top-8 right-8 z-[110] pointer-events-none hidden md:block text-right">
        <div className="text-xs font-mono text-white/30">ENGINE: THREE.JS + R3F</div>
        <div className="text-xs font-mono text-white/30">MULTI-PASS SHADERTOY PORT</div>
      </div>
    </main>
  );
}
