import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native"
import { GLView } from "expo-gl";
import {createTruckScene, TruckSceneController} from './src/three/createTruckScene'
import { ExpoWebGLRenderingContext } from 'expo-gl'

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
  async function onContextCreate(gl:ExpoWebGLRenderingContext) {
    //intialize three.js scene and store controller
    sceneControllerRef.current = await createTruckScene(gl)
  }

  /**
   * Render the GLView
   * GLView provides native rendering surface where Three.js draws.
   */
  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
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
})