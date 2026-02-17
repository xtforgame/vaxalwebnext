import GlassViewer from "@/components/3d/GlassViewer";

export default function ThreeDViewerPage() {
  
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold tracking-wider uppercase mb-4">
                Visual Experiment 01
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
                3D Layered Glass <br /> 
                <span className="text-blue-600">Mobile Viewer</span>
              </h1>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Exploring high-fidelity glass transparency and multi-layered UI visualization. 
                Interact with the 3D scene below to see how components stack along the Z-axis.
              </p>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-sm font-mono text-slate-400">ENGINE: THREE.JS + R3F</div>
              <div className="text-sm font-mono text-slate-400">VERSION: 1.0.4-GLASS-ALPHA</div>
            </div>
          </div>

          {/* 3D Viewer Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <GlassViewer />
            </div>
            
            {/* Legend / Overlay */}
            <div className="absolute bottom-8 left-8 right-8 flex flex-wrap justify-center gap-4 pointer-events-none">
              <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Refractive Transmission
              </div>
              <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Z-Axis Layering
              </div>
              <div className="px-4 py-2 bg-white/80 backdrop-blur-md rounded-full border border-white/20 shadow-lg text-xs font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Dynamic Orbiting
              </div>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Premium Shaders</h3>
              <p className="text-slate-500 text-sm">Custom MeshTransmissionMaterial implementation for realistic light refraction and thickness.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Rounded Geometry</h3>
              <p className="text-slate-500 text-sm">All 3D elements utilize custom rounded box primitives to mimic modern UI design patterns.</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Interactive Depth</h3>
              <p className="text-slate-500 text-sm">Visualizing the logical stack of a mobile application through physical spatial displacement.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
