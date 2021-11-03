import { makeRenderLoop, camera, cameraControls, gui, gl, visCam } from './init';
import ForwardRenderer from './renderers/forward';
import ForwardPlusRenderer from './renderers/forwardPlus';
import ClusteredDeferredRenderer from './renderers/clusteredDeferred';
import Scene from './scene';
import Wireframe from './wireframe';
import { Matrix4, Vector3, Vector4, PerspectiveCamera } from 'three';

const FORWARD = 'Forward';
const FORWARD_PLUS = 'Forward+';
const CLUSTERED = 'Clustered Deferred';

const DISPLAY_WIREFRAME = true;
const X_SLICES = 3.0;
const Y_SLICES = 3.0;
const Z_SLICES = 3.0;
const VIEW_FRUSTUM_FAR_CLIP = 100.0;

const params = {
  renderer: FORWARD_PLUS,
  _renderer: null,
};

setRenderer(params.renderer);

function setRenderer(renderer) {
  switch(renderer) {
    case FORWARD:
      params._renderer = new ForwardRenderer();
      break;
    case FORWARD_PLUS:
      params._renderer = new ForwardPlusRenderer(2, 2, 2);
      break;
    case CLUSTERED:
      params._renderer = new ClusteredDeferredRenderer(15, 15, 15);
      break;
  }
}

gui.add(params, 'renderer', [FORWARD, FORWARD_PLUS, CLUSTERED]).onChange(setRenderer);

const scene = new Scene();
scene.loadGLTF('models/sponza/sponza.gltf');

camera.position.set(-10, 8, 0);
cameraControls.target.set(0, 2, 0);

// LOOK: The Wireframe class is for debugging.
// It lets you draw arbitrary lines in the scene.
// This may be helpful for visualizing your frustum clusters so you can make
// sure that they are in the right place.
const wireframe = new Wireframe();

//wireframe.addLineSegment([0, 0, 0], [0, 0, 1], [0, 0, 1]);

/*var segmentStart = [-14.0, 0.0, -6.0];
var segmentEnd = [14.0, 20.0, 6.0];
var segmentColor = [1.0, 0.0, 0.0];
wireframe.addLineSegment(segmentStart, segmentEnd, segmentColor);
wireframe.addLineSegment([-14.0, 1.0, -6.0], [14.0, 21.0, 6.0], [0.0, 1.0, 0.0]);*/


gl.enable(gl.DEPTH_TEST);

let firstRender = true;
let newCam;

function render() {
  scene.update();  
  params._renderer.render(camera, scene);

  // LOOK: Render wireframe "in front" of everything else.
  // If you would like the wireframe to render behind and in front
  // of objects based on relative depths in the scene, comment out /
  //the gl.disable(gl.DEPTH_TEST) and gl.enable(gl.DEPTH_TEST) lines.
  
  if(firstRender && DISPLAY_WIREFRAME){
    firstRender= false;
    // create new camera so that
    //    1. It doesn't update with the camera controls
    //    2. We can set a different far clipping plane for easier viewing
    newCam = camera.clone();
    newCam.far = VIEW_FRUSTUM_FAR_CLIP;
    newCam.updateProjectionMatrix();
    wireframe.showClusters(newCam, X_SLICES, Y_SLICES, Z_SLICES, scene.lights);
    //wireframe.showLights(scene.lights);
  }
  else if (DISPLAY_WIREFRAME){
    wireframe.destroy();

    //wireframe.showLights(scene.lights);
    wireframe.showClusters(newCam, X_SLICES, Y_SLICES, Z_SLICES, scene.lights);
  }
  gl.disable(gl.DEPTH_TEST);
  wireframe.render(camera);
  gl.enable(gl.DEPTH_TEST);
}

makeRenderLoop(render)();