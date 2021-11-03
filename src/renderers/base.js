import TextureBuffer from './textureBuffer';
import Subfrustum from '../subfrustum';

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._clusterCoordTexture = new TextureBuffer(xSlices * ySlices * zSlices, 4 * 8);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...
    const lights = scene.lights;
   
    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
        }
      }
    }

    // create clusters and calculate which lights overlap
    let xstep = 2.0 / this._xSlices;
    let ystep = 2.0 / this._ySlices;
    let zstep = 1.0 / this._zSlices;

    let origX = -1.0;
    let origY = -1.0;
    let origZ = 0.0;

    let numFrustums = 0;
    for (let z = 0; z < this._zSlices; ++z){
      let curZ = origZ + zstep * z;
      for (let y = 0; y < this._ySlices; ++y){
        let curY = origY + ystep * y;
        for (let x = 0; x < this._xSlices; ++x){
          let curX = origX + xstep * x;

          let nextX = origX + xstep * (x+1);
          let nextY = origY + ystep * (y+1);
          let nextZ = origZ + zstep * (z+1);
          let subfrustum = new Subfrustum(curX, curY, Math.pow(curZ, 1/30.0), nextX, nextY, Math.pow(nextZ, 1/30.0), camera);
          subfrustum.create();
          let subfrustumPts = subfrustum.getPoints();
          //console.log("points:");
          for (let i = 0; i < subfrustumPts.length; i++) {
            //console.log(subfrustumPts[i][0]);
            //console.log(subfrustumPts[i][1]);
            //console.log(subfrustumPts[i][2]);
            this._clusterCoordTexture.buffer[this._clusterCoordTexture.bufferIndex(numFrustums, i) + 0] = subfrustumPts[i][0];
            this._clusterCoordTexture.buffer[this._clusterCoordTexture.bufferIndex(numFrustums, i) + 1] = subfrustumPts[i][1];
            this._clusterCoordTexture.buffer[this._clusterCoordTexture.bufferIndex(numFrustums, i) + 2] = subfrustumPts[i][2];
          }

          let numLights = 0;
          let lightIndex = 1;
          for (let l = 0; l < lights.length; l++){
            let light = lights[l];
            let intersects = subfrustum.lightIntersects(light.position, light.radius);
            if (intersects){
              let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = ++numLights;
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, lightIndex)] = l;
              lightIndex++;
          }
          numFrustums++;   
        }
      }
    }
  }

    //console.log(this._clusterTexture.buffer);
    //console.log(this._clusterCoordTexture.buffer);
    this._clusterTexture.update();
    this._clusterCoordTexture.update();
  }
}