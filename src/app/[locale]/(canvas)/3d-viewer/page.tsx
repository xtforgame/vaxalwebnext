import GlassViewer from "@/components/3d/GlassViewer";

export default function ThreeDViewerPage() {
  
  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* 3D Viewer Container */}
      <GlassViewer />

      {/* Overlay Content */}
      <div className="absolute top-12 left-12 z-[110] pointer-events-none max-w-xl">
        <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold tracking-wider uppercase mb-4">
          Visual Experiment 01
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
          3D Layered Glass <br /> 
          <span className="text-blue-600">Mobile Viewer</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium leading-relaxed">
          Exploring high-fidelity glass transparency and multi-layered UI visualization.
        </p>
      </div>

      <div className="absolute top-12 right-12 z-[110] pointer-events-none hidden md:block text-right">
        <div className="text-sm font-mono text-slate-400">ENGINE: THREE.JS + R3F</div>
        <div className="text-sm font-mono text-slate-400">VERSION: 1.1.0-RECOVERY</div>
      </div>
      
      {/* Legend / Overlay */}
      <div className="absolute bottom-12 left-0 right-0 z-[110] flex flex-wrap justify-center gap-4 pointer-events-none">
        <div className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl text-xs font-bold text-slate-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Refractive Transmission
        </div>
        <div className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl text-xs font-bold text-slate-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Z-Axis Layering
        </div>
        <div className="px-4 py-2 bg-white/60 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl text-xs font-bold text-slate-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Dynamic Orbiting
        </div>
      </div>
    </main>
  );
}
