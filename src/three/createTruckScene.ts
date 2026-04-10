import * as THREE from 'three'
import { loadTruckModel } from './loadTruckModel'
import { ExpoWebGLRenderingContext } from 'expo-gl'
import {
    CameraZoomAnimation,
    createCameraZoomAnimation,
    advanceCameraZoomAnimation,
} from './animations/cameraZoom'
import {
    TruckRotationAnimation,
    createTruckRotationAnimation,
    advanceTruckRotationAnimation,
} from './animations/truckRotation'

/**
 * Controller returned to the React layer.
 * Allows the caller (App.tsx) to clean up GPU resources
 * and stop the render loop when the component unmounts.
 */
export interface TruckSceneController {
    dispose: () => void
    setTruckRotation: (rotationX: number, rotationY: number) => void
    handleScreenTap: (
        x: number,
        y: number,
        screenWidth: number,
        screenHeight: number,
    ) => void
    isCompartmentOpen: () => boolean
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
    scene.background = new THREE.Color(0x8d99ae)

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000)
    camera.position.z = 10
    camera.position.y = 1

    //Point the camera is currently looking at (updated during zoom animations)
    const currentLookAt = new THREE.Vector3(0, 0, 0)
    camera.lookAt(currentLookAt)

    //Active camera zoom animation, advanced each frame by the render loop
    let cameraZoomAnimation: CameraZoomAnimation | null = null

    //Active truck rotation animation, advanced each frame by the render loop
    let truckRotationAnimation: TruckRotationAnimation | null = null

    //Distance (world units) the camera should sit from a tapped compartment
    const compartmentZoomDistance = 3
    const compartmentZoomDuration = 0.8

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
    let truckModel: THREE.Object3D | null = null

    //Animation State
    let mixer: THREE.AnimationMixer | null = null
    const animationActions: Record<string, THREE.AnimationAction> = {}
    const compartmentAnimationMap: Record<string, string> = {
        DriverCompartment001: 'Driver.Compartment.001Action',
        DriverCompartment002: 'Driver.Compartment.002Action',
        PassengerCompartment001: 'Passenger.Compartment.001Action',
        PassengerCompartment002: 'Passenger.Compartment.002Action',
        
    }

    // Raycasting helpers
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    //Store only the meshes we want to allow clicking on
    const clickableCompartments: THREE.Object3D[] = []

    //True once any compartment has been tapped open. Used to disable drag-rotate.
    let hasOpenCompartment = false

    try {
        const loadedTruck = await loadTruckModel()

        truckModel = loadedTruck.model
        scene.add(truckModel)

        //Build animation mixer
        mixer = new THREE.AnimationMixer(truckModel)

        loadedTruck.animations.forEach((clip) => {
            const action = mixer!.clipAction(clip)
            action.clampWhenFinished = true
            action.loop = THREE.LoopOnce
            animationActions[clip.name] = action
        })

        //console.log('Avaliable animations: ', loadedTruck.animations.map((clip) => clip.name))

        /**
         * Mark clickable compartment meshes
         * Example:
         * - compartment_front_left
         * - compartment_rear_right 
         */
        truckModel.traverse((child) => {
            const isMesh = child instanceof THREE.Mesh
            const isCompartment = child.name.toLowerCase().includes('compartment')

            if(isMesh && isCompartment){
                clickableCompartments.push(child)
            }
        })

        //console.log('Clickable compartments:', clickableCompartments.map((mesh)=>mesh.name))

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

    // animation clock
    const clock = new THREE.Clock()

    /**
     * Main render loop
     * Runs every frame (60fps)
     */
    const render = () => {
        if (isDisposed) return

        const delta = clock.getDelta()

        //Advance active animations
        mixer?.update(delta)

        //Advance truck rotation animation (if any)
        if (truckRotationAnimation && truckModel) {
            const done = advanceTruckRotationAnimation(
                truckRotationAnimation,
                truckModel,
                delta
            )
            if (done) truckRotationAnimation = null
        }

        //Advance camera zoom animation (if any)
        if (cameraZoomAnimation) {
            const done = advanceCameraZoomAnimation(
                cameraZoomAnimation,
                camera,
                currentLookAt,
                delta
            )
            if (done) cameraZoomAnimation = null
        }

        renderer.render(scene, camera)

        /**
         * Expo GL: tells react native done drawing this frame
         */
        gl.endFrameEXP()

        // Schedules the next frame
        animationFrameId = requestAnimationFrame(render)
    }

    render()

    function playAnimation(animationName: string): void {
        const action = animationActions[animationName]
        
        if(!action){
            console.log(`No animation found for: ${animationName}`)
            return
        }

        //stop any current running compartment actions
        Object.values(animationActions).forEach((existingAction) => {
            existingAction.stop()
        })

        action.reset()
        action.play()
    }

    /**
     * Return a controller so React can clean everything up
     */
    return {
        isCompartmentOpen: () => hasOpenCompartment,
        setTruckRotation: (rotationX: number, rotationY: number) => {
            if(!truckModel || !truckModel.rotation) return

            //Clamp the tilt so the truck cannot flip
            const minRotationX = -Math.PI / 12
            const maxRotaionX = Math.PI / 8

            truckModel.rotation.x = THREE.MathUtils.clamp(
                rotationX,
                minRotationX,
                maxRotaionX
            )

            truckModel.rotation.y = rotationY
        },
        handleScreenTap: (
            x: number,
            y: number,
            screenWidth: number,
            screenHeight: number
        ) => {
            if(!truckModel || clickableCompartments.length === 0) return

            /**
             * Convert screen coordinates into normalized device coordinates:
             * x: -1 to 1
             * y: -1 to 1
             */
            pointer.x = (x / screenWidth) * 2 - 1
            pointer.y = -(y / screenHeight) * 2 + 1

            raycaster.setFromCamera(pointer, camera)

            //recursive = true so children are considered
            const intersects = raycaster.intersectObjects(
                clickableCompartments,
                true
            )

            if(intersects.length === 0) return

            const clickedMeshName = intersects[0].object.name
            
            //console.log('Compartment clicked: ', clickedMeshName)

            const animationName = compartmentAnimationMap[clickedMeshName]
            if(animationName && truckModel){
                playAnimation(animationName)
                hasOpenCompartment = true

                const compartmentMesh = intersects[0].object

                /**
                 * Compute the target truck Y rotation so the tapped compartment's
                 * side of the truck faces the camera perpendicularly.
                 *
                 * A truck is long along one horizontal axis ("length") and short
                 * along the other ("width"). Compartments sit on the width axis
                 * (driver side vs passenger side), so the camera should look
                 * straight down the width axis to see the compartment head-on.
                 *
                 * Steps:
                 * 1. Get the compartment's position in the truck's LOCAL frame.
                 * 2. Measure the truck's un-rotated bounding box to decide which
                 *    local axis is length vs width.
                 * 3. The outward normal is a unit vector along the local width
                 *    axis, signed by which side of the truck the compartment is on.
                 * 4. Rotate the truck so that local normal lines up with world +Z.
                 */
                const originalRotationX = truckModel.rotation.x
                const originalRotationY = truckModel.rotation.y
                truckModel.updateMatrixWorld(true)

                const compartmentWorldPos = new THREE.Vector3()
                compartmentMesh.getWorldPosition(compartmentWorldPos)
                const compartmentLocalPos = truckModel.worldToLocal(
                    compartmentWorldPos.clone()
                )

                //Measure truck size in its un-rotated local frame
                truckModel.rotation.x = 0
                truckModel.rotation.y = 0
                truckModel.updateMatrixWorld(true)

                const truckLocalSize = new THREE.Box3()
                    .setFromObject(truckModel)
                    .getSize(new THREE.Vector3())

                //Longer horizontal dimension = length axis; the other is width
                const widthAxisIsZ = truckLocalSize.x >= truckLocalSize.z
                const normalLocalX = widthAxisIsZ
                    ? 0
                    : (compartmentLocalPos.x >= 0 ? 1 : -1)
                const normalLocalZ = widthAxisIsZ
                    ? (compartmentLocalPos.z >= 0 ? 1 : -1)
                    : 0

                const rawTargetRotationY = -Math.atan2(normalLocalX, normalLocalZ)

                /**
                 * Preview the final orientation to read the compartment's
                 * post-rotation world position — this is what the camera zooms to.
                 */
                truckModel.rotation.y = rawTargetRotationY
                truckModel.updateMatrixWorld(true)

                const finalCompartmentCenter = new THREE.Box3()
                    .setFromObject(compartmentMesh)
                    .getCenter(new THREE.Vector3())

                truckModel.rotation.x = originalRotationX
                truckModel.rotation.y = originalRotationY
                truckModel.updateMatrixWorld(true)

                /**
                 * Shortest angular path so the truck doesn't spin the long way
                 * around if the user has accumulated many revolutions.
                 */
                const twoPi = Math.PI * 2
                const diff = rawTargetRotationY - originalRotationY
                const wrappedDiff =
                    ((diff + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
                const targetTruckRotationY = originalRotationY + wrappedDiff

                /**
                 * Camera sits along +Z from the compartment at a fixed distance,
                 * with matching Y so the compartment is directly in front.
                 */
                const targetCameraPosition = finalCompartmentCenter.clone()
                targetCameraPosition.z += compartmentZoomDistance

                truckRotationAnimation = createTruckRotationAnimation({
                    truckModel,
                    targetRotationX: 0,
                    targetRotationY: targetTruckRotationY,
                    duration: compartmentZoomDuration,
                })

                cameraZoomAnimation = createCameraZoomAnimation({
                    camera,
                    currentLookAt,
                    targetPosition: targetCameraPosition,
                    targetLookAt: finalCompartmentCenter,
                    duration: compartmentZoomDuration,
                })
            }

        },
        dispose: () => {
            isDisposed = true

            //Stop render loop
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }

            //Remove model from scene
            if (truckModel) {
                scene.remove(truckModel)
            }

            //Stop animations
            mixer?.stopAllAction()

            //Dispose renderer to free up gpu mem
            renderer.dispose()

            //Resets GL state important for reusing Context
            renderer.resetState()
        }
    }
}