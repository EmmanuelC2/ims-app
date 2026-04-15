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
 * Handle returned to the React layer for driving the scene and cleaning up
 * GPU resources on unmount.
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
    closeCompartment: () => void
}

/**
 * Optional hooks supplied by the React layer to react to scene events.
 */
export interface TruckSceneOptions {
    onCompartmentOpened?: (compartmentName: string) => void
}

/**
 * Initializes a Three.js scene (camera, lighting, model, render loop) inside
 * the given Expo-GL context and returns a controller for the React layer.
 */
export async function createTruckScene(
    gl: ExpoWebGLRenderingContext,
    options: TruckSceneOptions = {},
): Promise<TruckSceneController> {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x8d99ae)

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000)
    camera.position.z = 10
    camera.position.y = 1

    //Tracked manually so camera zoom animations can tween the lookAt target.
    //Three.js does not expose the current lookAt point.
    const currentLookAt = new THREE.Vector3(0, 0, 0)
    camera.lookAt(currentLookAt)

    //Snapshot the initial view so closeCompartment() can animate back to it.
    const defaultCameraPosition = camera.position.clone()
    const defaultCameraLookAt = currentLookAt.clone()

    let cameraZoomAnimation: CameraZoomAnimation | null = null
    let truckRotationAnimation: TruckRotationAnimation | null = null

    const compartmentZoomDistance = 3
    const compartmentZoomDuration = 0.8

    //Three.js expects a DOM canvas; Expo-GL has none, so we feed it a minimal
    //shim with just the properties WebGLRenderer actually reads.
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

    let truckModel: THREE.Object3D | null = null

    let mixer: THREE.AnimationMixer | null = null
    const animationActions: Record<string, THREE.AnimationAction> = {}
    const compartmentAnimationMap: Record<string, string> = {
        DriverCompartment001: 'Driver.Compartment.001.Open',
        DriverCompartment002: 'Driver.Compartment.002.Open',
        PassengerCompartment001: 'Passenger.Compartment.001.Open',
        PassengerCompartment002: 'Passenger.Compartment.002.Open',
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const clickableCompartments: THREE.Object3D[] = []

    //While true, drag-rotate and further compartment taps are suppressed so
    //the inventory panel owns the interaction until the user closes it.
    let hasOpenCompartment = false

    //Compartment whose reveal animations are in-flight; onCompartmentOpened
    //fires with this name once the camera zoom settles.
    let pendingOpenedCompartmentName: string | null = null

    //Mesh name of the currently open compartment so closeCompartment() can
    //play the matching .Close animation.
    let openCompartmentMeshName: string | null = null

    try {
        const loadedTruck = await loadTruckModel()

        truckModel = loadedTruck.model
        scene.add(truckModel)

        mixer = new THREE.AnimationMixer(truckModel)

        loadedTruck.animations.forEach((clip) => {
            const action = mixer!.clipAction(clip)
            action.clampWhenFinished = true
            action.loop = THREE.LoopOnce
            animationActions[clip.name] = action
        })

        truckModel.traverse((child) => {
            const isMesh = child instanceof THREE.Mesh
            const isCompartment = child.name.toLowerCase().includes('compartment')

            if (isMesh && isCompartment) {
                clickableCompartments.push(child)
            }
        })
    } catch (error) {
        console.error('Failed to load truck model:', error)
    }

    let animationFrameId: number | null = null
    let isDisposed = false

    const clock = new THREE.Clock()

    const render = () => {
        if (isDisposed) return

        const delta = clock.getDelta()

        mixer?.update(delta)

        if (truckRotationAnimation && truckModel) {
            const done = advanceTruckRotationAnimation(
                truckRotationAnimation,
                truckModel,
                delta,
            )
            if (done) truckRotationAnimation = null
        }

        if (cameraZoomAnimation) {
            const done = advanceCameraZoomAnimation(
                cameraZoomAnimation,
                camera,
                currentLookAt,
                delta,
            )
            if (done) {
                cameraZoomAnimation = null

                //Open, rotation, and zoom animations share the same duration,
                //so the zoom finishing marks the end of the full reveal.
                if (pendingOpenedCompartmentName) {
                    options.onCompartmentOpened?.(pendingOpenedCompartmentName)
                    pendingOpenedCompartmentName = null
                }
            }
        }

        renderer.render(scene, camera)

        //Required by Expo-GL to flush the frame to the native surface.
        gl.endFrameEXP()

        animationFrameId = requestAnimationFrame(render)
    }

    render()

    function playAnimation(animationName: string): void {
        const action = animationActions[animationName]

        if (!action) {
            console.log(`No animation found for: ${animationName}`)
            return
        }

        //Stop every compartment action so a new .Open/.Close does not blend
        //with a previous one that was still clamped at its final frame.
        Object.values(animationActions).forEach((existingAction) => {
            existingAction.stop()
        })

        action.reset()
        action.play()
    }

    return {
        isCompartmentOpen: () => hasOpenCompartment,
        closeCompartment: () => {
            if (!openCompartmentMeshName) return

            //Derive the close animation name by swapping the ".Open" suffix
            //(e.g. "Driver.Compartment.001.Open" -> ".Close").
            const openAnimationName = compartmentAnimationMap[openCompartmentMeshName]
            const closeAnimationName = openAnimationName?.replace(/\.Open$/, '.Close')

            if (closeAnimationName) {
                playAnimation(closeAnimationName)
            }

            //Pull the camera back to the default view in sync with the close.
            cameraZoomAnimation = createCameraZoomAnimation({
                camera,
                currentLookAt,
                targetPosition: defaultCameraPosition,
                targetLookAt: defaultCameraLookAt,
                duration: compartmentZoomDuration,
            })

            hasOpenCompartment = false
            openCompartmentMeshName = null
        },
        setTruckRotation: (rotationX: number, rotationY: number) => {
            if (!truckModel || !truckModel.rotation) return

            //Clamp tilt so the user cannot flip the truck upside down.
            const minRotationX = -Math.PI / 12
            const maxRotationX = Math.PI / 8

            truckModel.rotation.x = THREE.MathUtils.clamp(
                rotationX,
                minRotationX,
                maxRotationX,
            )

            truckModel.rotation.y = rotationY
        },
        handleScreenTap: (
            x: number,
            y: number,
            screenWidth: number,
            screenHeight: number,
        ) => {
            if (!truckModel || clickableCompartments.length === 0) return
            if (hasOpenCompartment) return

            //Screen-space to normalized device coordinates ([-1, 1] on each axis).
            pointer.x = (x / screenWidth) * 2 - 1
            pointer.y = -(y / screenHeight) * 2 + 1

            raycaster.setFromCamera(pointer, camera)

            const intersects = raycaster.intersectObjects(
                clickableCompartments,
                true,
            )

            if (intersects.length === 0) return

            const clickedMeshName = intersects[0].object.name

            const animationName = compartmentAnimationMap[clickedMeshName]
            if (animationName && truckModel) {
                playAnimation(animationName)
                hasOpenCompartment = true
                pendingOpenedCompartmentName = clickedMeshName
                openCompartmentMeshName = clickedMeshName

                const compartmentMesh = intersects[0].object

                //Rotate the truck so the tapped compartment's outward-facing
                //side lines up with world +Z (facing the camera head-on).
                //
                //The truck is long on one horizontal axis and short on the
                //other; compartments sit on the short ("width") axis, so the
                //outward normal is ±1 along that local axis, signed by which
                //side of the truck the compartment is on.
                const originalRotationX = truckModel.rotation.x
                const originalRotationY = truckModel.rotation.y
                truckModel.updateMatrixWorld(true)

                const compartmentWorldPos = new THREE.Vector3()
                compartmentMesh.getWorldPosition(compartmentWorldPos)
                const compartmentLocalPos = truckModel.worldToLocal(
                    compartmentWorldPos.clone(),
                )

                //Measure size in the un-rotated local frame so the bounding
                //box reflects the model's intrinsic dimensions.
                truckModel.rotation.x = 0
                truckModel.rotation.y = 0
                truckModel.updateMatrixWorld(true)

                const truckLocalSize = new THREE.Box3()
                    .setFromObject(truckModel)
                    .getSize(new THREE.Vector3())

                const widthAxisIsZ = truckLocalSize.x >= truckLocalSize.z
                const normalLocalX = widthAxisIsZ
                    ? 0
                    : (compartmentLocalPos.x >= 0 ? 1 : -1)
                const normalLocalZ = widthAxisIsZ
                    ? (compartmentLocalPos.z >= 0 ? 1 : -1)
                    : 0

                const rawTargetRotationY = -Math.atan2(normalLocalX, normalLocalZ)

                //Preview the final orientation to record where the compartment
                //will sit in world space; the camera zooms toward that point.
                truckModel.rotation.y = rawTargetRotationY
                truckModel.updateMatrixWorld(true)

                const finalCompartmentCenter = new THREE.Box3()
                    .setFromObject(compartmentMesh)
                    .getCenter(new THREE.Vector3())

                truckModel.rotation.x = originalRotationX
                truckModel.rotation.y = originalRotationY
                truckModel.updateMatrixWorld(true)

                //Take the shortest angular path so the truck doesn't spin the
                //long way around after many accumulated user revolutions.
                const twoPi = Math.PI * 2
                const diff = rawTargetRotationY - originalRotationY
                const wrappedDiff =
                    ((diff + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
                const targetTruckRotationY = originalRotationY + wrappedDiff

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

            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId)
            }

            if (truckModel) {
                scene.remove(truckModel)
            }

            mixer?.stopAllAction()
            renderer.dispose()

            //Required so the next createTruckScene() can reuse the GL context
            //without leftover renderer state corrupting it.
            renderer.resetState()
        },
    }
}