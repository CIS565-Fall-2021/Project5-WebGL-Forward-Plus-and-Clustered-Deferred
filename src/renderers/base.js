import TextureBuffer from './textureBuffer';
import { NUM_LIGHTS  } from '../scene';
import { vec4 } from 'gl-matrix';

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, NUM_LIGHTS + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene) {
    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          const i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
        }
      }
    }

    const frustumUnitHeight = Math.tan(camera.fov * (Math.PI / 180) / 2) * 2;
    const frustumUnitWidth = camera.aspect * frustumUnitHeight;
    const gridLenZ = (camera.far - camera.near) / this._zSlices;

    for (let lightIdx = 0; lightIdx < scene.lights.length; lightIdx += 1) {
      const light = scene.lights[lightIdx];
      const lightWorldPos = vec4.fromValues(light.position[0], light.position[1], light.position[2], 1);
      let lightCameraSpacePos = vec4.create();
      vec4.transformMat4(lightCameraSpacePos, lightWorldPos, viewMatrix);
      lightCameraSpacePos[2] *= -1;

      const idxRangeForXY = (depth) => {
        const frustumHeight = frustumUnitHeight * depth;
        const frustumWidth = frustumUnitWidth * depth;
        const frustumXMin = -frustumWidth / 2;
        const frustumYMin = -frustumHeight / 2;
        const gridLenX = frustumWidth / this._xSlices;
        const gridLenY = frustumHeight / this._ySlices;

        const range = new Object();
        range.xmin = Math.floor((lightCameraSpacePos[0] - light.radius - frustumXMin) / gridLenX);
        range.xmax = Math.floor((lightCameraSpacePos[0] + light.radius - frustumXMin) / gridLenX);
        range.ymin = Math.floor((lightCameraSpacePos[1] - light.radius - frustumYMin) / gridLenY);
        range.ymax = Math.floor((lightCameraSpacePos[1] + light.radius - frustumYMin) / gridLenY);
        return range;
      };

      const range0 = idxRangeForXY(Math.max(lightCameraSpacePos[2] - light.radius, camera.near));
      const range1 = idxRangeForXY(Math.min(lightCameraSpacePos[2] + light.radius, camera.far));

      let xmin = Math.min(range0.xmin, range1.xmin);
      let xmax = Math.max(range0.xmax, range1.xmax);
      let ymin = Math.min(range0.ymin, range1.ymin);
      let ymax = Math.max(range0.ymax, range1.ymax);
      let zmin = Math.floor((lightCameraSpacePos[2] - light.radius - camera.near) / gridLenZ);
      let zmax = Math.floor((lightCameraSpacePos[2] + light.radius - camera.near) / gridLenZ);

      xmin = Math.max(xmin, 0);
      xmax = Math.min(xmax, this._xSlices - 1);
      ymin = Math.max(ymin, 0);
      ymax = Math.min(ymax, this._ySlices - 1);
      zmin = Math.max(zmin, 0);
      zmax = Math.min(zmax, this._zSlices - 1);
      if (xmin > xmax || ymin > ymax || zmin > zmax) {
        continue;
      }
      
      for (let z = zmin; z <= zmax; z += 1) {
        for (let y = ymin; y <= ymax; y += 1) {
          for (let x = xmin; x <= xmax; x += 1) {
            const gridIdx = x + y * this._xSlices + z * this._xSlices * this._ySlices;
            let bufferIdx = this._clusterTexture.bufferIndex(gridIdx, 0);
            const numLights = this._clusterTexture.buffer[bufferIdx] += 1;
            bufferIdx = this._clusterTexture.bufferIndex(gridIdx, Math.floor(numLights / 4)) + numLights % 4;
            this._clusterTexture.buffer[bufferIdx] = lightIdx;
          }
        }
      }
    }

    this._clusterTexture.update();
  }
}