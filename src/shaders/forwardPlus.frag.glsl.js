import { MAX_LIGHTS_PER_CLUSTER } from '../renderers/base.js';

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

  uniform int u_slices_x;
  uniform int u_slices_y;
  uniform int u_slices_z;

  uniform float u_cam_near;
  uniform float u_cam_far;

  uniform mat4 u_view_mat;
  uniform mat4 u_proj_mat;

  uniform int u_max_light;

  varying vec3 v_position;
  varying vec3 v_normal;
  varying vec2 v_uv;

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

  int find_cluster(vec3 pos) {
    // World space to screen space
    vec4 pos_view = u_view_mat * vec4(pos, 1);
    vec4 pos_screen = u_proj_mat * pos_view;
    pos_screen /= pos_screen[3];

    // Corresponding coords of cluster
    int x_coord = int(float(u_slices_x) * (pos_screen[0] + 1.0) / 2.0);
    int y_coord = int(float(u_slices_y) * (pos_screen[1] + 1.0) / 2.0);
    int z_coord = int(float(u_slices_z) * (pos_screen[2] + 1.0) / 2.0);

    // Exp. view space z coord of cluster
    // int z_coord = int(floor(log(max(-pos_view[2], 0.0001) / u_cam_near) * float(u_slices_z) / log(u_cam_far / u_cam_near)));

    return x_coord + y_coord * u_slices_x + z_coord * u_slices_x * u_slices_y;
  }

  void main() {
    vec3 albedo = texture2D(u_colmap, v_uv).rgb;
    vec3 normap = texture2D(u_normap, v_uv).xyz;
    vec3 normal = applyNormalMap(v_normal, normap);

    // Determine the cluster
    int tar_cluster = find_cluster(v_position);

    // Read in the lights in that cluster
    int cluster_width = u_slices_x * u_slices_y * u_slices_z;
    int cluster_height = int(ceil((float(u_max_light) + 1.0) / 4.0));

    // Get number of lights
    int num_light = int(ExtractFloat(u_clusterbuffer, cluster_width, cluster_height, tar_cluster, 0));

    vec3 fragColor = vec3(0.0);
    for (int i = 0; i < ${params.numLights}; i++) {
      // Only do shading for lights in cluster
      if (i >= num_light) {
        break;
      }

      // Get id of each light
      int tar_light = int(ExtractFloat(u_clusterbuffer, cluster_width, cluster_height, tar_cluster, i + 1));

      // Shading like Forward
      Light light = UnpackLight(tar_light);
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
