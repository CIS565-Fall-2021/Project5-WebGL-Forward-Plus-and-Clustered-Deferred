import { MAX_LIGHTS_PER_CLUSTER }  from "../renderers/base"

export default function(num_lights, cam_far, cam_near, slices) {
	return `
	

#version 100
precision highp float;

#define BLINN_PHONG 1
#define BLINN_PHONG_EXP 8.0

uniform sampler2D u_colmap;
uniform sampler2D u_normap;
uniform sampler2D u_lightbuffer;

uniform sampler2D u_clusterbuffer;
uniform mat4 u_viewMatrix;
uniform int u_h;
uniform int u_w;

uniform vec3 u_camera_pos;


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
	return pixelComponent == 0 ? texel[0]
		: pixelComponent == 1 ? texel[1]
		: pixelComponent == 2 ? texel[2]
		: texel[3];
}

Light UnpackLight(int index) {
	Light light;
	float u = float(index + 1) / float(${num_lights + 1});
	vec4 v1 = texture2D(u_lightbuffer, vec2(u, 0.3));
	vec4 v2 = texture2D(u_lightbuffer, vec2(u, 0.6));
	light.position = v1.xyz;

	// LOOK: This extracts the 4th float (radius) of the (index)th light in the buffer
	// Note that this is just an example implementation to extract one float.
	// There are more efficient ways if you need adjacent values
	light.radius = ExtractFloat(u_lightbuffer, ${num_lights}, 2, index, 3);

	light.color = v2.rgb;
	return light;
}

// Cubic approximation of gaussian curve so we falloff to exactly 0 at the light radius
float cubicGaussian(float h) {
	return h < 1.0 ? 0.25 * pow(2.0 - h, 3.0) - pow(1.0 - h, 3.0)
		: h < 2.0 ? 0.25 * pow(2.0 - h, 3.0)
		:  0.0;
}

/* gives the index of the cluster this fragment is in */
int cluster_idx() {
	/* depth in the camera view (transformed from model view) */
	float z_depth = -(u_viewMatrix * vec4(v_position, 1.0)).z;

	/* determine coords of the cluster for the fragment */
	int x = int(gl_FragCoord.x / float(u_w) * float(${slices.x}));
	int y = int(gl_FragCoord.y / float(u_h) * float(${slices.y}));
	int z = int((z_depth - ${cam_near}) / float(${cam_far - cam_near}) * float(${slices.z}));

	return x + y * ${slices.x} + z * ${slices.x} * ${slices.y};
}


#if BLINN_PHONG
/*
 * returns the specular intensity contribution of this light point light source to the fragment's color
 * this implementation is based on CIS 460 HW 4 https://www.cis.upenn.edu/~cis460/21fa/hw/hw04/openglFun.html
 */
float blinn_phong(vec3 light_pos, vec3 surface_normal) {
	vec3 view_vec = normalize(u_camera_pos - v_position); /* view vector from fragment position to camera */
	vec3 light_vec = normalize(light_pos - v_position); /* vector from fragment position to light source */
	vec3 H = normalize((view_vec + light_vec) / 2.0);
	vec3 N = normalize(surface_normal);
	return max(pow(dot(H, N), BLINN_PHONG_EXP), 0.0);
}

#endif

void main() {
	vec3 albedo = texture2D(u_colmap, v_uv).rgb;
	vec3 normap = texture2D(u_normap, v_uv).xyz;
	vec3 normal = applyNormalMap(v_normal, normap);

	vec3 fragColor = vec3(0.0);

	/* based on element count and pixels per element as defined in textureBuffer */
	int textureWidth = ${slices.x * slices.y * slices.z};
	int textureHeight = ${Math.ceil((MAX_LIGHTS_PER_CLUSTER + 1) / 4)};

	int idx = cluster_idx();
	int cluster_num_lights = int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, idx, 0));
	/* get and iterate over the number of lights for this cluster (given by idx) */

	for (int i = 0; i < ${num_lights}; i++) {
		/* iterate over this cluster's lights */
		if (i >= cluster_num_lights)
			break;
		/* read in the lights in the cluster from clusterbuffer */
		Light light = UnpackLight(int(ExtractFloat(u_clusterbuffer, textureWidth, textureHeight, idx, i + 1)));
		//Light light = UnpackLight(i);
		/* shade those lights */
		float lightDistance = distance(light.position, v_position);
		vec3 L = (light.position - v_position) / lightDistance;

		float lightIntensity = cubicGaussian(2.0 * lightDistance / light.radius);
		float lambertTerm = 
	#if BLINN_PHONG
		blinn_phong(light.position, normal) + 
	#endif
		max(dot(L, normal), 0.0);

		fragColor += albedo * lambertTerm * light.color * vec3(lightIntensity);
	}

	const vec3 ambientLight = vec3(0.025);
	fragColor += albedo * ambientLight;

	gl_FragColor = vec4(fragColor, 1.0);
}

	`;
}
