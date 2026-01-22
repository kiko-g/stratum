"use client";

import { useRef, useState, useCallback } from "react";
import { Viewer, Cesium3DTileset, Globe, SkyBox, SkyAtmosphere } from "resium";
import {
  Cesium3DTileset as Cesium3DTilesetClass,
  Viewer as CesiumViewer,
  Color,
  Cartesian3,
  HeadingPitchRange,
} from "cesium";
import { Button } from "@/components/ui/button";
import { Globe as GlobeIcon, RotateCcw, Layers } from "lucide-react";

// Set Cesium base URL to CDN (no account needed)
if (typeof window !== "undefined") {
  (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL =
    "https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/";
}

interface CesiumViewerProps {
  tilesetUrl?: string;
}

export function CesiumViewerComponent({
  tilesetUrl = "/data/alpha/tileset.json",
}: CesiumViewerProps) {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const tilesetRef = useRef<Cesium3DTilesetClass | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(false); // Start with globe hidden for better model view

  const zoomToTileset = useCallback(() => {
    const viewer = viewerRef.current;
    const tileset = tilesetRef.current;

    if (!viewer || !tileset) return;

    try {
      // Get the bounding sphere of the tileset
      const boundingSphere = tileset.boundingSphere;
      if (boundingSphere) {
        // Calculate a good viewing distance
        const range = boundingSphere.radius * 2.5;
        viewer.camera.viewBoundingSphere(
          boundingSphere,
          new HeadingPitchRange(0, -0.5, range),
        );
      }
    } catch (e) {
      console.warn("Could not zoom to tileset:", e);
    }
  }, []);

  const handleTilesetReady = useCallback(
    (tileset: Cesium3DTilesetClass) => {
      console.log("Tileset ready:", tileset);
      tilesetRef.current = tileset;
      setIsLoading(false);

      // Small delay to ensure everything is initialized
      setTimeout(() => {
        zoomToTileset();
      }, 100);
    },
    [zoomToTileset],
  );

  const handleTilesetError = useCallback((error: unknown) => {
    console.error("Tileset error:", error);
    setIsLoading(false);
    setError("Failed to load 3D tileset. Check if the data files exist.");
  }, []);

  const handleViewerReady = useCallback(
    (viewer: CesiumViewer) => {
      viewerRef.current = viewer;

      // Set background color for non-globe mode
      viewer.scene.backgroundColor = Color.fromCssColorString("#0f172a");
      viewer.scene.globe.show = showGlobe;
    },
    [showGlobe],
  );

  const resetCamera = useCallback(() => {
    zoomToTileset();
  }, [zoomToTileset]);

  const toggleGlobe = useCallback(() => {
    setShowGlobe((prev) => {
      const newValue = !prev;
      if (viewerRef.current) {
        viewerRef.current.scene.globe.show = newValue;
        if (!newValue) {
          viewerRef.current.scene.skyBox.show = false;
          viewerRef.current.scene.skyAtmosphere.show = false;
        } else {
          viewerRef.current.scene.skyBox.show = true;
          viewerRef.current.scene.skyAtmosphere.show = true;
        }
      }
      return newValue;
    });
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            <div className="text-white text-lg font-medium">
              Loading 3D model...
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
            <div className="text-red-400 text-lg font-medium">{error}</div>
            <p className="text-slate-400 text-sm">
              Make sure tileset.json and .b3dm files are in public/data/alpha/
            </p>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-2 flex flex-col gap-1.5 border border-slate-700/50">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleGlobe}
            title={showGlobe ? "Hide globe" : "Show globe"}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            {showGlobe ? (
              <GlobeIcon className="size-4" />
            ) : (
              <Layers className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={resetCamera}
            title="Reset camera"
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Model info badge */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
          <span className="text-emerald-400 font-medium">Stratum</span>
          <span className="mx-2 text-slate-600">|</span>
          <span>alpha</span>
        </div>
      </div>

      {/* Cesium Viewer */}
      <Viewer
        full
        ref={(e) => {
          if (e?.cesiumElement && !viewerRef.current) {
            handleViewerReady(e.cesiumElement);
          }
        }}
        timeline={false}
        animation={false}
        homeButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
      >
        <Globe show={showGlobe} />
        {!showGlobe && (
          <>
            <SkyBox show={false} />
            <SkyAtmosphere show={false} />
          </>
        )}
        <Cesium3DTileset
          url={tilesetUrl}
          onReady={handleTilesetReady}
          onError={handleTilesetError}
        />
      </Viewer>
    </div>
  );
}
