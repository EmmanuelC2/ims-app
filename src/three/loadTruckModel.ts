import * as THREE from "three"
import { Asset } from "expo-asset"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

type LoadedModel = {
    model: THREE.Object3D
    animations: THREE.AnimationClip[]
}

/**
 * Loads the truck GLB from bundled assets. Uses Expo's Asset system to
 * resolve the bundled file to a URI, since React Native has no standard
 * filesystem that GLTFLoader can read from directly.
 */
export async function loadTruckModel(): Promise<LoadedModel> {
    const asset = Asset.fromModule(require('../../assets/model/truck-prototype-1.glb'))
    await asset.downloadAsync()

    const loader = new GLTFLoader()

    return new Promise((resolve, reject) => {
        loader.load(
            asset.uri,
            (gltf) => {
                const model = gltf.scene
                model.scale.set(1, 1, 1)
                model.position.set(0, 0, 0)
                resolve({
                    model,
                    animations: gltf.animations,
                })
            },
            undefined,
            (error) => {
                reject(error)
            },
        )
    })
}