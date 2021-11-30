export default function(params) {
  return `
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];
  
  varying vec2 v_uv;


  // TODO: This is pretty much just a clone of forward.frag.glsl.js
  uniform sampler2D u_colmap;
  uniform sampler2D u_normap;
  uniform sampler2D u_lightbuffer;

  // TODO: Read this buffer to determine the lights influencing a cluster
  uniform sampler2D u_clusterbuffer;

  uniform float u_near;
  uniform float u_far;
  uniform mat4 u_viewMatrix;
  uniform vec3 u_camPos;
  uniform int u_maxLightPerCluster;



  vec3 applyNormalMap(vec3 geomnor, vec3 normap) {
    normap = normap * 2.0 - 1.0;
    vec3 up = normalize(vec3(0.001, 1, 0.001));
    vec3 surftan = normalize(cross(geomnor, up));
    vec3 surfbinor = cross(geomnor, surftan);
    return normap.y * surftan + normap.x * surfbinor + normap.z * geomnor;
  }

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
    vec3 albedo = texture2D(u_gbuffers[0], v_uv).xyz;
    vec3 v_position = texture2D(u_gbuffers[1], v_uv).xyz;
    vec3 normal;
    float pX = texture2D(u_gbuffers[0], v_uv).w;
    float pY = texture2D(u_gbuffers[1], v_uv).w;

    float denom = 2.0 / (1.0 + pX * pX + pY * pY);
    normal.x = pX * denom;
    normal.y = pY * denom;
    normal.z = denom - 1.0;
    //normal = normalize(normal);
    //vec3 normal = texture2D(u_gbuffers[2], v_uv).xyz;

    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

    int xSlices = int(${params.xSlices});
    int ySlices = int(${params.ySlices});
    int zSlices = int(${params.zSlices});

    float canvasWidth = float(${params.canvasWidth});
    float canvasHeight = float(${params.canvasHeight});

    vec3 fragColor = vec3(0.0);

    int textureWidth = xSlices * ySlices * zSlices;
    int textureHeight = int(ceil(float(u_maxLightPerCluster + 1) / 4.0));


    int xIdx = int(floor(gl_FragCoord.x / canvasWidth * float(xSlices)));
    int yIdx = int(floor(gl_FragCoord.y / canvasHeight * float(ySlices)));

    vec4 v_position_view = u_viewMatrix * vec4(v_position, 1);
    int zIdx = int( (v_position_view.z - u_near) / (u_far - u_near) * float(zSlices));
    int clusterIdx = xIdx + yIdx * xSlices + zIdx * xSlices * ySlices;

    int lightNum = int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, clusterIdx,0));


    for (int i = 0; i < ${params.numLights}; ++i) {

      if(i >= lightNum){
        break;
      }

      int lightIdx = int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, clusterIdx, i + 1 ));

      Light light = UnpackLight(lightIdx);
      float lightDistance = distance(light.position, v_position);
      vec3 L = (light.position - v_position) / lightDistance;

      vec3 viewDir = normalize(u_camPos - v_position);

      vec3 h = normalize(viewDir + L);

      float NdotH = dot(normal, h);

      float specularTerm = pow(clamp(NdotH, 0.0, 1.0), 150.0);

      float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
      float lambertTerm = max(dot(L, normal), 0.0);

      fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
      fragColor += light.color * specularTerm * vec3(lightIntensity);
    }

    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}