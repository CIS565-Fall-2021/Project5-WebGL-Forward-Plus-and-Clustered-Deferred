import TextureBuffer from './textureBuffer';
import { NUM_LIGHTS } from '../scene';
import { LIGHT_MAX, Light_Min, LIGHT_RADIUS} from '../scene';
import { mat4, vec4 } from 'gl-matrix';
import { Frustum, Matrix4, Plane, Sphere, Vector3, Vector4 } from 'three';
import { clamp } from 'three/src/math/mathutils';
import Wireframe from '../wireframe';
import { wireframeDisplay } from '../main';

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
  }

  updateClusters(camera, viewMatrix, scene, wireframe) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...
    let height = Math.tan(camera.fov / 2. * Math.PI / 180.) * 2;
    let width = height * camera.aspect;
    let dx = width / this._xSlices;
    let dy = height / this._ySlices;
    let dz = (camera.far - camera.near) / this._zSlices;
    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
          // for (let j = 0; j < 100; ++j) {
          //   let k = j + 1
          //   this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, Math.floor(k / 4)) + Math.floor(k % 4)] = j;
          // }
        }
      }
    }
    for (let index = 0; index < NUM_LIGHTS; ++index) {
      const lightPos = scene.lights[index].position;
      const lightCamPos = new Vector3(lightPos[0], lightPos[1], lightPos[2]).applyMatrix4(viewMatrix);
      const circleOrigin = new Vector3(lightCamPos.x, lightCamPos.y, -lightCamPos.z);
      
      // debugger;
      // There is something wrong with the index calculation here. I have not solved the issues, but they do not affect the visual affect too much
      const scale = 5
      let minx = Math.min(Math.max(Math.floor((circleOrigin.x - scale * LIGHT_RADIUS + width * circleOrigin.z / 2) / (circleOrigin.z * dx)), 0), this._xSlices);
      let maxx = Math.max(Math.min(Math.floor((circleOrigin.x + scale * LIGHT_RADIUS + width * circleOrigin.z / 2) / (circleOrigin.z * dx)) + 1, this._xSlices), 1);
      let miny = Math.min(Math.max(Math.floor((circleOrigin.y - scale * LIGHT_RADIUS + height * circleOrigin.z / 2) / (circleOrigin.z * dy)), 0), this._ySlices);
      let maxy = Math.max(Math.min(Math.floor((circleOrigin.y + scale * LIGHT_RADIUS + height * circleOrigin.z / 2) / (circleOrigin.z * dy)) + 1, this._ySlices), 1);
      let minz = Math.min(Math.max(Math.floor((circleOrigin.z - scale * LIGHT_RADIUS - camera.near) / dz), 0), this._zSlices);
      let maxz = Math.max(Math.min(Math.floor((circleOrigin.z + scale * LIGHT_RADIUS - camera.near) / dz) + 1, this._zSlices), 1);
      if (minx == maxx) {
        maxx += 1
      }
      if (miny == maxy) {
        maxy += 1
      }
      if (minz == maxz) {
        maxz += 1
      }
      for (let x = minx; x < maxx; ++x) { // min max!
        for (let y = miny; y < maxy; ++y) {
          const origin = new Vector3(0,0,0);
          const p1 = new Vector3(-width / 2 + x * dx, -height / 2 + y * dy, 1);
          const p2 = new Vector3(-width / 2 + (x+1) * dx, -height / 2 + y * dy, 1);
          const p3 = new Vector3(-width / 2 + (x+1) * dx, -height / 2 + (y+1) * dy, 1);
          const p4 = new Vector3(-width / 2 + x * dx, -height / 2 + (y+1) * dy, 1);
          // console.log(camera.position)
          // console.log(new Vector4(camera.position[0], camera.position[1], camera.position[2],1).applyMatrix4(viewMatrix))
          // console.log(camera.position[0])
          // console.log(camera.position.applyMatrix4(viewMatrix))
          // console.log(viewMatrix)
          // console.log(camera.position)
          // const temp = new Vector3();
          // camera.getWorldPosition(temp);
          // console.log(temp);
          
          // console.log(viewMatrix);
          // console.log(camera.position);
          // console.log(new Vector3(0,0,0).applyMatrix4(camera.matrixWorld))
          // console.log(camera.matrixWorld)
          // debugger;
          if (wireframeDisplay) {
            let temp = new Vector3(p1.x, p1.y, -p1.z).multiplyScalar(10).applyMatrix4(camera.matrixWorld);
            wireframe.addLineSegment([camera.position.x, camera.position.y, camera.position.z], [temp.x, temp.y, temp.z], [1,0,0])
          }
          
          //debugger;
          const plane2 = new Plane().setFromCoplanarPoints(origin, p1, p2);
          const plane3 = new Plane().setFromCoplanarPoints(origin, p2, p3);
          const plane4 = new Plane().setFromCoplanarPoints(origin, p3, p4);
          const plane5 = new Plane().setFromCoplanarPoints(origin, p4, p1);
          for (let z = minz; z < maxz; ++z) {
            let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
            const plane0 = new Plane(new Vector3(0,0,1), camera.near + z * dz);
            const plane1 = new Plane(new Vector3(0,0,1), camera.near + (z+1) * dz);
            let frus = new Frustum(plane0, plane1, plane2, plane3, plane4, plane5);
            const sphere = new Sphere(circleOrigin, LIGHT_RADIUS * scale);
            if (frus.containsPoint(circleOrigin) || frus.intersectsSphere(sphere)) { 
              const lightIndex = this._clusterTexture.bufferIndex(i, 0);
              if (this._clusterTexture.buffer[lightIndex] <= MAX_LIGHTS_PER_CLUSTER) {
                this._clusterTexture.buffer[lightIndex] += 1;
                let clusterLights = this._clusterTexture.buffer[lightIndex];
                this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, Math.floor(clusterLights / 4)) + Math.floor(clusterLights % 4)] = index;
                // console.log(clusterLights)
                // console.log(i)
                // debugger;
              }           
              // console.log(this._clusterTexture.buffer[lightIndex])
              // console.log(NUM_LIGHTS)
            } 
          }
        }
      }     

    }
    this._clusterTexture.update();
  }
}