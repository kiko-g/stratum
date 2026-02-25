"use client";

import { useParams, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getSceneById } from "@/lib/scenes";

const CesiumViewerComponent = dynamic(
  () =>
    import("@/components/cesium-viewer").then((mod) => mod.CesiumViewerComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-lg">Initializing viewer...</div>
      </div>
    ),
  },
);

export default function ViewScenePage() {
  const params = useParams();
  const sceneId = params?.sceneId as string | undefined;
  const scene = sceneId ? getSceneById(sceneId) : undefined;

  if (!scene) {
    notFound();
  }

  return (
    <main className="w-full h-screen">
      <CesiumViewerComponent tilesetUrl={scene.tilesetUrl} />
    </main>
  );
}
