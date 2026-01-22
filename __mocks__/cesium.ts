import { vi } from "vitest"

// Mock ScreenSpaceCameraController
export const createMockScreenSpaceCameraController = () => ({
  enableRotate: true,
  enableTranslate: true,
  enableZoom: true,
  enableTilt: true,
  enableLook: true,
  rotateEventTypes: [],
  translateEventTypes: [],
  zoomEventTypes: [],
  tiltEventTypes: [],
  minimumZoomDistance: 1,
  maximumZoomDistance: 100000,
  inertiaZoom: 0.5,
  zoomFactor: 5,
  enableCollisionDetection: true,
})

// Mock Scene
export const createMockScene = () => ({
  backgroundColor: null,
  globe: {
    show: true,
    enableLighting: false,
    showGroundAtmosphere: false,
    depthTestAgainstTerrain: false,
  },
  skyBox: { show: true },
  skyAtmosphere: { show: true },
  sun: { show: true },
  moon: { show: true },
  fog: { enabled: true },
  postProcessStages: {
    fxaa: { enabled: true },
  },
  shadowMap: { enabled: false },
  requestRenderMode: false,
  maximumRenderTimeChange: 0,
  highDynamicRange: true,
  logarithmicDepthBuffer: true,
  useDepthPicking: true,
  pickTranslucentDepth: false,
  debugShowFramesPerSecond: false,
  screenSpaceCameraController: createMockScreenSpaceCameraController(),
})

// Mock Camera
export const createMockCamera = () => ({
  viewBoundingSphere: vi.fn(),
  flyTo: vi.fn(),
  lookAt: vi.fn(),
  setView: vi.fn(),
})

// Mock Viewer
export const createMockViewer = () => ({
  scene: createMockScene(),
  camera: createMockCamera(),
  targetFrameRate: 60,
  isDestroyed: vi.fn().mockReturnValue(false),
  destroy: vi.fn(),
})

// Mock BoundingSphere
export const createMockBoundingSphere = (radius = 100) => ({
  center: { x: 0, y: 0, z: 0 },
  radius,
})

// Mock Tileset
export const createMockTileset = () => ({
  boundingSphere: createMockBoundingSphere(),
  debugWireframe: false,
  maximumScreenSpaceError: 16,
  skipLevelOfDetail: false,
  preferLeaves: false,
  dynamicScreenSpaceError: false,
  dynamicScreenSpaceErrorDensity: 0.002,
  dynamicScreenSpaceErrorFactor: 4.0,
  dynamicScreenSpaceErrorHeightFalloff: 0.25,
  foveatedScreenSpaceError: false,
  foveatedConeSize: 0.1,
  foveatedMinimumScreenSpaceErrorRelaxation: 0.0,
  immediatelyLoadDesiredLevelOfDetail: false,
  cacheBytes: 512 * 1024 * 1024,
  maximumCacheOverflowBytes: 256 * 1024 * 1024,
  loadSiblings: true,
})

// Cesium classes
export const Cesium3DTileset = vi.fn().mockImplementation(() => createMockTileset())

export const Viewer = vi.fn().mockImplementation(() => createMockViewer())

export const Color = {
  fromCssColorString: vi.fn().mockImplementation((color: string) => ({
    red: 0,
    green: 0,
    blue: 0,
    alpha: 1,
    toCssColorString: () => color,
  })),
  WHITE: { red: 1, green: 1, blue: 1, alpha: 1 },
  BLACK: { red: 0, green: 0, blue: 0, alpha: 1 },
}

export class HeadingPitchRange {
  heading: number
  pitch: number
  range: number

  constructor(heading: number, pitch: number, range: number) {
    this.heading = heading
    this.pitch = pitch
    this.range = range
  }
}

export const KeyboardEventModifier = {
  SHIFT: 0,
  CTRL: 1,
  ALT: 2,
}

export const CameraEventType = {
  LEFT_DRAG: 0,
  RIGHT_DRAG: 1,
  MIDDLE_DRAG: 2,
  WHEEL: 3,
  PINCH: 4,
}

// Re-export mocks for testing
export const __mocks__ = {
  createMockViewer,
  createMockScene,
  createMockCamera,
  createMockTileset,
  createMockBoundingSphere,
  createMockScreenSpaceCameraController,
}
