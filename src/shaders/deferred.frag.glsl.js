import { glsl } from './shaderUtil'

export default function(params) {
  return glsl`
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];
  uniform sampler2D u_lightbuffer;
  uniform sampler2D u_clusterbuffer;
  uniform mat4 u_viewMatrix;
  uniform float u_nearPlane;
  uniform float u_farPlane;
  uniform vec3 u_camPos;
  
  varying vec2 v_uv;

  struct Light {
    vec3 position;
    float radius;
    vec3 color;
  };
 
  float ExtractFloat(sampler2D texture, int textureWidth, int textureHeight, int index, int component) {
    float u = float(index + 1) / float(textureWidth + 1);
    int pixel = component / 4;
    float v = float(pixel + 1) / float(textureHeight + 1);
    vec4 texel = texture2D(texture, vec2(u, v));
    int pixelComponent = component - pixel * 4;
    if (pixelComponent == 0) {
      return texel[0];
    } else if (pixelComponent == 1) {
      return texel[1];
    } else if (pixelComponent == 2) {
      return texel[2];
    } else if (pixelComponent == 3) {
      return texel[3];
    }
  }

  Light UnpackLight(int index) {
    Light light;
    float u = float(index + 1) / float(${params.numLights + 1});
    vec4 v1 = texture2D(u_lightbuffer, vec2(u, 0.3));
    vec4 v2 = texture2D(u_lightbuffer, vec2(u, 0.6));
    light.position = v1.xyz;

    // LOOK: This extracts the 4th float (radius) of the (index)th light in the buffer
    // Note that this is just an example implementation to extract one float.
    // There are more efficient ways if you need adjacent values
    light.radius = ExtractFloat(u_lightbuffer, ${params.numLights}, 2, index, 3);

    light.color = v2.rgb;
    return light;
  }

  // Cubic approximation of gaussian curve so we falloff to exactly 0 at the light radius
  float cubicGaussian(float h) {
    if (h < 1.0) {
      return 0.25 * pow(2.0 - h, 3.0) - pow(1.0 - h, 3.0);
    } else if (h < 2.0) {
      return 0.25 * pow(2.0 - h, 3.0);
    } else {
      return 0.0;
    }
  }

  vec2 signNotZero(vec2 v) 
  { 
      return vec2((v.x >= 0.0) ? +1.0 : -1.0, (v.y >= 0.0) ? +1.0 : -1.0);
  }  

  vec3 oct_to_float32x3(vec2 e) { 
    vec3 v = vec3(e.xy, 1.0 -abs(e.x) -abs(e.y)); 
    if (v.z < 0.0) {
      v.xy = (1.0 -abs(v.yx)) * signNotZero(v.xy);
    }
    return normalize(v); 
  }
  
  void main() {
    vec4 gBuf0 = texture2D(u_gbuffers[0], v_uv);
    vec4 gBuf1 = texture2D(u_gbuffers[1], v_uv);
    // vec4 gBuf2 = texture2D(u_gbuffers[2], v_uv);

    vec3 pos = gBuf0.xyz;
    vec3 albedo = gBuf1.rgb;
    // vec3 normal = gBuf2.xyz;
    vec3 normal = oct_to_float32x3(vec2(gBuf0.w, gBuf1.w));

    vec3 fragColor = vec3(0.0);

    int clusterIdxX = int(gl_FragCoord.x / float(${params.canvasWidth}) * float(${params.xSlices}));
    int clusterIdxY = int(gl_FragCoord.y / float(${params.canvasHeight}) * float(${params.ySlices}));
    int clusterIdxZ = int((-(u_viewMatrix * vec4(pos, 1.0)).z - u_nearPlane) / (u_farPlane - u_nearPlane) * float(${params.zSlices}));
    int clusterIdx = clusterIdxX + clusterIdxY * ${params.xSlices} + clusterIdxZ * ${params.ySlices} * ${params.xSlices};
    int clusterTexHeight = ${params.numLights} / 4 + 1;
    int clusterTexWidth = ${params.xSlices} * ${params.ySlices} * ${params.zSlices};
    int lightCount = int(ExtractFloat(u_clusterbuffer, clusterTexWidth, clusterTexHeight, clusterIdx, 0));

    for (int i = 1; i <= ${params.numLights}; i += 1) {
      if (i > lightCount) break;
      int lightIdx = int(ExtractFloat(u_clusterbuffer, clusterTexWidth, clusterTexHeight, clusterIdx, i));
      
      Light light = UnpackLight(lightIdx);
      float lightDistance = distance(light.position, pos);
      vec3 L = (light.position - pos) / lightDistance;

      float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
      float lambertTerm = max(dot(L, normal), 0.0);

      fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);

      vec3 halfVec = normalize(L + normalize(u_camPos - pos));
      float specular = pow(max(dot(normal, halfVec), 0.0), 1024.0);
      fragColor += specular * light.color * vec3(lightIntensity);      
    }

    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}