import * as THREE from 'three'

/**
 * Tween state for truck rotation around X and Y, advanced each frame by the
 * render loop.
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
 * Snapshots the truck's current rotation so the tween starts from wherever the
 * model is right now.
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
 * Advances the tween by `delta` seconds (ease-out cubic), mutating
 * truckModel.rotation. Returns true once the animation completes.
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
