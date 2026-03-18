import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native"
import { GLView } from "expo-gl";
import * as THREE from "three";

export default function App() {
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if(animationFrameId.current !== null){
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [])

  const onContextCreate = (gl: any) => {
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

    const geometry = new THREE.BoxGeometry(1,1,1)
    const material = new THREE.MeshStandardMaterial({color: 0x4f8ef7})
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)

    const render = () => {
      cube.rotation.x += 0.01
      cube.rotation.y += 0.02

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