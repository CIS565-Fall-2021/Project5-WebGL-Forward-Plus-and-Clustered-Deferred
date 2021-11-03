import { vec3 } from "gl-matrix";
import {Vector3, Matrix4, Vector4, Plane, Sphere} from "three";
import { PerspectiveCamera } from 'three';

class SubfrustumPlane {
    constructor(p1, p2, p3, p4){
      this.p1 = p1;
      this.p2 = p2;
      this.p3 = p3;
      this.p4 = p4;
      this.plane = new Plane;
      this.plane.setFromCoplanarPoints(new Vector3(this.p1[0], this.p1[1], this.p1[2]), 
                                       new Vector3(this.p2[0], this.p2[1], this.p2[2]), 
                                       new Vector3(this.p3[0], this.p3[1], this.p3[2]));
    }
  
    display(wireframe, color) {
      wireframe.addLineSegment([this.p1[0], this.p1[1], this.p1[2]], [this.p2[0], this.p2[1], this.p2[2]], color);
      wireframe.addLineSegment([this.p2[0], this.p2[1], this.p2[2]], [this.p3[0], this.p3[1], this.p3[2]], color);
      wireframe.addLineSegment([this.p3[0], this.p3[1], this.p3[2]], [this.p4[0], this.p4[1], this.p4[2]], color);
      wireframe.addLineSegment([this.p4[0], this.p4[1], this.p4[2]], [this.p1[0], this.p1[1], this.p1[2]], color);
    }

    isInsidePlane(lightPosVec){
        let subVectors = new Vector3;
         subVectors.subVectors(lightPosVec, new Vector3(this.p1[0], this.p1[1], this.p1[2]));
         //console.log(this.plane.normal);
         //console.log(subVectors);
         let isInsidePlane = this.plane.normal.dot(subVectors) < 0;
         //console.log(this.plane.normal.dot(subVectors));
         return isInsidePlane;
    }

