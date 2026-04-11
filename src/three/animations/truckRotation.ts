import * as THREE from 'three'

/**
 * State for a smooth rotation of the truck model around X and Y.
 * The render loop calls advanceTruckRotationAnimation() each frame until it
 * reports done.
 */
export interface TruckRotationAnimation {
    startRotationX: number
    startRotationY: number
    targetRotationX: number
    targetRotationY: number
    elapsed: number
    duration: number
}

/**
 * Build a TruckRotationAnimation, snapshotting the truck's current rotation as
 * the start so the tween begins wherever the truck is right now.
 */
export function createTruckRotationAnimation(params: {
    truckModel: THREE.Object3D
    targetRotationX: number
    targetRotationY: number
    duration: number
}): TruckRotationAnimation {
    return {
        startRotationX: params.truckModel.rotation.x,
        startRotationY: params.truckModel.rotation.y,
        targetRotationX: params.targetRotationX,
        targetRotationY: params.targetRotationY,
        elapsed: 0,
        duration: params.duration,
    }
}

/**
 * Advance a TruckRotationAnimation by `delta` seconds using ease-out cubic.
 * Mutates truckModel.rotation.x and truckModel.rotation.y.
 *
 * @returns true when the animation has finished, false otherwise.
 */
export function advanceTruckRotationAnimation(
    animation: TruckRotationAnimation,
    truckModel: THREE.Object3D,
    delta: number,
): boolean {
    animation.elapsed += delta
    const t = Math.min(animation.elapsed / animation.duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)

    truckModel.rotation.x = THREE.MathUtils.lerp(
        animation.startRotationX,
        animation.targetRotationX,
        eased
    )
    truckModel.rotation.y = THREE.MathUtils.lerp(
        animation.startRotationY,
        animation.targetRotationY,
        eased
    )

    return t >= 1
}
