import * as THREE from 'three'
import { loadTruckModel } from './loadTruckModel'
import { ExpoWebGLRenderingContext } from 'expo-gl'

/**
 * Controller returned to the React layer.
 * Allows the caller (App.tsx) to clean up GPU resources
 * and stop the render loop when the component unmounts.
 */
export interface TruckSceneController {
    dispose: () => void
}

/**
 * Initializes the entire Three.js scene using Expo's WebGL context.
 * This includes:
 * - Scence creation
 * - Camera Setup
 * - Renderer Configuration
 * - Lighting
 * - Model loading
 * - Render loop
 */
export async function createTruckScene(gl: ExpoWebGLRenderingContext): Promise<TruckSceneController> {
    /**
     * GL drawing buffer, Determines how large the renderer should be
     */
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl

    /**
     * Main scene container, all objects added here
     */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000)
    camera.position.z = 10
    camera.position.y = 1

    /** 
     * WebGL renderer using Expo's GL context.
     * Mocking minimal canvas properties required by Three.js
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: {
            width,
            height,
            style: {},
            addEventListener: () => { },
            removeEventListener: () => { },
            clientHeight: height,
            clientWidth: width,
        } as any,
        context: gl,
    })

    renderer.setSize(width, height)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const directionLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionLight.position.set(2, 2, 2)
    scene.add(directionLight)

    /**
     * Load the truck 3D model asynchronously
     */
    let truckModel: {
        scene: THREE.Group
        animations: THREE.AnimationClip[]
    } | null = null

    try {
        truckModel = await loadTruckModel()
        truckModel.scene.rotation.y = Math.PI / 4
        scene.add(truckModel.scene)
    } catch (error) {
        console.error('Failed to load truck model:', error)
    }

    /**
     * Track animation frame ID to stop it later
     */
    let animationFrameId: number | null = null
    /**
     * Flag to prevent rendering after cleanup
     */
    let isDisposed = false

    /**
     * Main render loop
     * Runs every frame (60fps)
     */
    const render = () => {
        if (isDisposed) return

        renderer.render(scene, camera)

        /**
         * Expo GL: tells react native done drawing this frame
         */
        gl.endFrameEXP()

        // Schedules the next frame
        animationFrameId = requestAnimationFrame(render)
    }

    render()

    /**
     * Return a controller so React can clean everything up
     */
    return {
        dispose: () => {
            isDisposed = true

            //Stop render loop
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }

            //Remove model from scene
            if (truckModel) {
                scene.remove(truckModel.scene)
            }

            //Dispose renderer to free up gpu mem
            renderer.dispose()

            //Resets GL state important for reusing Context
            renderer.resetState()
        }
    }
}