import * as THREE from "three"
import { Asset } from "expo-asset"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

export async function loadTruckModel(): Promise<THREE.Group> {

    const asset = Asset.fromModule(require('../../assets/model/truck-prototype-1.glb'))
    await asset.downloadAsync()


    const loader = new GLTFLoader()

    return new Promise((resolve,reject) => {
        loader.load(
            asset.uri,
            (gltf) => {
                const model = gltf.scene
                model.scale.set(1,1,1)
                model.position.set(0,-2,-5)

                resolve(model)
            },
            undefined,
            (error) => {
                reject(error)
            }
        )
    })
}