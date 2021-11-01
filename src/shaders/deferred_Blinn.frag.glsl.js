export default function(params) {
    return `
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];

  uniform sampler2D u_lightbuffer;
  uniform mat4 u_viewMatrix;
  uniform float u_clipDist;
  uniform vec3 u_cameraPos;


  // TODO: Read this buffer to determine the lights influencing a cluster
  uniform sampler2D u_clusterbuffer;

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
  
  varying vec2 v_uv;
  
  void main() {
    // TODO: extract data from g buffers and do lighting
     vec4 gbPos = texture2D(u_gbuffers[0], v_uv);
     vec4 gbNor = texture2D(u_gbuffers[1], v_uv);
     vec4 albedo = texture2D(u_gbuffers[2], v_uv);
    // vec4 gb3 = texture2D(u_gbuffers[3], v_uv);

     vec3 fragColor = vec3(0.0);
     vec4 v_viewPos = u_viewMatrix * gbPos;

   
  int clusterX = int(gl_FragCoord.x / float(${params.cwidth}) * float(${params.numXSlices}));
  int clusterY = int(gl_FragCoord.y / float(${params.cheight}) * float(${params.numYSlices}));
  int clusterZ = int(v_viewPos.z / u_clipDist * float(${params.numZSlices}));

   int frustumIndex = clusterX + clusterY * ${params.numXSlices} + clusterZ * ${params.numXSlices} * ${params.numYSlices};
     int texHeight = int(ceil(float(${params.numLights + 1}) / 4.0));
     int numLights = int(ExtractFloat(u_clusterbuffer,
                                       ${params.numClusters},
                                       texHeight,
                                       frustumIndex,
                                       0));
  for(int i = 0; i < ${params.numLights}; i++) {
    if(i >= numLights) break;
    int lightIndex = int(ExtractFloat(u_clusterbuffer,
    ${params.numClusters},
    texHeight,
    frustumIndex,
    i + 1));
    
      Light light = UnpackLight(i);
      float lightDistance = distance(light.position, vec3(gbPos));
      vec3 LightVec = normalize(light.position - vec3(gbPos));
      float lambertTerm = max(dot(LightVec, vec3(gbNor)), 0.0);

      // Calculate the diffuse term for Lambert shading
      float diffuseTerm = dot(normalize(vec3(gbNor)), normalize(LightVec));
      // Avoid negative lighting values
      diffuseTerm = clamp(diffuseTerm, 0.0, 1.0);
  
      float ambientTerm = 0.02;
  
      float lightIntensity =  cubicGaussian(2.0 * lightDistance / light.radius);;
      //float lightIntensity = diffuseTerm + ambientTerm;
  
  
      vec3 a_viewDir = normalize(vec3(u_cameraPos) - vec3(gbPos));
      vec3 a_HalfWay =  normalize((vec3(LightVec) + a_viewDir)/2.0);
      float shininess = 40.0;
      vec3 specularIntensity = vec3(max(pow(dot(normalize(a_HalfWay), normalize(vec3(gbNor))), shininess), 0.0));

      fragColor += vec3( specularIntensity * lightIntensity +  vec3(albedo) * light.color * lambertTerm * lightIntensity);
    }

    gl_FragColor = vec4(vec3(fragColor), 1.0);
    //gl_FragColor = vec4(v_uv, 0.0, 1.0);
  }
  `;
}