    lightIntersects(lightPos, lightRadius){
        let lightPosVec = new Vector3(lightPos[0], lightPos[1], lightPos[2]);
         let sphere = new Sphere(lightPosVec, lightRadius);
         let intersectsPlane = this.plane.intersectsSphere(sphere);

         // check if in bounds
         if (intersectsPlane) {
            // find distance to nearest frustum point
            // if distance > radius, doesn't overlap bounded plane
            let minDist = lightPosVec.distanceTo(new Vector3(this.p1[0], this.p1[1], this.p1[2]));
            minDist = Math.min(minDist, lightPosVec.distanceTo(new Vector3(this.p2[0], this.p2[1], this.p2[2])));
            minDist = Math.min(minDist, lightPosVec.distanceTo(new Vector3(this.p3[0], this.p3[1], this.p3[2])));
            minDist = Math.min(minDist, lightPosVec.distanceTo(new Vector3(this.p4[0], this.p4[1], this.p4[2])));

            if (minDist > lightRadius) {
                return false;
            } else {
                return true;
            }
         }

        return intersectsPlane;
    }
}
  
  class Subfrustum {
    constructor(minX, minY, minZ, maxX, maxY, maxZ, camera){
      this.minX = minX;
      this.minY = minY;
      this.minZ = minZ;
      this.maxX = maxX;
      this.maxY = maxY;
      this.maxZ = maxZ;
      this.camera = camera;
      this.plane1 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.plane2 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.plane3 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.plane4 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.plane5 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.plane6 = new SubfrustumPlane(new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0), new Vector3(0,0,0));
      this.p1 = [0, 0, 0];
      this.p2 = [0, 0, 0];
      this.p3 = [0, 0, 0];
      this.p4 = [0, 0, 0];
      this.p5 = [0, 0, 0];
      this.p6 = [0, 0, 0];
      this.p7 = [0, 0, 0];
      this.p8 = [0, 0, 0];

    }
  
    projectPoint(p) {
        // create the view projection matrix
        let viewMat = this.camera.matrixWorldInverse;
        let projMat = this.camera.projectionMatrix;
        let viewProj = new Matrix4;
        viewProj.multiplyMatrices(viewMat, viewMat);
        viewProj.multiplyMatrices(projMat, viewMat);
        viewProj.invert();

        // apply the viewProj matrix to the screen-space frustum points
        let pVec4 = new Vector4(p.x, p.y, p.z, 1);
        pVec4.applyMatrix4(viewProj);
        pVec4.divideScalar(pVec4.w);
        return [pVec4.x, pVec4.y, pVec4.z];
    }
  
    create() {
      // Given unit x,y,z max and min locations, create points and project them
      // based on viewProj matrix
      this.p1 = this.projectPoint(new Vector3(this.minX, this.minY, this.minZ));
      this.p2 = this.projectPoint(new Vector3(this.maxX, this.minY, this.minZ));
      this.p3 = this.projectPoint(new Vector3(this.maxX, this.maxY, this.minZ));
      this.p4 = this.projectPoint(new Vector3(this.minX, this.maxY, this.minZ));
      this.p5 = this.projectPoint(new Vector3(this.minX, this.minY, this.maxZ));
      this.p6 = this.projectPoint(new Vector3(this.maxX, this.minY, this.maxZ));
      this.p7 = this.projectPoint(new Vector3(this.maxX, this.maxY, this.maxZ));
      this.p8 = this.projectPoint(new Vector3(this.minX, this.maxY, this.maxZ));
  
      // create the subfrustum planes making up this frustum
      this.plane1 = new SubfrustumPlane(this.p1, this.p2, this.p3, this.p4);
      this.plane2 = new SubfrustumPlane(this.p2, this.p6, this.p7, this.p3);
      this.plane3 = new SubfrustumPlane(this.p6, this.p5, this.p8, this.p7);
      this.plane4 = new SubfrustumPlane(this.p5, this.p1, this.p4, this.p8);
      this.plane5 = new SubfrustumPlane(this.p5, this.p6, this.p2, this.p1);
      this.plane6 = new SubfrustumPlane(this.p4, this.p3, this.p7, this.p8);
    }
  
    display(wireframe) {
      //let color = [ 0.5 + 0.5 * Math.random(), 0.5 + 0.5 * Math.random(), 0.5 + Math.random()];
      let color = [1, 1, 1];
      this.plane1.display(wireframe, color);
      this.plane2.display(wireframe, color);
      this.plane3.display(wireframe, color);
      this.plane4.display(wireframe, color);
      this.plane5.display(wireframe, color);
      this.plane6.display(wireframe, color);
    }

    highlight(wireframe){
        let color = [ 1, 0, 0 ];
      this.plane1.display(wireframe, color);
      this.plane2.display(wireframe, color);
      this.plane3.display(wireframe, color);
      this.plane4.display(wireframe, color);
      this.plane5.display(wireframe, color);
      this.plane6.display(wireframe, color);
    }

    isInsideFrustum(p){
        let isInsideFrustum = true;

        let posVec = new Vector3(p[0], p[1], p[2]);
        isInsideFrustum = isInsideFrustum && this.plane1.isInsidePlane(posVec);
        isInsideFrustum = isInsideFrustum && this.plane2.isInsidePlane(posVec);
        isInsideFrustum = isInsideFrustum && this.plane3.isInsidePlane(posVec);
        isInsideFrustum = isInsideFrustum && this.plane4.isInsidePlane(posVec);
        isInsideFrustum = isInsideFrustum && this.plane5.isInsidePlane(posVec);
        isInsideFrustum = isInsideFrustum && this.plane6.isInsidePlane(posVec);
        return isInsideFrustum;
    }

    lightIntersects(light, lightRadius) {
        let doesIntersect = false;

        doesIntersect = doesIntersect || this.plane1.lightIntersects(light, lightRadius);
        doesIntersect = doesIntersect || this.plane2.lightIntersects(light, lightRadius);
        doesIntersect = doesIntersect || this.plane3.lightIntersects(light, lightRadius);
        doesIntersect = doesIntersect || this.plane4.lightIntersects(light, lightRadius);
        doesIntersect = doesIntersect || this.plane5.lightIntersects(light, lightRadius);
        doesIntersect = doesIntersect || this.plane6.lightIntersects(light, lightRadius);

        let isInsideFrustum = this.isInsideFrustum(light);

        return doesIntersect || isInsideFrustum;
    }

    getPoints() {
        return [this.p1, this.p2, this.p3, this.p4, this.p5, this.p6, this.p7, this.p8];
    }
  }

  export default Subfrustum;