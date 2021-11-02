export default function(params) {
  return `
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];
  uniform sampler2D u_lightbuffer;
  uniform mat4 u_viewMatrix;
  uniform vec3 u_frus_min;
  uniform vec3 u_frus_step;

  
  uniform sampler2D u_clusterbuffer;
  
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

  // Do I need to clamp x y z?
  ivec3 clusterLocation(vec3 v_pos) {
      int x = int(floor((v_pos.x + u_frus_min.x * v_pos.z) * float(${params.xSlices}) / (v_pos.z * u_frus_step.x)));
      int y = int(floor((v_pos.y + u_frus_min.y * v_pos.z) * float(${params.ySlices}) / (v_pos.z * u_frus_step.y)));
      // int x = int(gl_FragCoord.x * float(${params.xSlices}) / u_frus_step.x);
      // int y = int(gl_FragCoord.y * float(${params.ySlices}) / u_frus_step.y);
      int z = int(floor((v_pos.z - u_frus_min.z) * float(${params.zSlices}) / u_frus_step.z));
      return ivec3(x, y, z);
  }
  

  void main() {
    // TODO: extract data from g buffers and do lighting


    vec3 v_position = texture2D(u_gbuffers[0], v_uv).xyz;
    vec3 albedo = texture2D(u_gbuffers[1], v_uv).rgb;
    vec3 normal = texture2D(u_gbuffers[2], v_uv).xyz;

    vec3 fragColor = vec3(0.0);
    vec4 camSpacePos = u_viewMatrix * vec4(v_position, 1.0);
    ivec3 clusterIndex = clusterLocation(vec3(camSpacePos.xy, -camSpacePos.z));
    int clusterInd = clusterIndex.x + clusterIndex.y * ${params.xSlices} + clusterIndex.z * ${params.xSlices} * ${params.ySlices};
    int textureWidth = ${params.xSlices} * ${params.ySlices} * ${params.zSlices};
    int textureHeight = int(ceil(float((${params.maxLight} + 1) / 4)));
    int clusterLights = int(texture2D(u_clusterbuffer, vec2(float(clusterInd + 1) / float(textureWidth + 1), 0)).r);

    for (int i = 0; i < ${params.maxLight}; ++i) {
      if (i < clusterLights) {
        int clusterLights = int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, clusterInd, i));
        Light light = UnpackLight(i);
        float lightDistance = distance(light.position, v_position);
        vec3 L = (light.position - v_position) / lightDistance;
  
        float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
        float lambertTerm = max(dot(L, normal), 0.0);
  
        fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
      }

    }


    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}