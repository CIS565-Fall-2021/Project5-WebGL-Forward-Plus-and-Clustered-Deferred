export default function (params) {
  return `
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];
  uniform sampler2D u_colmap;
  uniform sampler2D u_lightbuffer;

  uniform sampler2D u_clusterbuffer;
  uniform mat4 u_viewMatrix;

  uniform float u_width;
  uniform float u_height;
  uniform float u_near;
  uniform float u_far;

  uniform float u_xSlices;
  uniform float u_ySlices;
  uniform float u_zSlices;

  uniform int u_pixelsPerElement;
  uniform int u_elementCount;

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
  
  void main() {
    // TODO: extract data from g buffers and do lighting
    vec4 gb0 = texture2D(u_gbuffers[0], v_uv);
    vec4 gb1 = texture2D(u_gbuffers[1], v_uv);
    vec4 gb2 = texture2D(u_gbuffers[2], v_uv);

    // extract data from gbuffers
    vec3 albedo = gb0.xyz;
    vec3 v_position = gb1.rgb;
    vec3 normal = vec3(0.0, 0.0, 0.0);

    bool optimize = false;
    if (optimize) {
      float z = sqrt(1.0 - (gb0.w * gb0.w) - (gb1.w * gb1.w)); // distance formula with normalized vec
      normal = vec3(gb0.w, gb1.w, z);
    } else {
      normal = gb2.xyz;
    }

    // Convert position to camera space
    vec4 cs = u_viewMatrix * vec4(v_position, 1.0);
    cs.z *= -1.0;

    // Determine the current cluster
    int x = int(gl_FragCoord.x * u_xSlices / u_width);
    int y = int(gl_FragCoord.y * u_ySlices / u_height);
    int z = int((cs.z - u_near) * u_zSlices / (u_far - u_near));

    // Compute 1D index
    int index = x + (y * int(u_xSlices)) + (z * int(u_xSlices) * int(u_ySlices));

    // Extract number of lights from texture buffer
    int numLights = int(ExtractFloat(u_clusterbuffer, u_elementCount, u_pixelsPerElement, index, 0));

    vec3 fragColor = vec3(0.0);
    for (int i = 0; i < ${params.numLights}; ++i) {
      if (i < numLights) {
        int lightIndex = int(ExtractFloat(u_clusterbuffer, u_elementCount, u_pixelsPerElement, index, i + 1));
        Light light = UnpackLight(lightIndex);
        float lightDistance = distance(light.position, v_position);
        vec3 L = (light.position - v_position) / lightDistance;
        float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
        float lambertTerm = max(dot(L, normal), 0.0);

        bool blinnPhong = false;
        if (blinnPhong) {  //Blinn Phong adapted from CIS560 https://www.cis.upenn.edu/~cis460/21fa/index.html
          vec3 viewDir = normalize(u_camPos - v_position);
          vec3 lightDir = normalize(light.position - v_position);
          vec3 halfDir = normalize(viewDir + lightDir);
          float specIntensity = max(pow(dot(halfDir, normal), 10.0), 0.0);
          fragColor += specIntensity * light.color * vec3(lightIntensity);
        }

        fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
      }
    }
    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;
    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}
