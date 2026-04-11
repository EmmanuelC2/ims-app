import { useEffect, useRef } from "react";
import { StyleSheet, View, LayoutChangeEvent} from "react-native"
import { GLView, ExpoWebGLRenderingContext } from "expo-gl";
import { createTruckScene, TruckSceneController } from './src/three/createTruckScene'
import { createTruckPanResponder } from "./src/gestures/createTruckPanResponder";

/**
 * Root component of the app
 * Responsibilities: 
 * - Render the GLView (native OpenGL surface)
 * - Initailize the Three.js scene
 * - Manage cleanup when the component unmounts
 */
export default function App() {

  /**
   * Holds reference to scene controller from createTruckScene()
   * Allows us to stop render loop and dispose gpu resources when component is destroyed
  */
  const sceneControllerRef = useRef<TruckSceneController | null>(null)

  //Stores trucks current x-axis rotation
  const truckRotationXRef = useRef<number>(0)
  const truckRotationYRef = useRef<number>(0)

  //Stores trucks x-axis rotation at the moment drag begins
  const gestureStartRotationXRef = useRef<number>(0)
  const gestureStartRotationYRef = useRef<number>(0)

  //Store gesture layers size
  const gestureLayerWidthRef = useRef<number>(0)
  const gestureLayerHeightRef = useRef<number>(0)

  //create pan responder once
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

  /**
   * Cleaup effect runs when component unmounts.
   * Ensures three.js scene is properly disposed to avoid memory leaks, gpu resource leaks, or lingering animation loops
   */
  useEffect(() => {
    return () => {
      sceneControllerRef.current?.dispose()
    }
  }, [])

  /**
   * Called automatically by GLView when OpenGL context is ready.
   * Entry point for Three.js setup
   * @param gl ExpoWebGLRenderingContext - special GL contxt from Expo
   */
  async function onContextCreate(gl: ExpoWebGLRenderingContext) {
    //intialize three.js scene and store controller
    sceneControllerRef.current = await createTruckScene(gl)
  }

  //Capture gesture layer size
  function onGestureLayerLayout(event: LayoutChangeEvent): void {
    gestureLayerWidthRef.current = event.nativeEvent.layout.width
    gestureLayerHeightRef. current = event.nativeEvent.layout.height
  }

  /**
   * Render the GLView
   * GLView provides native rendering surface where Three.js draws.
   */
  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      <View
        style={styles.gestureLayer}
        onLayout={onGestureLayerLayout}
        {...panResponder.panHandlers}
      />
    </View>
  )
}

//Basic layout styles (Flex: 1 ensures GLView fills entire screen)
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