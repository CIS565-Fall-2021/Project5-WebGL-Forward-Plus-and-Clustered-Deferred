import TextureBuffer from './textureBuffer';
import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { NUM_LIGHTS } from '../scene';

export const MAX_LIGHTS_PER_CLUSTER = 500;

function clamp(x, min, max) {
  return Math.max(min, Math.min(x, max));
}

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

    // set up dims of viewing frustum
    // camera defined in node_modules/three.src/cameras/PerspectiveCamera.js 
    let height = Math.tan(camera.fov / 2.0 * (Math.PI / 180.0)) * 2.0;
    let width = camera.aspect * height;
    let depth = camera.far - camera.near;

    for (let currLight = 0; currLight < NUM_LIGHTS; currLight++) {
      let light = scene.lights[currLight];
      let r = light.radius;

      // transform light.position from world space to camera space
      let ws = vec4.fromValues(light.position[0], light.position[1], light.position[2], 1.0);
      let cs = vec4.create();
      cs = vec4.transformMat4(cs, ws, viewMatrix);
      cs[2] *= -1.0;

      // compute dims for clusters
      let dx = (width * cs[2]) / this._xSlices;
      let dy = (height * cs[2]) / this._ySlices;
      let dz = depth / this._zSlices;

      let halfX = (width * cs[2]) / 2.0;
      let halfY = (height * cs[2]) / 2.0;

      // compute bounds for impacted clusters and clamp
      let xMin = Math.floor((cs[0] - r + halfX) / dx);
      xMin = Math.max(0, Math.min(xMin, this._xSlices - 1));
      let xMax = Math.floor((cs[0] + r + halfX) / dx);
      xMax = Math.max(0, Math.min(xMax, this._xSlices - 1));

      let yMin = Math.floor((cs[1] - r + halfY) / dy);
      yMin = Math.max(0, Math.min(yMin, this._ySlices - 1));
      let yMax = Math.floor((cs[1] + r + halfY) / dy);
      yMax = Math.max(0, Math.min(yMax, this._ySlices - 1));

      let zMin = Math.floor((cs[2] - r) / dz);
      zMin = Math.max(0, Math.min(zMin, this._zSlices - 1));
      let zMax = Math.floor((cs[2] + r) / dz);
      zMax = Math.max(0, Math.min(zMax, this._zSlices - 1));

      // Iterate through affected clusters and add the current light if possible
      for (let z = zMin; z <= zMax; z++) {
        for (let y = yMin; y <= yMax; y++) {
          for (let x = xMin; x <= xMax; x++) {
            let index = x + (y * this._xSlices) + (z * this._xSlices * this._ySlices);
            var bufIndex = this._clusterTexture.bufferIndex(index, 0);
            let numLights = this._clusterTexture.buffer[bufIndex];

            if (this._clusterTexture.buffer[bufIndex] < MAX_LIGHTS_PER_CLUSTER) {
              this._clusterTexture.buffer[bufIndex]++;
              let row = Math.floor(this._clusterTexture.buffer[bufIndex] % 4);
              let col = Math.floor(this._clusterTexture.buffer[bufIndex] / 4);
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, col) + row] = currLight;
            }
          }
        }
      }
    }
    this._clusterTexture.update();
  }
}