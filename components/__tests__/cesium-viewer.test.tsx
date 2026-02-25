import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { CesiumViewerComponent } from "../cesium-viewer"
import { mockViewerInstance, mockTilesetInstance, resetMocks } from "../../__mocks__/resium"
import { CameraEventType } from "../../__mocks__/cesium"

// Mock the modules
vi.mock("cesium", () => import("../../__mocks__/cesium"))
vi.mock("resium", () => import("../../__mocks__/resium"))

// Helper to get buttons by index (based on DOM order)
// Button order: 0-Globe, 1-Wireframe, 2-Reset, 3-Performance, 4-Orbit, 5-Pan, 6-Zoom
const getButtons = () => screen.getAllByRole("button")

describe("CesiumViewerComponent", () => {
  beforeEach(() => {
    resetMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe("Loading State", () => {
    it("renders loading state initially", () => {
      render(<CesiumViewerComponent />)
      expect(screen.getByText("Loading 3D model...")).toBeInTheDocument()
    })

    it("hides loading state after tileset loads", async () => {
      render(<CesiumViewerComponent />)
      expect(screen.getByText("Loading 3D model...")).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.queryByText("Loading 3D model...")).not.toBeInTheDocument()
    })
  })

  describe("Error State", () => {
    it("shows error when tileset fails to load", async () => {
      render(<CesiumViewerComponent tilesetUrl="/error/tileset.json" />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByText(/Failed to load 3D tileset/)).toBeInTheDocument()
    })
  })

  describe("Globe Toggle", () => {
    it("toggles globe visibility when button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const globeButton = getButtons()[0]

      // Initial state - globe is hidden (showGlobe = false, performance mode on by default)
      expect(mockViewerInstance.scene.globe.show).toBe(false)

      // Click to show globe
      await act(async () => {
        fireEvent.click(globeButton)
        vi.runAllTimers()
      })

      expect(mockViewerInstance.scene.globe.show).toBe(true)

      // Click to hide globe
      await act(async () => {
        fireEvent.click(globeButton)
        vi.runAllTimers()
      })

      expect(mockViewerInstance.scene.globe.show).toBe(false)
    })

    it("does not crash when viewer is destroyed", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      mockViewerInstance.isDestroyed.mockReturnValue(true)

      const globeButton = getButtons()[0]

      // Should not throw
      await act(async () => {
        fireEvent.click(globeButton)
        vi.runAllTimers()
      })

      // Test passes if no errors thrown
      expect(true).toBe(true)
    })
  })

  describe("Wireframe Toggle", () => {
    it("toggles wireframe when button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const wireframeButton = getButtons()[1]

      // Initial state
      expect(mockTilesetInstance.debugWireframe).toBe(false)

      // Click to enable wireframe
      await act(async () => {
        fireEvent.click(wireframeButton)
        vi.runAllTimers()
      })

      expect(mockTilesetInstance.debugWireframe).toBe(true)

      // Click to disable wireframe
      await act(async () => {
        fireEvent.click(wireframeButton)
        vi.runAllTimers()
      })

      expect(mockTilesetInstance.debugWireframe).toBe(false)
    })
  })

  describe("Performance Mode Toggle", () => {
    it("toggles performance mode when button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const perfButton = getButtons()[3]

      // Performance mode is ON by default
      expect(mockViewerInstance.scene.requestRenderMode).toBe(true)

      // Click to switch to quality mode
      await act(async () => {
        fireEvent.click(perfButton)
        vi.runAllTimers()
      })

      expect(mockViewerInstance.scene.requestRenderMode).toBe(false)
    })
  })

  describe("Navigation Mode Buttons", () => {
    it("switches to orbit mode when orbit button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const orbitButton = getButtons()[4]

      await act(async () => {
        fireEvent.click(orbitButton)
        vi.runAllTimers()
      })

      const controller = mockViewerInstance.scene.screenSpaceCameraController
      expect(controller.rotateEventTypes).toContain(CameraEventType.LEFT_DRAG)
    })

    it("switches to pan mode when pan button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const panButton = getButtons()[5]

      await act(async () => {
        fireEvent.click(panButton)
        vi.runAllTimers()
      })

      const controller = mockViewerInstance.scene.screenSpaceCameraController
      expect(controller.translateEventTypes).toContain(CameraEventType.LEFT_DRAG)
    })

    it("switches to zoom mode when zoom button is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const zoomButton = getButtons()[6]

      await act(async () => {
        fireEvent.click(zoomButton)
        vi.runAllTimers()
      })

      const controller = mockViewerInstance.scene.screenSpaceCameraController
      expect(controller.zoomEventTypes).toContain(CameraEventType.LEFT_DRAG)
    })

    it("configures camera controls with correct event types for orbit mode", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const controller = mockViewerInstance.scene.screenSpaceCameraController

      // Orbit mode is default
      expect(controller.rotateEventTypes).toContain(CameraEventType.LEFT_DRAG)
      expect(controller.translateEventTypes).toContainEqual(CameraEventType.RIGHT_DRAG)
      expect(controller.zoomEventTypes).toContain(CameraEventType.WHEEL)
    })
  })

  describe("Reset Camera", () => {
    it("calls viewBoundingSphere when reset camera is clicked", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(200)
      })

      const resetButton = getButtons()[2]

      await act(async () => {
        fireEvent.click(resetButton)
        vi.runAllTimers()
      })

      expect(mockViewerInstance.camera.viewBoundingSphere).toHaveBeenCalled()
    })
  })

  describe("Cursor Changes", () => {
    it("updates cursor based on navigation mode", async () => {
      const { container } = render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const viewerContainer = container.firstChild as HTMLElement

      // Default orbit mode - grab cursor
      expect(viewerContainer.style.cursor).toBe("grab")

      // Switch to pan mode
      const panButton = getButtons()[5]
      await act(async () => {
        fireEvent.click(panButton)
        vi.runAllTimers()
      })

      expect(viewerContainer.style.cursor).toBe("move")

      // Switch to zoom mode
      const zoomButton = getButtons()[6]
      await act(async () => {
        fireEvent.click(zoomButton)
        vi.runAllTimers()
      })

      expect(viewerContainer.style.cursor).toBe("zoom-in")
    })
  })

  describe("Viewer Not Ready", () => {
    it("does not crash when toggling modes with destroyed viewer", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Simulate viewer destroyed
      mockViewerInstance.isDestroyed.mockReturnValue(true)

      const buttons = getButtons()

      // All these should not throw
      await act(async () => {
        fireEvent.click(buttons[0]) // Globe
        fireEvent.click(buttons[1]) // Wireframe
        fireEvent.click(buttons[3]) // Performance
        fireEvent.click(buttons[4]) // Orbit
        vi.runAllTimers()
      })

      // Test passes if no errors thrown
      expect(true).toBe(true)
    })
  })

  describe("UI Elements", () => {
    it("renders model info badge", () => {
      render(<CesiumViewerComponent />)

      expect(screen.getByText("Stratum")).toBeInTheDocument()
      expect(screen.getByText("Alpha")).toBeInTheDocument()
    })

    it("renders model info badge with scene name from tilesetUrl", () => {
      render(<CesiumViewerComponent tilesetUrl="/data/corujeira/tileset.json" />)

      expect(screen.getByText("Stratum")).toBeInTheDocument()
      expect(screen.getByText("Corujeira")).toBeInTheDocument()
    })

    it("renders keyboard hints", () => {
      render(<CesiumViewerComponent />)

      expect(screen.getByText(/Shift/)).toBeInTheDocument()
      expect(screen.getByText(/Ctrl/)).toBeInTheDocument()
      expect(screen.getByText(/Scroll/)).toBeInTheDocument()
    })

    it("renders all buttons", () => {
      render(<CesiumViewerComponent />)

      const buttons = getButtons()
      // 4 control buttons + 3 navigation buttons = 7
      expect(buttons.length).toBe(7)
    })
  })

  describe("Button Active States", () => {
    it("shows active state on current nav mode button", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const buttons = getButtons()
      const orbitButton = buttons[4]
      const panButton = buttons[5]

      // Orbit is default - should have active variant (emerald color)
      expect(orbitButton.className).toContain("text-emerald-400")

      // Pan should not be active (slate color for inactive)
      expect(panButton.className).toContain("text-slate-300")
    })

    it("updates active state when switching modes", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const panButton = getButtons()[5]

      await act(async () => {
        fireEvent.click(panButton)
        vi.runAllTimers()
      })

      // Active variant uses emerald color
      expect(panButton.className).toContain("text-emerald-400")
    })

    it("shows warning variant when performance mode is on", async () => {
      render(<CesiumViewerComponent />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const perfButton = getButtons()[3]
      // Warning variant uses amber color
      expect(perfButton.className).toContain("text-amber-400")
    })
  })
})
