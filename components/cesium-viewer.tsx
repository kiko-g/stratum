"use client"

import { useRef, useState, useCallback, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Viewer, Cesium3DTileset, Globe, SkyBox, SkyAtmosphere, ScreenSpaceCameraController } from "resium"
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

const DEMO_TILESET_URL = "/data/alpha/tileset.json"

const NAV_CURSORS: Record<NavigationMode, string> = {
  orbit: "grab",
  pan: "grab",
  zoom: "zoom-in",
}

const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 15a9 9 0 1 0 2.13-9.36L3.5 8'/%3E%3Cpolyline points='3.5 3 3.5 8 8.5 8'/%3E%3C/svg%3E") 12 12, auto`

function getSceneDisplayNameFromUrl(url: string): string {
  const match = url.match(/\/([^/]+)\/tileset\.json$/i)
  const segment = match ? match[1] : "model"
  return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
}

function getDataPathFromUrl(url: string): string {
  const path = url.startsWith("/") ? url.slice(1) : url
  const dir = path.replace(/\/tileset\.json$/i, "/")
  return `public/${dir}`
}

function ecoModeFromSearchParams(searchParams: URLSearchParams): boolean {
  const p = searchParams.get("eco")
  if (p === "false") return false
  if (p === "true") return true
  return true
}

