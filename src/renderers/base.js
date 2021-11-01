import { NUM_LIGHTS } from '../scene';
import TextureBuffer from './textureBuffer';
import { vec3, vec4, mat4 } from 'gl-matrix';
import { Light } from 'three';

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class BaseRenderer {
    constructor(xSlices, ySlices, zSlices) {
        // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
        this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
        this._xSlices = xSlices;
        this._ySlices = ySlices;
        this._zSlices = zSlices;
        this._index = 0; 
    }

    updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...

        for (let z = 0; z < this._zSlices; ++z) {
            for (let y = 0; y < this._ySlices; ++y) {
                for (let x = 0; x < this._xSlices; ++x) {
                    let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
                    // Reset the light count to 0 for every cluster
                    this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
                }
            }
        }

        var ySpotAngle = Math.tan((camera.fov / 2) * (180 / Math.PI));
        var xSpotAngle = camera.aspect * ySpotAngle;
        // for each light in the scene
        for (let i = 0; i < NUM_LIGHTS; i++) {

            // 1) determine bounding box of light
            let lightPos = vec4.fromValues(
                    scene.lights[i].position[0],
                    scene.lights[i].position[1],
                    scene.lights[i].position[2],
                    1);

            let lightRad = vec4.fromValues(
                    scene.lights[i].radius,
                    scene.lights[i].radius,
                    scene.lights[i].radius,
                    0);

            var minXYZ = vec4.create(lightPos);
            vec4.sub(minXYZ, lightPos, lightRad);

            var maxXYZ = vec4.create(lightPos);
            vec4.add(maxXYZ, lightPos, lightRad);

            // 1.a) convert bounding box to camera space
            vec4.transformMat4(minXYZ, minXYZ, viewMatrix);
            vec4.transformMat4(maxXYZ, maxXYZ, viewMatrix);

            // 2) determine which cluster light is in

            // 2.a) compute min and max of x slice
            let xSliceHalfWidth = xSpotAngle * lightPos[2];
            var xMin = Math.floor(minXYZ[0] + xSliceHalfWidth / (2 * xSliceHalfWidth / this._xSlices));
            var xMax = Math.ceil(maxXYZ[0] + xSliceHalfWidth / (2 * xSliceHalfWidth / this._xSlices));
            xMin = Math.min(Math.max(xMin, 0), this._xSlices - 1);
            xMax = Math.min(Math.max(xMax, 0), this._xSlices - 1);

            // 2.b) compute min and max of y slice 
            let ySliceHalfWidth = ySpotAngle * lightPos[2];
            var yMin = Math.floor(minXYZ[1] + ySliceHalfWidth / (2 * ySliceHalfWidth / this._ySlices));
            var yMax = Math.ceil(maxXYZ[1] + ySliceHalfWidth / (2 * ySliceHalfWidth / this._ySlices));
            yMin = Math.min(Math.max(yMin, 0), this._ySlices - 1);
            yMax = Math.min(Math.max(yMax, 0), this._ySlices - 1);

            // 2.c) compute min and max of z slice 
            let zSlice = (camera.far - camera.near) / this._zSlices;
            var zMin = Math.floor(minXYZ[2] / zSlice);
            var zMax = Math.ceil(maxXYZ[2] / zSlice);
            zMin = Math.min(Math.max(zMin, 0), this._zSlices - 1);
            zMax = Math.min(Math.max(zMax, 0), this._zSlices - 1);

            // 3) increment light count for cluster and add index to cluster
            for (let z = zMin; z <= zMax; ++z) {
                for (let y = yMin; y <= yMax; ++y) {
                    for (let x = xMin; x <= xMax; ++x) {
                        let idx = x + y * this._xSlices + z * this._xSlices * this._ySlices;
                        let numLightsInCluster = this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, 0)] + 1;

                        if (numLightsInCluster > MAX_LIGHTS_PER_CLUSTER) continue;

                        let elemNum = Math.floor(numLightsInCluster / 4);
                        let elemIdx = Math.floor(numLightsInCluster % 4);

                        this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, 0)] = numLightsInCluster;
                        this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, elemNum) + elemIdx] = i;
                    }
                }
            }
        }
        this._clusterTexture.update();
        //console.log(this._clusterTexture.buffer);
    }
}