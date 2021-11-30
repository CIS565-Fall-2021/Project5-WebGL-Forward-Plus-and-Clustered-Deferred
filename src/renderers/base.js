import TextureBuffer from './textureBuffer';
import { NUM_LIGHTS } from '../scene.js';
import { vec3, vec4, mat4 } from 'gl-matrix';
import { ZeroFactor } from 'three';

export const MAX_LIGHTS_PER_CLUSTER = NUM_LIGHTS;


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

    for(let i = 0; i < NUM_LIGHTS; i++){

        // let light = scene.lights[i];
        // let radius = light.radius + 5;

        // let posLightWorldMin = vec4.fromValues(light.position[0] - radius, light.position[1] - radius, light.position[2] - radius, 1.0);
        // let posLightWorldMax = vec4.fromValues(light.position[0] + radius, light.position[1] + radius, light.position[2] + radius, 1.0);

    
        // // if(posLightCam[2] + radius < camera.near || posLightCam[2] - radius > camera.far){
        // //   continue;
        // // }

        // let posLightCamMin = vec4.create();
        // let posLightCamMax = vec4.create();

        // vec4.transformMat4(posLightCamMin,posLightWorldMin, viewMatrix);
        // vec4.transformMat4(posLightCamMax,posLightWorldMax, viewMatrix);

        // //vec4.multiply(posLightCamMin, viewMatrix, posLightWorldMin);
        // //vec4.multiply(posLightCamMax, viewMatrix, posLightWorldMax);


        // let minXPos = posLightCamMin[0];
        // let minYPos = posLightCamMin[1];
        // let minZPos = Math.abs(posLightCamMin[2]);

        // let maxXPos = posLightCamMax[0];
        // let maxYPos = posLightCamMax[1];
        // let maxZPos = Math.abs(posLightCamMax[2]);


        // //projection matrix
        // let m00 = 1.0 / (Math.tan(camera.fov / 2.0 * Math.PI / 180.0) * camera.aspect);
        // let m11 = 1.0 / Math.tan(camera.fov / 2.0 * Math.PI / 180.0);

        // //console.log("m00 is " +  m00);


        // //console.log("m11 is " +  m11);
        // //console.log(projectionMatrix);

        // //console.log(camera.fov);
        // //console.log(camera.aspect);

        // let minXClip =  minXPos * m00;
        // let maxXClip =  maxXPos * m00;

        // let minYClip = minYPos * m11;
        // let maxYClip = maxYPos * m11;

        // let zMinIndex = Math.min(Math.max(Math.floor(minZPos / cellDepth), 0),this._zSlices - 1);      
        // let zMaxIndex = Math.max(Math.min(Math.ceil(maxZPos / cellDepth), this._zSlices -1),0);

        // let xMinIndex = Math.min(Math.max(Math.floor((minXClip + 1.0) / 2.0 * this._xSlices), 0), this._xSlices - 1);
        // let xMaxIndex = Math.max(Math.min(Math.ceil((maxXClip + 1.0) / 2.0 * this._xSlices), this._xSlices - 1),0);

        // let yMinIndex = Math.min(Math.max(Math.floor((minYClip + 1.0) / 2.0 * this._ySlices), 0), this._ySlices- 1);
        // let yMaxIndex = Math.max(Math.min(Math.ceil((maxYClip + 1.0) / 2.0 * this._ySlices), this._ySlices - 1), 0);

        // //console.log("x is " + xMinIndex + " " + xMaxIndex);
        // //console.log("y is " + yMinIndex + " " + yMaxIndex);
        // //console.log("z is " + zMinIndex + " " + zMaxIndex);

        //  //console.log("Light " + i + " belongs x  from " + xMinIndex + " to "+ xMaxIndex);
        //  //console.log("Light " + i + " belongs y  from " + yMinIndex + " to "+ yMaxIndex);

        // for (let z = zMinIndex; z <= zMaxIndex; ++z) {
        //   for (let y = yMinIndex; y <= yMaxIndex; ++y) {
        //     for (let x = xMinIndex; x <= xMaxIndex; ++x) {
        //       let index = x + y * this._xSlices + z * this._xSlices * this._ySlices;
        //       if (this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)] < MAX_LIGHTS_PER_CLUSTER) {
        //         let numLights = this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)];
        //         numLights++;
        //         this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)] = numLights;
        //         this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, Math.floor(numLights / 4.0)) + numLights % 4.0] = i;
        //       }
        //     }
        //   }
        // }
/////////////////////////////////////////////////////////////////////////////////
      //   let light = scene.lights[i];
      //   let radius = light.radius ;

      //   let x0 = light.position[0] - radius;
      //   let y0 = light.position[1] - radius;

      //   let z0 = light.position[2] - radius;

      //   let x1 = light.position[0] + radius;
      //   let y1 = light.position[1] + radius;

      //   let z1 = light.position[2] + radius;



      //   let posLightWorldMin = vec4.fromValues(x0, y0, z0, 1.0);
      //   let posLightWorldMax = vec4.fromValues(x1, y1, z1, 1.0);


      //   // if(posLightCam[2] + radius < camera.near || posLightCam[2] - radius > camera.far){
      //   //   continue;
      //   // }

      //   let posLightCamMin = vec4.create();
      //   let posLightCamMax = vec4.create();

      //   vec4.transformMat4(posLightCamMin,posLightWorldMin, viewMatrix);
      //   vec4.transformMat4(posLightCamMax,posLightWorldMax, viewMatrix);

      //   //vec4.multiply(posLightCamMin, viewMatrix, posLightWorldMin);
      //  //vec4.multiply(posLightCamMax, viewMatrix, posLightWorldMax);


      //   let minYLength =  2 * Math.abs(posLightCamMin[2]) * Math.tan(camera.fov / 2.0 * Math.PI / 180.0);
      //   let maxYLength =  2 * Math.abs(posLightCamMax[2]) * Math.tan(camera.fov / 2.0 * Math.PI / 180.0);

      //   let minXLength = camera.aspect * minYLength;
      //   let maxXLength = camera.aspect * maxYLength;



      //   let minXPos = posLightCamMin[0] +  minXLength / 2.0;
      //   let maxXPos = posLightCamMax[0] +  maxXLength / 2.0;

      //   let minYPos = posLightCamMin[1] +  minYLength / 2.0;
      //   let maxYPos = posLightCamMax[1] +  maxYLength / 2.0;

      //   let minXCellLength = minXLength / (1.0 * this._xSlices);
      //   let maxXCellLength = maxXLength / (1.0 * this._xSlices);

      //   let minYCellLength = minYLength / (1.0 * this._ySlices);
      //   let maxYCellLength = maxYLength / (1.0 * this._ySlices);

      //   let xMinIndex = Math.floor(minXPos / minXCellLength);
      //   let xMaxIndex = Math.ceil(maxXPos / maxXCellLength);

      //   let yMinIndex = Math.floor(minYPos / minYCellLength);
      //   let yMaxIndex = Math.ceil(maxYPos / maxYCellLength);

      //   let zMinIndex = Math.floor((-posLightCamMin[2] - camera.near)/ cellDepth);
      //   let zMaxIndex = Math.ceil((-posLightCamMax[2] -  camera.near)/ cellDepth);





        let light = scene.lights[i];
        let radius = light.radius ;

        let posLightWorld = vec4.create(light.position[0], light.position[1] , light.position[2] , 1.0);
        let posLightCam = vec4.create();
        vec4.multiply(posLightCam, viewMatrix, posLightWorld);


        let yLength =  Math.abs(posLightCam[2]) * Math.tan(camera.fov / 2.0 * Math.PI / 180.0);
        let xLength =  yLength * camera.aspect;
        let xCellLength = xLength / this._xSlices;
        let yCellLength = yLength / this._ySlices;

        // move to frustum slice coordinate
        let xPos = posLightCam[0] +  xLength;
        let yPos = posLightCam[1] +  yLength;

        let zMinIndex = Math.min(Math.max(Math.floor((-posLightCam[2] - radius - camera.near)/ ((camera.far - camera.near) / (this._zSlices))), 0), this._zSlices -1);      
        let zMaxIndex = Math.max(Math.min(Math.ceil((-posLightCam[2] + radius - camera.near)/ ((camera.far - camera.near) / (this._zSlices))), this._zSlices -1),0);

        let xMinIndex = Math.min(Math.max(Math.floor(xPos - radius / xCellLength), 0), this._xSlices - 1);
        let xMaxIndex = Math.max(Math.min(Math.ceil(xPos + radius / yCellLength), this._xSlices - 1),0);

        let yMinIndex = Math.min(Math.max(Math.floor(yPos - radius / yCellLength), 0), this._ySlices- 1);
        let yMaxIndex = Math.max(Math.min(Math.ceil(yPos + radius / yCellLength), this._ySlices - 1), 0);


        
       //console.log("x is " + xMinIndex + " " + xMaxIndex);
      //console.log("z is " + zMinIndex + " " + zMaxIndex);

        for (let z = zMinIndex; z <= zMaxIndex; ++z) {
          for (let y = yMinIndex; y <= yMaxIndex; ++y) {
            for (let x = xMinIndex; x <= xMaxIndex; ++x) {
              let index = x + y * this._xSlices + z * this._xSlices * this._ySlices;
              if (this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)] < MAX_LIGHTS_PER_CLUSTER) {
                let numLights = this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)];
                numLights++;
                this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, 0)] = numLights;
                this._clusterTexture.buffer[this._clusterTexture.bufferIndex(index, Math.floor(numLights / 4.0)) + numLights % 4.0] = i;
              }

 
            }
          }
        }




        
    }


    this._clusterTexture.update();




  
  }
}