export function CesiumViewerComponent({ tilesetUrl = DEMO_TILESET_URL }: CesiumViewerProps) {
  const searchParams = useSearchParams()
  const sceneDisplayName = getSceneDisplayNameFromUrl(tilesetUrl)
  const dataPath = getDataPathFromUrl(tilesetUrl)
  const viewerRef = useRef<CesiumViewer | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tilesetRef = useRef<Cesium3DTilesetClass | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGlobe, setShowGlobe] = useState(false)
  const [showWireframe, setShowWireframe] = useState(false)
  const [navMode, setNavMode] = useState<NavigationMode>("pan")
  const [isPanDragging, setIsPanDragging] = useState(false)
  const [isRotateDragging, setIsRotateDragging] = useState(false)
  const [ecoMode, setEcoMode] = useState(() => ecoModeFromSearchParams(searchParams))

  useEffect(() => {
    setEcoMode(ecoModeFromSearchParams(searchParams))
  }, [searchParams])

  const controllerProps = useMemo(() => {
    const zoomCommon = [
      CameraEventType.WHEEL,
      CameraEventType.PINCH,
      { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
    ]
    switch (navMode) {
      case "orbit":
        return {
          rotateEventTypes: [CameraEventType.LEFT_DRAG],
          translateEventTypes: [
            CameraEventType.RIGHT_DRAG,
            { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.SHIFT },
          ],
          zoomEventTypes: zoomCommon,
          tiltEventTypes: [CameraEventType.MIDDLE_DRAG],
        }
      case "pan":
        return {
          translateEventTypes: [CameraEventType.LEFT_DRAG],
          rotateEventTypes: [CameraEventType.RIGHT_DRAG],
          zoomEventTypes: zoomCommon,
          tiltEventTypes: [CameraEventType.MIDDLE_DRAG],
        }
      case "zoom":
        return {
          zoomEventTypes: [CameraEventType.LEFT_DRAG, CameraEventType.WHEEL, CameraEventType.PINCH],
          rotateEventTypes: [CameraEventType.RIGHT_DRAG],
          translateEventTypes: [CameraEventType.MIDDLE_DRAG],
          tiltEventTypes: [],
        }
    }
  }, [navMode])

  const configureCameraControls = useCallback((viewer: CesiumViewer) => {
    const controller = viewer.scene.screenSpaceCameraController
    controller.enableCollisionDetection = false
    controller.minimumZoomDistance = 1
    controller.maximumZoomDistance = 100000
    controller.inertiaZoom = 0.5
    controller.zoomFactor = 5
  }, [])

  useEffect(() => {
    const cursor =
      navMode === "pan"
        ? isPanDragging
          ? "grabbing"
          : isRotateDragging
            ? ROTATE_CURSOR
            : "grab"
        : NAV_CURSORS[navMode]
    if (containerRef.current) containerRef.current.style.cursor = cursor
    if (canvasRef.current) canvasRef.current.style.cursor = cursor
  }, [navMode, isPanDragging, isRotateDragging])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      if (navMode !== "pan") return
      if (e.button === 0) setIsPanDragging(true)
      if (e.button === 2) setIsRotateDragging(true)
    }
    const onPointerUp = () => {
      setIsPanDragging(false)
      setIsRotateDragging(false)
    }

    el.addEventListener("pointerdown", onPointerDown, { capture: true })
    el.addEventListener("pointerup", onPointerUp, { capture: true })
    el.addEventListener("pointerleave", onPointerUp, { capture: true })
    el.addEventListener("pointercancel", onPointerUp, { capture: true })
    document.addEventListener("pointerup", onPointerUp)
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true })
      el.removeEventListener("pointerup", onPointerUp, { capture: true })
      el.removeEventListener("pointerleave", onPointerUp, { capture: true })
      el.removeEventListener("pointercancel", onPointerUp, { capture: true })
      document.removeEventListener("pointerup", onPointerUp)
    }
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
      applyTilesetPerformance(tileset, ecoMode)

      setIsLoading(false)

      setTimeout(() => {
        zoomToTileset()
      }, 100)
    },
    [zoomToTileset, ecoMode, applyTilesetPerformance],
  )

  const handleTilesetError = useCallback((error: unknown) => {
    console.error("Tileset error:", error)
    setIsLoading(false)
    setError("Failed to load 3D tileset. Check if the data files exist.")
  }, [])

  // Apply scene-level performance settings (showGlobe = user preference for quality mode)
  const applyScenePerformance = useCallback((viewer: CesiumViewer, highPerf: boolean, showGlobePref: boolean) => {
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

      scene.globe.show = showGlobePref
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
      scene.globe.show = showGlobePref
      if (scene.skyBox) scene.skyBox.show = showGlobePref
      if (scene.skyAtmosphere) scene.skyAtmosphere.show = showGlobePref
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

      configureCameraControls(viewer)

      // Apply performance settings
      applyScenePerformance(viewer, ecoMode, showGlobe)

      canvasRef.current = viewer.canvas
      if (viewer.canvas) {
        viewer.canvas.style.cursor = navMode === "pan" ? "grab" : NAV_CURSORS[navMode]
      }
    },
    [showGlobe, navMode, configureCameraControls, ecoMode, applyScenePerformance],
  )

  const resetCamera = useCallback(() => {
    zoomToTileset()
  }, [zoomToTileset])

  const toggleGlobe = useCallback(() => {
    setShowGlobe((prev) => !prev)
  }, [])

  const toggleWireframe = useCallback(() => {
    setShowWireframe((prev) => !prev)
  }, [])

  const toggleEcoMode = useCallback(() => {
    const next = !ecoMode
    const params = new URLSearchParams(searchParams.toString())
    params.set("eco", String(next))
    const path = typeof window !== "undefined" ? window.location.pathname : ""
    window.location.href = `${path}?${params.toString()}`
  }, [ecoMode, searchParams])

  // Apply globe visibility changes via useEffect (safe ref access)
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    const { scene } = viewer
    scene.globe.show = showGlobe
    if (scene.skyBox) scene.skyBox.show = showGlobe
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = showGlobe
  }, [showGlobe])

  // Apply wireframe changes via useEffect (safe ref access)
  useEffect(() => {
    const tileset = tilesetRef.current
    if (!tileset) return
    tileset.debugWireframe = showWireframe
  }, [showWireframe])

  // Apply eco mode changes via useEffect (safe ref access)
  useEffect(() => {
    const viewer = viewerRef.current
    const tileset = tilesetRef.current
    if (viewer && !viewer.isDestroyed()) {
      applyScenePerformance(viewer, ecoMode, showGlobe)
    }
    if (tileset) {
      applyTilesetPerformance(tileset, ecoMode)
    }
  }, [ecoMode, showGlobe, applyScenePerformance, applyTilesetPerformance])

  return (
    <div ref={containerRef} className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
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
            <p className="text-slate-400 text-sm">Make sure tileset.json and .b3dm files are in {dataPath}</p>
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
                <Button variant={ecoMode ? "glass-warning" : "glass"} size="icon-sm" onClick={toggleEcoMode}>
                  <ZapIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{ecoMode ? "Switch to quality mode" : "Switch to eco mode"}</TooltipContent>
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
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-300 border border-slate-700/50">
          <span className="text-emerald-400 font-semibold">Stratum</span>
          <span className="mx-2 text-slate-600">|</span>
          <span>{sceneDisplayName}</span>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="bg-slate-900/95 rounded-lg px-3 py-1.5 text-xs text-slate-500 border border-slate-700/50">
          <span className="text-slate-400">Left</span>=Pan · <span className="text-slate-400">Right</span>=Rotate ·{" "}
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
        requestRenderMode={ecoMode}
        maximumRenderTimeChange={ecoMode ? Infinity : undefined}
      >
        <ScreenSpaceCameraController
          {...controllerProps}
          minimumZoomDistance={1}
          maximumZoomDistance={100000}
          inertiaZoom={0.5}
          zoomFactor={5}
          enableCollisionDetection={false}
        />
        {/* Only render Globe when explicitly enabled */}
        {showGlobe && <Globe enableLighting={!ecoMode} />}
        {/* Disable sky elements in eco mode */}
        <SkyBox show={showGlobe && !ecoMode} />
        <SkyAtmosphere show={showGlobe && !ecoMode} />
        <Cesium3DTileset url={tilesetUrl} onReady={handleTilesetReady} onError={handleTilesetError} />
      </Viewer>
    </div>
  )
}
