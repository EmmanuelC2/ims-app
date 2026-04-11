import * as THREE from 'three'

/**
 * State for a smooth camera move + lookAt transition.
 * The render loop calls advanceCameraZoomAnimation() each frame until it
 * reports done.
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
 * Build a CameraZoomAnimation, snapshotting the camera's current position and
 * lookAt as the start so the tween begins wherever the camera is right now.
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
 * Advance a CameraZoomAnimation by `delta` seconds using ease-out cubic.
 * Mutates camera.position and currentLookAt (the scene's lookAt tracker) and
 * calls camera.lookAt() each frame.
 *
 * @returns true when the animation has finished, false otherwise.
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
