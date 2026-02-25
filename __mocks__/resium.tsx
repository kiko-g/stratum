import React, { forwardRef, useImperativeHandle, useEffect } from "react"
import { vi } from "vitest"
import { createMockViewer, createMockTileset } from "./cesium"

// Store mock instances for test access
export const mockViewerInstance = createMockViewer()
export const mockTilesetInstance = createMockTileset()

// Mock Viewer component
interface ViewerProps {
  full?: boolean
  timeline?: boolean
  animation?: boolean
  homeButton?: boolean
  geocoder?: boolean
  sceneModePicker?: boolean
  baseLayerPicker?: boolean
  navigationHelpButton?: boolean
  fullscreenButton?: boolean
  infoBox?: boolean
  selectionIndicator?: boolean
  shadows?: boolean
  requestRenderMode?: boolean
  maximumRenderTimeChange?: number
  children?: React.ReactNode
  ref?: React.Ref<{ cesiumElement: typeof mockViewerInstance }>
}

export const Viewer = forwardRef<{ cesiumElement: typeof mockViewerInstance }, ViewerProps>(
  ({ children, ...props }, ref) => {
    useImperativeHandle(ref, () => ({
      cesiumElement: mockViewerInstance,
    }))

    // Simulate viewer ready on mount
    useEffect(() => {
      // The ref callback will be triggered by React
    }, [])

    return (
      <div data-testid="cesium-viewer" data-props={JSON.stringify(props)}>
        {children}
      </div>
    )
  }
)
Viewer.displayName = "MockViewer"

// Mock Cesium3DTileset component
interface Cesium3DTilesetProps {
  url: string
  onReady?: (tileset: typeof mockTilesetInstance) => void
  onError?: (error: unknown) => void
}

export const Cesium3DTileset: React.FC<Cesium3DTilesetProps> = ({ url, onReady, onError }) => {
  useEffect(() => {
    // Simulate async tileset loading
    const timer = setTimeout(() => {
      if (url.includes("error") || url.includes("fail")) {
        onError?.(new Error("Failed to load tileset"))
      } else {
        onReady?.(mockTilesetInstance)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [url, onReady, onError])

  return <div data-testid="cesium-3d-tileset" data-url={url} />
}

// Mock Globe component
interface GlobeProps {
  enableLighting?: boolean
}

export const Globe: React.FC<GlobeProps> = ({ enableLighting }) => {
  return <div data-testid="cesium-globe" data-enable-lighting={enableLighting} />
}

// Mock SkyBox component
interface SkyBoxProps {
  show?: boolean
}

export const SkyBox: React.FC<SkyBoxProps> = ({ show }) => {
  return <div data-testid="cesium-skybox" data-show={show} />
}

// Mock SkyAtmosphere component
interface SkyAtmosphereProps {
  show?: boolean
}

export const SkyAtmosphere: React.FC<SkyAtmosphereProps> = ({ show }) => {
  return <div data-testid="cesium-sky-atmosphere" data-show={show} />
}

// Mock ScreenSpaceCameraController - applies props to the mock viewer's controller
interface ScreenSpaceCameraControllerProps {
  rotateEventTypes?: unknown[]
  translateEventTypes?: unknown[]
  zoomEventTypes?: unknown[]
  tiltEventTypes?: unknown[]
  minimumZoomDistance?: number
  maximumZoomDistance?: number
  inertiaZoom?: number
  zoomFactor?: number
  enableCollisionDetection?: boolean
}

export const ScreenSpaceCameraController: React.FC<ScreenSpaceCameraControllerProps> = (props) => {
  const ctrl = mockViewerInstance.scene.screenSpaceCameraController
  useEffect(() => {
    if (props.rotateEventTypes !== undefined) ctrl.rotateEventTypes = props.rotateEventTypes as never
    if (props.translateEventTypes !== undefined) ctrl.translateEventTypes = props.translateEventTypes as never
    if (props.zoomEventTypes !== undefined) ctrl.zoomEventTypes = props.zoomEventTypes as never
    if (props.tiltEventTypes !== undefined) ctrl.tiltEventTypes = props.tiltEventTypes as never
    if (props.minimumZoomDistance !== undefined) ctrl.minimumZoomDistance = props.minimumZoomDistance
    if (props.maximumZoomDistance !== undefined) ctrl.maximumZoomDistance = props.maximumZoomDistance
    if (props.inertiaZoom !== undefined) ctrl.inertiaZoom = props.inertiaZoom
    if (props.zoomFactor !== undefined) ctrl.zoomFactor = props.zoomFactor
    if (props.enableCollisionDetection !== undefined) ctrl.enableCollisionDetection = props.enableCollisionDetection
  })
  return null
}

// Reset mocks helper for tests
export const resetMocks = () => {
  // Reset viewer mock
  mockViewerInstance.isDestroyed.mockReturnValue(false)
  mockViewerInstance.camera.viewBoundingSphere.mockClear()
  mockViewerInstance.scene.globe.show = true
  mockViewerInstance.scene.skyBox = { show: true }
  mockViewerInstance.scene.skyAtmosphere = { show: true }
  mockViewerInstance.scene.screenSpaceCameraController.rotateEventTypes = []
  mockViewerInstance.scene.screenSpaceCameraController.translateEventTypes = []
  mockViewerInstance.scene.screenSpaceCameraController.zoomEventTypes = []
  mockViewerInstance.scene.screenSpaceCameraController.tiltEventTypes = []

  // Reset tileset mock
  mockTilesetInstance.debugWireframe = false
}

// Export mock instances for direct test access
export const __mocks__ = {
  mockViewerInstance,
  mockTilesetInstance,
  resetMocks,
}
