import { vec4 } from 'gl-matrix';
import { Vector4 } from 'three';
import TextureBuffer from './textureBuffer';

export const MAX_LIGHTS_PER_CLUSTER = 100;

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

    // Traverse each light
    for (let i = 0; i < scene.lights.length; i++) {
      let light = scene.lights[i];

      // Bounding box of point light
      let bounding_radius = light.radius * 1.5;
      let min_point = vec4.fromValues(light.position[0] - bounding_radius, light.position[1] - bounding_radius, light.position[2] - bounding_radius, 1);
      let max_point = vec4.fromValues(light.position[0] + bounding_radius, light.position[1] + bounding_radius, light.position[2] + bounding_radius, 1);

      // World space to screen space
      let min_point_view = vec4.create();
      let max_point_view = vec4.create();
      vec4.transformMat4(min_point_view, min_point, viewMatrix);
      vec4.transformMat4(max_point_view, max_point, viewMatrix);

      let min_point_screen = vec4.create();
      let max_point_screen = vec4.create();
      vec4.transformMat4(min_point_screen, min_point_view, camera.projectionMatrix.elements);
      vec4.transformMat4(max_point_screen, max_point_view, camera.projectionMatrix.elements);

      for (let j = 0; j < 4; j++) {
        min_point_screen[j] = min_point_screen[j] / min_point_screen[3];
        max_point_screen[j] = max_point_screen[j] / max_point_screen[3];
      }

      // Corresponding coords of cluster
      let min_x = Math.floor(this._xSlices * (min_point_screen[0] + 1) / 2);
      let max_x = Math.ceil(this._xSlices * (max_point_screen[0] + 1) / 2);
      let min_y = Math.floor(this._ySlices * (min_point_screen[1] + 1) / 2);
      let max_y = Math.ceil(this._ySlices * (max_point_screen[1] + 1) / 2);
      let min_z = Math.floor(this._zSlices * (min_point_screen[2] + 1) / 2);
      let max_z = Math.ceil(this._zSlices * (max_point_screen[2] + 1) / 2);

      // Exp. view space z coord of cluster
      // let min_z = Math.floor(Math.log(Math.max(-min_point_view[2], 0.0001) / camera.near) * this._zSlices / Math.log(camera.far / camera.near));
      // let max_z = Math.floor(Math.log(Math.max(-max_point_view[2], 0.0001) / camera.near) * this._zSlices / Math.log(camera.far / camera.near));

      // Traverse all influenced clusters
      for (let z = Math.max(0, min_z); z < Math.min(max_z + 1, this._zSlices); z++) {
        for (let y = Math.max(0, min_y); y < Math.min(max_y + 1, this._ySlices); y++) {
          for (let x = Math.max(0, min_x); x < Math.min(max_x + 1, this._xSlices); x++) {
            let k = x + y * this._xSlices + z * this._xSlices * this._ySlices;
            if (this._clusterTexture.buffer[this._clusterTexture.bufferIndex(k, 0)] < MAX_LIGHTS_PER_CLUSTER) {
              // Add number of lights
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(k, 0)]++;

              // Record light id
              let num_light = this._clusterTexture.buffer[this._clusterTexture.bufferIndex(k, 0)];
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(k, Math.floor(num_light / 4)) + num_light % 4] = i;
            }
          }
        }
      }
    }

    this._clusterTexture.update();
  }
}