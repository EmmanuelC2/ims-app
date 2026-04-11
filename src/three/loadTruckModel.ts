import * as THREE from "three"
import { Asset } from "expo-asset"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

type LoadedModel = {
    model: THREE.Object3D
    animations: THREE.AnimationClip[]
}

/**
 * Loads the truck 3D model from local assets and returns it as a Three.Group
 * 
 * This function handles:
 * - Resolving the local assets path
 * - Downloading the assest if needed
 * - Loading the GLB model using GLTFLoader
 * - Applying initial transforms (scale, position)
 */
export async function loadTruckModel(): Promise<LoadedModel> {

    //Resolve local GLB asset using Expos Asset System (Resolves React Natives lack of normal file system)
    const asset = Asset.fromModule(require('../../assets/model/truck-prototype-1.glb'))
    //Ensure the asset is downloaded and accessible
    await asset.downloadAsync()

    //Parses .glb/gltf files into Three.js objects
    const loader = new GLTFLoader()

    /**
     * Wrap loader.load in a promise so we can use async/await
     */
    return new Promise((resolve,reject) => {
        loader.load(
            asset.uri,
            //success callback
            (gltf) => {
                const model = gltf.scene
                model.scale.set(1,1,1)
                model.position.set(0,0,0)
                //resolve promise with loaded model
                resolve({
                    model,
                    animations: gltf.animations
                })
            },
            //progress callback (unused, useful for loading UI)
            undefined,
            //error callback
            (error) => {
                reject(error)
            }
        )
    })
}