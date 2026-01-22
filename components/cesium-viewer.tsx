"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Viewer, Cesium3DTileset, Globe, SkyBox, SkyAtmosphere } from "resium"
import {
  Cesium3DTileset as Cesium3DTilesetClass,
  Viewer as CesiumViewer,
  Color,
  HeadingPitchRange,
  KeyboardEventModifier,
  CameraEventType,
} from "cesium"
import { Button } from "@/components/ui/button"
import { Globe as GlobeIcon, RotateCcw, Layers, Grid3x3, Move, RotateCw, ZoomIn } from "lucide-react"

// Set Cesium base URL to CDN (no account needed)
if (typeof window !== "undefined") {
  ;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL =
    "https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/"
}

type NavigationMode = "orbit" | "pan" | "zoom"

interface CesiumViewerProps {
  tilesetUrl?: string
}

export function CesiumViewerComponent({ tilesetUrl = "/data/alpha/tileset.json" }: CesiumViewerProps) {
  const viewerRef = useRef<CesiumViewer | null>(null)
  const tilesetRef = useRef<Cesium3DTilesetClass | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGlobe, setShowGlobe] = useState(false)
  const [showWireframe, setShowWireframe] = useState(false)
  const [navMode, setNavMode] = useState<NavigationMode>("orbit")

  // Configure camera controls based on navigation mode
  const configureCameraControls = useCallback((viewer: CesiumViewer, mode: NavigationMode) => {
    const controller = viewer.scene.screenSpaceCameraController

    // Reset all to defaults first
    controller.enableRotate = true
    controller.enableTranslate = true
    controller.enableZoom = true
    controller.enableTilt = true
    controller.enableLook = true

    // Configure based on mode
    switch (mode) {
      case "orbit":
        // Default orbit mode - left click rotates
        controller.rotateEventTypes = [CameraEventType.LEFT_DRAG]
        controller.translateEventTypes = [CameraEventType.RIGHT_DRAG]
        controller.zoomEventTypes = [
          CameraEventType.WHEEL,
          CameraEventType.PINCH,
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
        ]
        controller.tiltEventTypes = [CameraEventType.MIDDLE_DRAG]
        break

      case "pan":
        // Pan mode - left click translates/pans
        controller.translateEventTypes = [CameraEventType.LEFT_DRAG]
        controller.rotateEventTypes = [CameraEventType.RIGHT_DRAG]
        controller.zoomEventTypes = [
          CameraEventType.WHEEL,
          CameraEventType.PINCH,
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
        ]
        controller.tiltEventTypes = [CameraEventType.MIDDLE_DRAG]
        break

      case "zoom":
        // Zoom mode - left click drag zooms
        controller.zoomEventTypes = [CameraEventType.LEFT_DRAG, CameraEventType.WHEEL, CameraEventType.PINCH]
        controller.rotateEventTypes = [CameraEventType.RIGHT_DRAG]
        controller.translateEventTypes = [CameraEventType.MIDDLE_DRAG]
        controller.tiltEventTypes = []
        break
    }

    // Always enable Shift+drag for pan (regardless of mode)
    controller.translateEventTypes = [
      ...(Array.isArray(controller.translateEventTypes) ? controller.translateEventTypes : []),
      { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.SHIFT },
    ]

    // Zoom settings for better trackpad experience
    controller.minimumZoomDistance = 1
    controller.maximumZoomDistance = 100000
    controller.inertiaZoom = 0.5
    controller.zoomFactor = 5
  }, [])

  // Update camera controls when nav mode changes
  useEffect(() => {
    if (viewerRef.current) {
      configureCameraControls(viewerRef.current, navMode)
    }
  }, [navMode, configureCameraControls])

  // Update cursor based on navigation mode
  useEffect(() => {
    if (!containerRef.current) return

    const cursors: Record<NavigationMode, string> = {
      orbit: "grab",
      pan: "move",
      zoom: "zoom-in",
    }
    containerRef.current.style.cursor = cursors[navMode]
  }, [navMode])

  const zoomToTileset = useCallback(() => {
    const viewer = viewerRef.current
    const tileset = tilesetRef.current

    if (!viewer || !tileset) return

    try {
      const boundingSphere = tileset.boundingSphere
      if (boundingSphere) {
        const range = boundingSphere.radius * 2.5
        viewer.camera.viewBoundingSphere(boundingSphere, new HeadingPitchRange(0, -0.5, range))
      }
    } catch (e) {
      console.warn("Could not zoom to tileset:", e)
    }
  }, [])

  const handleTilesetReady = useCallback(
    (tileset: Cesium3DTilesetClass) => {
      console.log("Tileset ready:", tileset)
      tilesetRef.current = tileset
      setIsLoading(false)

      setTimeout(() => {
        zoomToTileset()
      }, 100)
    },
    [zoomToTileset]
  )

  const handleTilesetError = useCallback((error: unknown) => {
    console.error("Tileset error:", error)
    setIsLoading(false)
    setError("Failed to load 3D tileset. Check if the data files exist.")
  }, [])

  const handleViewerReady = useCallback(
    (viewer: CesiumViewer) => {
      viewerRef.current = viewer

      // Set background color for non-globe mode
      viewer.scene.backgroundColor = Color.fromCssColorString("#0f172a")
      viewer.scene.globe.show = showGlobe

      // Configure initial camera controls
      configureCameraControls(viewer, navMode)

      // Enable zoom toward cursor (improves zoom UX)
      viewer.scene.screenSpaceCameraController.enableCollisionDetection = false
    },
    [showGlobe, navMode, configureCameraControls]
  )

  const resetCamera = useCallback(() => {
    zoomToTileset()
  }, [zoomToTileset])

  const toggleGlobe = useCallback(() => {
    setShowGlobe((prev) => {
      const newValue = !prev
      if (viewerRef.current) {
        const { scene } = viewerRef.current
        scene.globe.show = newValue
        if (scene.skyBox) scene.skyBox.show = newValue
        if (scene.skyAtmosphere) scene.skyAtmosphere.show = newValue
      }
      return newValue
    })
  }, [])

  const toggleWireframe = useCallback(() => {
    setShowWireframe((prev) => {
      const newValue = !prev
      if (tilesetRef.current) {
        tilesetRef.current.debugWireframe = newValue
      }
      return newValue
    })
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            <div className="text-white text-lg font-medium">Loading 3D model...</div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
          <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
            <div className="text-red-400 text-lg font-medium">{error}</div>
            <p className="text-slate-400 text-sm">Make sure tileset.json and .b3dm files are in public/data/alpha/</p>
          </div>
        </div>
      )}

      {/* View mode controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-2 flex flex-col gap-1.5 border border-slate-700/50">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleGlobe}
            title={showGlobe ? "Hide globe" : "Show globe"}
            className="text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            {showGlobe ? <GlobeIcon className="size-4" /> : <Layers className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleWireframe}
            title={showWireframe ? "Hide wireframe" : "Show wireframe"}
            className={`hover:bg-slate-700/50 ${showWireframe ? "text-emerald-400" : "text-slate-300 hover:text-white"}`}
          >
            <Grid3x3 className="size-4" />
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

        {/* Navigation mode controls */}
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-2 flex flex-col gap-1.5 border border-slate-700/50">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setNavMode("orbit")}
            title="Orbit mode (rotate around model)"
            className={`hover:bg-slate-700/50 ${navMode === "orbit" ? "text-emerald-400 bg-slate-700/50" : "text-slate-300 hover:text-white"}`}
          >
            <RotateCw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setNavMode("pan")}
            title="Pan mode (drag to move view) - also Shift+drag"
            className={`hover:bg-slate-700/50 ${navMode === "pan" ? "text-emerald-400 bg-slate-700/50" : "text-slate-300 hover:text-white"}`}
          >
            <Move className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setNavMode("zoom")}
            title="Zoom mode (drag to zoom) - also Ctrl+drag"
            className={`hover:bg-slate-700/50 ${navMode === "zoom" ? "text-emerald-400 bg-slate-700/50" : "text-slate-300 hover:text-white"}`}
          >
            <ZoomIn className="size-4" />
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

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-slate-500 border border-slate-700/50">
          <span className="text-slate-400">Shift</span>=Pan · <span className="text-slate-400">Ctrl</span>=Zoom ·{" "}
          <span className="text-slate-400">Scroll</span>=Zoom
        </div>
      </div>

      {/* Cesium Viewer */}
      <Viewer
        full
        ref={(e) => {
          if (e?.cesiumElement && !viewerRef.current) {
            handleViewerReady(e.cesiumElement)
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
        <Cesium3DTileset url={tilesetUrl} onReady={handleTilesetReady} onError={handleTilesetError} />
      </Viewer>
    </div>
  )
}
