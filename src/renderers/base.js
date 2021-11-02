import TextureBuffer from './textureBuffer';
import { vec3, vec4, mat4 } from 'gl-matrix';
import { Light } from 'three';
import { NUM_LIGHTS } from '../scene';

export const MAX_LIGHTS_PER_CLUSTER = 500;

export default class BaseRenderer {
    constructor(xSlices, ySlices, zSlices) {
        // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
        this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
        this._xSlices = xSlices;
        this._ySlices = ySlices;
        this._zSlices = zSlices;
    }

    updateClusters(camera, viewMatrix, scene) {
        // TODO: Update the cluster texture with the count and indices of the lights in each cluster
        var yFOVAngle = Math.tan((camera.fov / 2) * (180 / Math.PI));
        var xFOVAngle = camera.aspect * yFOVAngle;
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

            let minXYZ = vec4.create(lightPos);
            vec4.sub(minXYZ, lightPos, lightRad);

            let maxXYZ = vec4.create(lightPos);
            vec4.add(maxXYZ, lightPos, lightRad);

            // getting bounding box to camera space
            vec4.transformMat4(minXYZ, minXYZ, viewMatrix);
            vec4.transformMat4(maxXYZ, maxXYZ, viewMatrix);

            minXYZ[2] *= -1;
            maxXYZ[2] *= -1;

            //determine which cluster light is in
            let xSliceHalfWidth = xFOVAngle * lightPos[2];
            let xMin = Math.floor(minXYZ[0] + xSliceHalfWidth / (2 * xSliceHalfWidth / this._xSlices));
            let xMax = Math.ceil(maxXYZ[0] + xSliceHalfWidth / (2 * xSliceHalfWidth / this._xSlices));
            xMin = Math.min(Math.max(xMin, 0), this._xSlices - 1);
            xMax = Math.min(Math.max(xMax, 0), this._xSlices - 1);

            let ySliceHalfWidth = yFOVAngle * lightPos[2];
            let yMin = Math.floor(minXYZ[1] + ySliceHalfWidth / (2 * ySliceHalfWidth / this._ySlices));
            let yMax = Math.ceil(maxXYZ[1] + ySliceHalfWidth / (2 * ySliceHalfWidth / this._ySlices));
            yMin = Math.min(Math.max(yMin, 0), this._ySlices - 1);
            yMax = Math.min(Math.max(yMax, 0), this._ySlices - 1);

            let zSlice = (camera.far - camera.near) / this._zSlices;
            let zMin = Math.floor(minXYZ[2] / zSlice);
            let zMax = Math.ceil(maxXYZ[2] / zSlice);
            zMin = Math.min(Math.max(zMin, 0), this._zSlices - 1);
            zMax = Math.min(Math.max(zMax, 0), this._zSlices - 1);

            //Increment light count and add index to cluster
            for (let z = zMin; z <= zMax; ++z) {
                for (let y = yMin; y <= yMax; ++y) {
                    for (let x = xMin; x <= xMax; ++x) {
                        let idx = x + y * this._xSlices + z * this._xSlices * this._ySlices;
                        let numLInCluster = this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, 0)] + 1;

                        if (numLInCluster > MAX_LIGHTS_PER_CLUSTER) continue;

                        let elemNum = Math.floor(numLInCluster / 4);
                        let elemIdx = Math.floor(numLInCluster % 4);

                        this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, 0)] = numLInCluster;
                        this._clusterTexture.buffer[this._clusterTexture.bufferIndex(idx, elemNum) + elemIdx] = i;
                    }
                }
            }
        }
        this._clusterTexture.update();
    }
}