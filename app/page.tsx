"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Cesium
const CesiumViewerComponent = dynamic(
  () =>
    import("@/components/cesium-viewer").then(
      (mod) => mod.CesiumViewerComponent,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Initializing viewer...</div>
      </div>
    ),
  },
);

export default function Page() {
  return (
    <main className="w-full h-screen">
      <CesiumViewerComponent />
    </main>
  );
}
