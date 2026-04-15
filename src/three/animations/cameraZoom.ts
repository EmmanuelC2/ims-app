import * as THREE from 'three'

/**
 * Tween state for a camera position + lookAt transition, advanced each frame
 * by the render loop.
 */
export interface CameraZoomAnimation {
    startPosition: THREE.Vector3
    targetPosition: THREE.Vector3
    startLookAt: THREE.Vector3
    targetLookAt: THREE.Vector3
    elapsed: number
    duration: number
}

/**
 * Snapshots the camera's current position and lookAt so the tween starts from
 * wherever the camera is right now, not a fixed origin.
 */
export function createCameraZoomAnimation(params: {
    camera: THREE.PerspectiveCamera
    currentLookAt: THREE.Vector3
    targetPosition: THREE.Vector3
    targetLookAt: THREE.Vector3
    duration: number
}): CameraZoomAnimation {
    return {
        startPosition: params.camera.position.clone(),
        targetPosition: params.targetPosition.clone(),
        startLookAt: params.currentLookAt.clone(),
        targetLookAt: params.targetLookAt.clone(),
        elapsed: 0,
        duration: params.duration,
    }
}

/**
 * Advances the tween by `delta` seconds (ease-out cubic). Mutates
 * camera.position and the caller's currentLookAt tracker, then calls
 * camera.lookAt(). Returns true once the animation completes.
 */
export function advanceCameraZoomAnimation(
    animation: CameraZoomAnimation,
    camera: THREE.PerspectiveCamera,
    currentLookAt: THREE.Vector3,
    delta: number,
): boolean {
    animation.elapsed += delta
    const t = Math.min(animation.elapsed / animation.duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)

    camera.position.lerpVectors(
        animation.startPosition,
        animation.targetPosition,
        eased
    )
    currentLookAt.lerpVectors(
        animation.startLookAt,
        animation.targetLookAt,
        eased
    )
    camera.lookAt(currentLookAt)

    return t >= 1
}
