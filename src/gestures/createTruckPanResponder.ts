import { PanResponder, PanResponderInstance } from "react-native"
import { RefObject } from "react"
import { TruckSceneController } from "../three/createTruckScene"

/**
 * Refs are used instead of state so continuous gesture updates do not trigger
 * React re-renders on every frame.
 */
interface CreateTruckPanResponderParams {
    sceneControllerRef: RefObject<TruckSceneController | null>
    truckRotationXRef: RefObject<number>
    truckRotationYRef: RefObject<number>
    gestureStartRotationXRef: RefObject<number>
    gestureStartRotationYRef: RefObject<number>
    gestureLayerWidthRef: RefObject<number>
    gestureLayerHeightRef: RefObject<number>
    xSensitivity?: number
    ySensitivity?: number
    tapThreshold?: number
}

/**
 * Creates a PanResponder that rotates the truck on drag and raycasts on tap.
 * Vertical drag tilts the truck on X; horizontal drag spins it on Y.
 */
export function createTruckPanResponder({ 
   sceneControllerRef,
    truckRotationXRef,
    truckRotationYRef, 
    gestureStartRotationXRef, 
    gestureStartRotationYRef,
    gestureLayerWidthRef,
    gestureLayerHeightRef,
    xSensitivity = 0.01,
    ySensitivity = 0.01,
    tapThreshold = 8,
}: CreateTruckPanResponderParams): PanResponderInstance {

    return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: () => {
            gestureStartRotationXRef.current = truckRotationXRef.current
            gestureStartRotationYRef.current = truckRotationYRef.current
        },

        onPanResponderMove: (_, gestureState) => {
            //Drag is disabled while a compartment is open, but tap-release still fires
            //so the user can tap another compartment without closing the panel first.
            if (sceneControllerRef.current?.isCompartmentOpen()) return

            const nextRotationX = gestureStartRotationXRef.current + gestureState.dy * xSensitivity
            const nextRotationY = gestureStartRotationYRef.current + gestureState.dx * ySensitivity
            truckRotationXRef.current = nextRotationX
            truckRotationYRef.current = nextRotationY

            sceneControllerRef.current?.setTruckRotation(nextRotationX, nextRotationY)

        },

        onPanResponderRelease: (event, gestureState) => {
            const isTap = Math.abs(gestureState.dx) < tapThreshold && Math.abs(gestureState.dy) < tapThreshold

            if(!isTap) return

            sceneControllerRef.current?.handleScreenTap(
                event.nativeEvent.locationX,
                event.nativeEvent.locationY,
                gestureLayerWidthRef.current,
                gestureLayerHeightRef.current
            )
        }
    })

}