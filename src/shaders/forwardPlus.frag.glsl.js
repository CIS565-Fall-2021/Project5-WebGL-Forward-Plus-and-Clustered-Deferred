export default function(params) {
  return `
  // TODO: This is pretty much just a clone of forward.frag.glsl.js

  #version 100
  precision highp float;

  uniform sampler2D u_colmap;
  uniform sampler2D u_normap;
  uniform sampler2D u_lightbuffer;

  // TODO: Read this buffer to determine the lights influencing a cluster
  uniform sampler2D u_clusterbuffer;
  uniform sampler2D u_clusterCoordBuffer;
  uniform int u_numClusters;

  varying vec3 v_position;
  varying vec3 v_normal;
  varying vec2 v_uv;

  const int numClusters = 2 * 2 * 2;

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

  struct Plane {
    vec3 p1;
    vec3 p2;
    vec3 p3;
    vec3 p4;
    vec3 n;
  };

  struct Cluster {
    Plane plane1;
    Plane plane2;
    Plane plane3;
    Plane plane4;
    Plane plane5;
    Plane plane6;
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

  void ExtractPositions(sampler2D texture, int textureWidth, int textureHeight, int index, out vec3 positions[8]) {
    float u = float(index + 1) / float(textureWidth + 1);

    for (int pixel = 0 ; pixel < 8; pixel++) {
      float v = float(pixel + 1) / float(textureHeight + 1);
      vec4 texel = texture2D(texture, vec2(u, v));
      positions[pixel] = vec3(texel[0], texel[1], texel[2]);
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

  Cluster UnpackCluster(int index) {
    Cluster cluster;
    vec3 positions[8];
    ExtractPositions(u_clusterCoordBuffer, 1, 8, index, positions);
    cluster.plane1 = Plane(positions[0], positions[1], positions[2], positions[3], vec3(0, 0, 0));
    cluster.plane2 = Plane(positions[1], positions[5], positions[6], positions[2], vec3(0, 0, 0));
    cluster.plane3 = Plane(positions[5], positions[4], positions[7], positions[6], vec3(0, 0, 0));
    cluster.plane4 = Plane(positions[4], positions[0], positions[3], positions[7], vec3(0, 0, 0));
    cluster.plane5 = Plane(positions[4], positions[5], positions[1], positions[0], vec3(0, 0, 0));
    cluster.plane6 = Plane(positions[3], positions[2], positions[6], positions[7], vec3(0, 0, 0));

    return cluster;
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

  vec3 getNormal(vec3 p1, vec3 p2, vec3 p3){
    vec3 v1 = p1 - p2;
    vec3 v2 = p3 - p2;
    return normalize(cross(v1, v2));
  }

  int getCluster(vec3 fragPos) {
    // loop through clusters
    for (int clusterIdx = 0; clusterIdx < numClusters; clusterIdx++) {
      // unpack cluster
      Cluster cluster = UnpackCluster(clusterIdx);

      // get normals for each plane
      bool isInside = true;
      Plane planes[6];
      planes[0] = cluster.plane1;
      planes[1] = cluster.plane2;
      planes[2] = cluster.plane3;
      planes[3] = cluster.plane4;
      planes[4] = cluster.plane5;
      planes[5] = cluster.plane6;

      for (int planeIdx = 0; planeIdx < 6; planeIdx++) {
        Plane plane = planes[planeIdx];
        plane.n = getNormal(plane.p1, plane.p2, plane.p3);

        vec3 dir = normalize(fragPos - plane.p1);
        isInside = isInside && (dot(-dir, plane.n) < 0.0);
      }
      if (isInside) return clusterIdx;
    }
    return -1;
  }

  void main() {
    vec3 albedo = texture2D(u_colmap, v_uv).rgb;
    vec3 normap = texture2D(u_normap, v_uv).xyz;
    vec3 normal = applyNormalMap(v_normal, normap);

    vec3 fragColor = vec3(0.0);  

    // determine the cluster for a fragment
    int clusterIdx = getCluster(v_position.xyz);
    // read in the lights in that cluster from the populated data
         //if (clusterIdx > 0){
           //int clusterBufferHeight = int(ceil(101.0 / 4.0));
           //int numLights = int(ExtractFloat(u_clusterbuffer, numClusters, clusterBufferHeight, clusterIdx, 0));
           //for (int i = 1; i < ${params.numLights} + 1; i++){
            // if (i > numLights) break;
            // int lightIdx = int(ExtractFloat(u_clusterbuffer, numClusters, clusterBufferHeight, clusterIdx, i));
             //Light light = UnpackLight(i);
             //float lightDistance = distance(light.position, v_position);
            // vec3 L = (light.position - v_position) / lightDistance;

             //float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
             //float lambertTerm = max(dot(L, normal), 0.0);

             //fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
         // }
       // }

    for (int i = 0; i < ${params.numLights}; ++i) {
      Light light = UnpackLight(i);
      float lightDistance = distance(light.position, v_position);
      vec3 L = (light.position - v_position) / lightDistance;

      float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
      float lambertTerm = max(dot(L, normal), 0.0);

      fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
    }

    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);
  }
  `;
}
