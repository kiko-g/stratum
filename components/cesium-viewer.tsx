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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  GlobeIcon,
  RotateCcwIcon,
  LayersIcon,
  Grid3x3Icon,
  MoveIcon,
  RotateCwIcon,
  ZoomInIcon,
  ZapIcon,
} from "lucide-react"

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
  const [performanceMode, setPerformanceMode] = useState(true) // Start with performance mode ON

  // Configure camera controls based on navigation mode
  const configureCameraControls = useCallback((viewer: CesiumViewer, mode: NavigationMode) => {
    const controller = viewer.scene.screenSpaceCameraController

    // Reset all enables
    controller.enableRotate = true
    controller.enableTranslate = true
    controller.enableZoom = true
    controller.enableTilt = true
    controller.enableLook = true

    // Reset all event types to empty first (critical for clean mode switching)
    controller.rotateEventTypes = []
    controller.translateEventTypes = []
    controller.zoomEventTypes = []
    controller.tiltEventTypes = []

    // Configure based on mode (Shift+drag for pan always available as fallback)
    switch (mode) {
      case "orbit":
        controller.rotateEventTypes = [CameraEventType.LEFT_DRAG]
        controller.translateEventTypes = [
          CameraEventType.RIGHT_DRAG,
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.SHIFT },
        ]
        controller.zoomEventTypes = [
          CameraEventType.WHEEL,
          CameraEventType.PINCH,
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
        ]
        controller.tiltEventTypes = [CameraEventType.MIDDLE_DRAG]
        break

      case "pan":
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
        controller.zoomEventTypes = [CameraEventType.LEFT_DRAG, CameraEventType.WHEEL, CameraEventType.PINCH]
        controller.rotateEventTypes = [CameraEventType.RIGHT_DRAG]
        controller.translateEventTypes = [CameraEventType.MIDDLE_DRAG]
        controller.tiltEventTypes = []
        break
    }

    // Zoom settings
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

  // Apply performance settings to tileset
  const applyTilesetPerformance = useCallback((tileset: Cesium3DTilesetClass, highPerf: boolean) => {
    if (highPerf) {
      // Performance mode: aggressive optimization
      tileset.maximumScreenSpaceError = 24 // Higher = less detail, better perf
      tileset.skipLevelOfDetail = true
      tileset.preferLeaves = true
      tileset.dynamicScreenSpaceError = true
      tileset.dynamicScreenSpaceErrorDensity = 0.002
      tileset.dynamicScreenSpaceErrorFactor = 8.0 // More aggressive during movement
      tileset.dynamicScreenSpaceErrorHeightFalloff = 0.25
      tileset.foveatedScreenSpaceError = true
      tileset.foveatedConeSize = 0.15
      tileset.foveatedMinimumScreenSpaceErrorRelaxation = 0.0
      tileset.immediatelyLoadDesiredLevelOfDetail = false
      tileset.cacheBytes = 256 * 1024 * 1024 // 256MB cache (less memory pressure)
      tileset.maximumCacheOverflowBytes = 128 * 1024 * 1024
      // Reduce concurrent tile loads
      tileset.loadSiblings = false
    } else {
      // Quality mode: favor detail over speed
      tileset.maximumScreenSpaceError = 4
      tileset.skipLevelOfDetail = false
      tileset.preferLeaves = false
      tileset.dynamicScreenSpaceError = false
      tileset.foveatedScreenSpaceError = false
      tileset.immediatelyLoadDesiredLevelOfDetail = true
      tileset.cacheBytes = 1024 * 1024 * 1024
      tileset.loadSiblings = true
    }
  }, [])

  const handleTilesetReady = useCallback(
    (tileset: Cesium3DTilesetClass) => {
      console.log("Tileset ready:", tileset)
      tilesetRef.current = tileset

      // Apply performance settings
      applyTilesetPerformance(tileset, performanceMode)

      setIsLoading(false)

      setTimeout(() => {
        zoomToTileset()
      }, 100)
    },
    [zoomToTileset, performanceMode, applyTilesetPerformance]
  )

  const handleTilesetError = useCallback((error: unknown) => {
    console.error("Tileset error:", error)
    setIsLoading(false)
    setError("Failed to load 3D tileset. Check if the data files exist.")
  }, [])

  // Apply scene-level performance settings
  const applyScenePerformance = useCallback((viewer: CesiumViewer, highPerf: boolean) => {
    const scene = viewer.scene

    if (highPerf) {
      // Request render mode - only render when needed
      scene.requestRenderMode = true
      scene.maximumRenderTimeChange = Infinity

      // Target frame rate (prevents over-rendering)
      viewer.targetFrameRate = 60

      // Disable expensive post-processing
      scene.postProcessStages.fxaa.enabled = false
      scene.fog.enabled = false
      scene.highDynamicRange = false

      // Disable globe entirely for pure model viewing
      scene.globe.show = false
      scene.globe.enableLighting = false
      scene.globe.showGroundAtmosphere = false
      scene.globe.depthTestAgainstTerrain = false

      // Disable sky rendering
      if (scene.skyBox) scene.skyBox.show = false
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = false
      if (scene.sun) scene.sun.show = false
      if (scene.moon) scene.moon.show = false

      // Optimize rendering pipeline
      scene.logarithmicDepthBuffer = false
      scene.useDepthPicking = false
      scene.pickTranslucentDepth = false

      // Reduce shadow complexity
      scene.shadowMap.enabled = false

      scene.debugShowFramesPerSecond = false // Set to true to debug
    } else {
      scene.requestRenderMode = false
      viewer.targetFrameRate = 60
      scene.postProcessStages.fxaa.enabled = true
      scene.fog.enabled = true
      scene.highDynamicRange = true
      scene.globe.enableLighting = true
      scene.logarithmicDepthBuffer = true
      scene.useDepthPicking = true
    }
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

      // Apply performance settings
      applyScenePerformance(viewer, performanceMode)
    },
    [showGlobe, navMode, configureCameraControls, performanceMode, applyScenePerformance]
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

  const togglePerformanceMode = useCallback(() => {
    setPerformanceMode((prev) => {
      const newValue = !prev
      if (viewerRef.current) {
        applyScenePerformance(viewerRef.current, newValue)
      }
      if (tilesetRef.current) {
        applyTilesetPerformance(tilesetRef.current, newValue)
      }
      return newValue
    })
  }, [applyScenePerformance, applyTilesetPerformance])

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

      {/* View mode controls - NO backdrop-blur for performance */}
      <TooltipProvider>
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          <div className="bg-slate-900/95 rounded-xl p-2 flex flex-col gap-1.5 border border-slate-700/50">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="glass" size="icon-sm" onClick={toggleGlobe}>
                  {showGlobe ? <GlobeIcon className="size-4" /> : <LayersIcon className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showGlobe ? "Hide globe" : "Show globe"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button variant={showWireframe ? "glass-active" : "glass"} size="icon-sm" onClick={toggleWireframe}>
                  <Grid3x3Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showWireframe ? "Hide wireframe" : "Show wireframe"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="glass" size="icon-sm" onClick={resetCamera}>
                  <RotateCcwIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset camera</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant={performanceMode ? "glass-warning" : "glass"}
                  size="icon-sm"
                  onClick={togglePerformanceMode}
                >
                  <ZapIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {performanceMode ? "Switch to quality mode" : "Switch to performance mode"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation mode controls */}
          <div className="bg-slate-900/95 rounded-xl p-2 flex flex-col gap-1.5 border border-slate-700/50">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant={navMode === "orbit" ? "glass-active" : "glass"}
                  size="icon-sm"
                  onClick={() => setNavMode("orbit")}
                >
                  <RotateCwIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Orbit mode</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant={navMode === "pan" ? "glass-active" : "glass"}
                  size="icon-sm"
                  onClick={() => setNavMode("pan")}
                >
                  <MoveIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pan mode</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant={navMode === "zoom" ? "glass-active" : "glass"}
                  size="icon-sm"
                  onClick={() => setNavMode("zoom")}
                >
                  <ZoomInIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom mode (Ctrl+drag)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Model info badge */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="bg-slate-900/95 rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700/50">
          <span className="text-emerald-400 font-medium">Stratum</span>
          <span className="mx-2 text-slate-600">|</span>
          <span>alpha</span>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-slate-900/95 rounded-lg px-3 py-1.5 text-xs text-slate-500 border border-slate-700/50">
          <span className="text-slate-400">Shift</span>=Pan · <span className="text-slate-400">Ctrl</span>=Zoom ·{" "}
          <span className="text-slate-400">Scroll</span>=Zoom
        </div>
      </div>

      {/* Cesium Viewer - optimized for performance */}
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
        shadows={false}
        requestRenderMode={performanceMode}
        maximumRenderTimeChange={performanceMode ? Infinity : undefined}
      >
        {/* Only render Globe when explicitly enabled */}
        {showGlobe && <Globe enableLighting={!performanceMode} />}
        {/* Disable sky elements in performance mode */}
        <SkyBox show={showGlobe && !performanceMode} />
        <SkyAtmosphere show={showGlobe && !performanceMode} />
        <Cesium3DTileset url={tilesetUrl} onReady={handleTilesetReady} onError={handleTilesetError} />
      </Viewer>
    </div>
  )
}
