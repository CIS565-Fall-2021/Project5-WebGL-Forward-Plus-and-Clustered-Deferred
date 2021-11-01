import { mat4 } from 'gl-matrix';
import { Vector3 , Vector4, Matrix4, LineSegments, Quaternion, Plane, Frustum, Sphere} from 'three';
import Wireframe from '../wireframe';
import TextureBuffer from './textureBuffer';

export const MAX_LIGHTS_PER_CLUSTER = 100;



export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;

    this.lines = [];
  }

  frustumPointsToWireframe(points){
    // store frustum edges in list of lines to
    // be drawn in wireframe
        for (let i = 1; i < 8; i++){
          let p1 = [points[i-1].x, points[i-1].y, points[i-1].z]
          let p2 = [points[i].x, points[i].y, points[i].z]
          this.lines.push([p1, p2]);
        }
          let p1 = [points[0].x, points[0].y, points[0].z]
          let p2 = [points[3].x, points[3].y, points[3].z]
          this.lines.push([p1, p2]);

        for (let i = 0; i < 4; i++){
          let p1 = [points[i].x, points[i].y, points[i].z]
          let p2 = [points[i+4].x, points[i+4].y, points[i+4].z]
          this.lines.push([p1, p2]);
        }
        //console.log(this.lines);

  }
  
  getFrustumPoints(ivp, nearClipDist, farClipDist, xPos, yPos, zPos, xScale, yScale, zScale){

          // set up the corners of our frustum
          var frustumCornersRaw =    [new Vector4(-1.0,  1.0, nearClipDist, 1),
                                   new Vector4( 1.0,  1.0, nearClipDist, 1),
                                   new Vector4( 1.0, -1.0, nearClipDist, 1),
                                   new Vector4(-1.0, -1.0, nearClipDist, 1),
                                   new Vector4(-1.0,  1.0, farClipDist, 1),
                                   new Vector4( 1.0,  1.0, farClipDist, 1),
                                   new Vector4( 1.0, -1.0, farClipDist, 1),
                                   new Vector4(-1.0, -1.0, farClipDist, 1)];
          var frustumCorners = [];                         

          //let frustumCorners = []; 
          let transScale = new Matrix4;
          transScale.compose(new Vector3(xPos, yPos, zPos), 
                             new Quaternion(), 
                             new Vector3(xScale, yScale, zScale));

        // translate those corners into world space
        //console.table(transScale);
        for (let i = 0; i < 8; i++){
          frustumCornersRaw[i].applyMatrix4(transScale);
          frustumCornersRaw[i].applyMatrix4(ivp);
          //frustumCorners[i] = new Vector3(frustumCorners[i]/frustumCorners[i][3]);
          //console.log(frustumCorners[i]);
          frustumCornersRaw[i].divideScalar(frustumCornersRaw[i].w);
          frustumCorners.push(new Vector3(frustumCornersRaw[i].x,
                                          frustumCornersRaw[i].y,
                                          frustumCornersRaw[i].z));
        }

        return frustumCorners;
  }

  updateClusters(camera, viewMatrix, inverseViewProjection, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
    // This will take some time. The math is nontrivial...

    var nearClipDist = 0.0001;
    var farClipDist = 1;

    var ivp = new Matrix4;
    ivp.fromArray(inverseViewProjection);
    //ivp.set(inverseViewProjection);

    //var foo = mat4.fromValues(1, 1, 1,1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4);
    //console.table(ivp);

    this.lines.length = 0;

    //console.log(this._zSlices);
    let xScale = 1.0 / this._xSlices;
    let yScale = 1.0 / this._ySlices;
    let zScale = 1.0 / this._zSlices;

    for (let z = 0; z < this._zSlices; ++z) {
      let zPos = (z * zScale);
      for (let y = 0; y < this._ySlices; ++y) {
        let yPos = (2 * y * yScale) - (1 - yScale);
        for (let x = 0; x < this._xSlices; ++x) {
          let xPos =(2 * x * xScale) - (1 - xScale);
          //console.log("x: " + xPos + " y: " + yPos + " z: " + zPos);

          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;

          // build a subfrustum for this x,y,z combination
          let fp = this.getFrustumPoints(ivp, nearClipDist, farClipDist, xPos, yPos, zPos, xScale, yScale, zScale);
          // store the frustum edges in our wireframe buffer
          this.frustumPointsToWireframe(fp);

          // build planes for three.js frustum
          let p0 = new Plane;
          let p1 = new Plane;
          let p2 = new Plane;
          let p3 = new Plane;
          let p4 = new Plane;
          let p5 = new Plane;
          p0.setFromCoplanarPoints(fp[0], fp[1], fp[2]);
          p1.setFromCoplanarPoints(fp[4], fp[0], fp[3]);
          p2.setFromCoplanarPoints(fp[4], fp[5], fp[1]);
          p3.setFromCoplanarPoints(fp[5], fp[6], fp[2]);
          p4.setFromCoplanarPoints(fp[6], fp[2], fp[3]);
          p5.setFromCoplanarPoints(fp[5], fp[4], fp[7]);

          let f = new Frustum(p0, p1, p2, p3, p4, p5);

          let li = 0;
          let numLightsThisCell = 0;
          scene.lights.forEach(l => {
            // be sure to check each light, since they can intersect multiple frustums
            let p = new Vector3(l.position[0], l.position[1], l.position[2]);
            let s = new Sphere(p, l.radius);
            if(f.intersectsSphere(s)){
              // append the light to this frustum's cluster texture cell 
              this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0) + numLightsThisCell] = li;
              numLightsThisCell++;
            }
            li++;
          });

        }
      }
    }
    this._clusterTexture.update();
  }
}