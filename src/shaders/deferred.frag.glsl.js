export default function(params) {
  return `
  #version 100
  precision highp float;
  
  uniform sampler2D u_gbuffers[${params.numGBuffers}];

  uniform sampler2D u_lightbuffer;

  uniform sampler2D u_clusterbuffer;

  uniform int u_slices_x;
  uniform int u_slices_y;
  uniform int u_slices_z;

  uniform mat4 u_view_proj_mat;

  uniform int u_max_light;

  uniform vec3 u_cam_pos;
  
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

  int find_cluster(vec3 pos) {
    // World space to screen space
    vec4 pos_screen = u_view_proj_mat * vec4(pos, 1);
    pos_screen /= pos_screen[3];

    // Corresponding coords of cluster
    int x_coord = int(float(u_slices_x) * (pos_screen[0] + 1.0) / 2.0);
    int y_coord = int(float(u_slices_y) * (pos_screen[1] + 1.0) / 2.0);
    int z_coord = int(float(u_slices_z) * (pos_screen[2] + 1.0) / 2.0);

    return x_coord + y_coord * u_slices_x + z_coord * u_slices_x * u_slices_y;
  }

  // Code from https://jcgt.org/published/0003/02/01/paper.pdf
  vec2 sign_not_zero(vec2 v) {
      return vec2((v.x >= 0.0) ? +1.0 : -1.0, (v.y >= 0.0) ? +1.0 : -1.0);
  }
  vec3 decode_normal(vec2 e) {
    vec3 v = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    if (v.z < 0.0) v.xy = (1.0 - abs(v.yx)) * sign_not_zero(v.xy);
    return normalize(v);
  }

  // Specular part in Blinn-Phong shading
  float phong_specular(vec3 pos, vec3 light_dir, vec3 norm, float shininess) {
    vec3 view_dir = normalize(u_cam_pos - pos);
    vec3 H = (view_dir + light_dir) / 2.0;
    float spec = pow(max(dot(norm, normalize(H)), 0.0), shininess);
    return spec;
  }
  
  void main() {
    // TODO: extract data from g buffers and do lighting
    // vec3 position = texture2D(u_gbuffers[0], v_uv).xyz;
    // vec3 normal = texture2D(u_gbuffers[1], v_uv).xyz;
    // vec3 albedo = texture2D(u_gbuffers[2], v_uv).rgb;

    // Use compact g-buffers
    vec4 buffer1 = texture2D(u_gbuffers[0], v_uv);
    vec4 buffer2 = texture2D(u_gbuffers[1], v_uv);
    vec3 position = buffer1.xyz;
    vec3 normal = decode_normal(vec2(buffer1.w, buffer2.x));
    vec3 albedo = buffer2.yzw;
    //

    // Determine the cluster
    int tar_cluster = find_cluster(position);

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
      float lightDistance = distance(light.position, position);
      vec3 L = (light.position - position) / lightDistance;

      float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
      float lambertTerm = max(dot(L, normal), 0.0);

      fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);

      // Blinn-Phong shading
      float specular_term = phong_specular(position, L, normal, 32.0);
      fragColor += albedo * specular_term * light.color * vec3(lightIntensity);
    }

    const vec3 ambientLight = vec3(0.025);
    fragColor += albedo * ambientLight;

    gl_FragColor = vec4(fragColor, 1.0);

    // Uncomment to render position map
    // gl_FragColor = vec4(position / 10.0, 1.0);
    //
    // Uncomment to render normal map
    // gl_FragColor = vec4((normal + 1.0) / 2.0, 1.0);
    //
    // Uncomment to render albedo map
    // gl_FragColor = vec4(albedo, 1.0);
    //
  }
  `;
}