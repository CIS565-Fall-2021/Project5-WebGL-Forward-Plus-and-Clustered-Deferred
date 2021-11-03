import { gl, canvas } from '../init';
import { loadShaderProgram, renderFullscreenQuad } from '../utils';
import QuadVertSource from '../shaders/quad.vert.glsl';
import fsSource from '../shaders/bloom.frag.glsl';

export default class BloomRenderer {
  constructor() {    
    this._prog = loadShaderProgram(QuadVertSource, fsSource({
      canvasHeight: canvas.height,
      canvasWidth: canvas.width,
    }), {
      uniforms: ['u_renderTex'],
      attribs: ['a_uv'],
    });

    this._fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

    this._renderTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._renderTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.FLOAT, null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._renderTex, 0);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(this._prog.glShaderProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._renderTex);
    gl.uniform1i(this._prog.u_renderTex, 0);

    renderFullscreenQuad(this._prog);
  }
}