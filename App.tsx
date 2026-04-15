import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, LayoutChangeEvent} from "react-native"
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { createTruckScene, TruckSceneController } from './src/three/createTruckScene'
import { createTruckPanResponder } from "./src/gestures/createTruckPanResponder";
import { InventoryPanel } from "./src/ui/panels/InventoryPanel";

/**
 * Root component. Hosts the GLView that owns the 3D scene, the gesture layer
 * that drives truck rotation and tap raycasting, and the inventory panel that
 * appears after a compartment opens.
 */
export default function App() {

  //Rotation and gesture values are held in refs so drag updates do not
  //trigger React re-renders at 60fps.
  const sceneControllerRef = useRef<TruckSceneController | null>(null)

  const truckRotationXRef = useRef<number>(0)
  const truckRotationYRef = useRef<number>(0)

  const gestureStartRotationXRef = useRef<number>(0)
  const gestureStartRotationYRef = useRef<number>(0)

  const gestureLayerWidthRef = useRef<number>(0)
  const gestureLayerHeightRef = useRef<number>(0)

  //Set once the scene reports open/rotate/zoom animations have settled, which
  //is the cue to mount the inventory panel.
  const [openCompartmentName, setOpenCompartmentName] = useState<string | null>(null)

  const panResponder = useRef(
    createTruckPanResponder({
      sceneControllerRef,
      truckRotationXRef,
      truckRotationYRef,
      gestureStartRotationXRef,
      gestureStartRotationYRef,
      gestureLayerWidthRef,
      gestureLayerHeightRef,
      xSensitivity: 0.01,
      ySensitivity: 0.01,
      tapThreshold: 8,
    })
  ).current

  //Dispose the Three.js scene on unmount to release GPU resources and stop
  //the render loop.
  useEffect(() => {
    return () => {
      sceneControllerRef.current?.dispose()
    }
  }, [])

  async function onContextCreate(gl: ExpoWebGLRenderingContext) {
    sceneControllerRef.current = await createTruckScene(gl, {
      onCompartmentOpened: (compartmentName) => {
        setOpenCompartmentName(compartmentName)
      },
    })
  }

  function onGestureLayerLayout(event: LayoutChangeEvent): void {
    gestureLayerWidthRef.current = event.nativeEvent.layout.width
    gestureLayerHeightRef.current = event.nativeEvent.layout.height
  }

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      <View
        style={styles.gestureLayer}
        onLayout={onGestureLayerLayout}
        {...panResponder.panHandlers}
      />
      {openCompartmentName && (
        <InventoryPanel
          compartmentName={openCompartmentName}
          onClose={() => {
            sceneControllerRef.current?.closeCompartment()
            setOpenCompartmentName(null)
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  glView: {
    flex: 1,
  },
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
})
