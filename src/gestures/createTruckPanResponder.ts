import { PanResponder, PanResponderInstance } from "react-native"
import { RefObject } from "react"
import { TruckSceneController } from "../three/createTruckScene"

/**
 * Parameters required to create the truck pan responder.
 *
 * These refs allow us to:
 * - Read and update the truck's rotation without triggering React re-renders
 * - Communicate with the Three.js scene controller
 */
interface CreateTruckPanResponderParams {
    sceneControllerRef: RefObject<TruckSceneController | null>
    truckRotationXRef: RefObject<number>
    truckRotationYRef: RefObject<number>
    gestureStartRotationXRef: RefObject<number>
    gestureStartRotationYRef: RefObject<number>
    xSensitivity?: number
    ySensitivity?: number
}

/**
 * Creates a PanResponder used to rotate the 3D truck model.
 *
 * Behavior:
 * - Vertical drag (dy) → rotates truck on the x-axis (tilt up/down)
 * - Horizontal drag (dx) → rotates truck on the y-axis (spin left/right)
 *
 * @returns PanResponderInstance - gesture handler to attach to a View
 */
export function createTruckPanResponder({ 
   sceneControllerRef,
    truckRotationXRef,
    truckRotationYRef, 
    gestureStartRotationXRef, 
    gestureStartRotationYRef,
    xSensitivity = 0.01,
    ySensitivity = 0.01
}: CreateTruckPanResponderParams): PanResponderInstance {

    return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: () => {
            //Save trucks current x and y rotation when drag starts
            gestureStartRotationXRef.current = truckRotationXRef.current
            gestureStartRotationYRef.current = truckRotationYRef.current
        },

        onPanResponderMove: (_, gestureState) => {
            //Add current vertical and horizontal drag distance to rotation
            const nextRotationX = gestureStartRotationXRef.current + gestureState.dy * xSensitivity
            const nextRotationY = gestureStartRotationYRef.current + gestureState.dx * ySensitivity
            truckRotationXRef.current = nextRotationX
            truckRotationYRef.current = nextRotationY

            sceneControllerRef.current?.setTruckRotation(nextRotationX, nextRotationY)
           
        }
    })

}