import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native"
import { GLView } from "expo-gl";
import * as THREE from "three";
import { loadTruckModel } from "./src/three/loadTruckModel";

export default function App() {
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if(animationFrameId.current !== null){
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [])

  const onContextCreate = async (gl: any) => {
    const {drawingBufferWidth: width, drawingBufferHeight: height} = gl

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(70, width/height, 0.1, 1000)
    camera.position.z = 3 

    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {}, 
        addEventListener: () => {}, 
        removeEventListener: () => {},
        clientHeight: height,
        clientWidth: width,
      } as any,
      context: gl,
    })

    renderer.setSize(width, height)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionLight.position.set(2,2,2)
    scene.add(directionLight)

    let truckModel: THREE.Group | null = null

    try{
      truckModel = await loadTruckModel()
      truckModel.rotation.y = Math.PI / 4
      scene.add(truckModel)
    } catch (error) {
      console.error('Failed to load truck model:', error)
    }


    const render = () => {
      
      renderer.render(scene,camera)
      gl.endFrameEXP()
      animationFrameId.current = requestAnimationFrame(render)
    }

    render()
  }

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
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
})