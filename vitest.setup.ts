import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Mock window.CESIUM_BASE_URL
Object.defineProperty(window, "CESIUM_BASE_URL", {
  value: "https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/",
  writable: true,
})

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock WebGL context (Cesium requires this)
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
  if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") {
    return {
      canvas: document.createElement("canvas"),
      getExtension: vi.fn(),
      getParameter: vi.fn().mockReturnValue([]),
      createShader: vi.fn(),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn().mockReturnValue(true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
    }
  }
  return null
})
