#version 100
#extension GL_EXT_draw_buffers: enable
precision highp float;

uniform sampler2D u_colmap;
uniform sampler2D u_normap;

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

 vec2 signNotZero( vec2 v) {
		return  vec2((v.x >= 0.0) ? +1.0 : -1.0, (v.y >= 0.0) ? +1.0 : -1.0);
	}

 vec2 float32x3_to_Oct( vec3 normal)
	{

		// this value is for non defined value custom
		if (abs(normal.x) == 0.0 && abs(normal.y) == 0.0 && abs(normal.z) == 0.0)
		{
			return  vec2(-2.0 , -2.0);
		}


		// Project the sphere onto the octahedron, and then onto the xy plane
		 vec2 p =  vec2(normal.x, normal.y) * ( 1.0 / (abs(normal.x) + abs(normal.y) + abs(normal.z)));
		// Reflect the folds of the lower hemisphere over the diagonals
		return (normal.z <= 0.0) ? (( 1.0 - abs( vec2(p.y, p.x))) * signNotZero(p) ) : p;
	}

void main() {
	
    vec3 norm = applyNormalMap(v_normal, vec3(texture2D(u_normap, v_uv)));
    vec3 col = vec3(texture2D(u_colmap, v_uv));

    // TODO: populate your g buffer
	vec2 normCompac= float32x3_to_Oct(norm);
    gl_FragData[0] = vec4(v_position, normCompac.x);
    gl_FragData[1] =  vec4( normCompac.y, col);
    // gl_FragData[3] = ??
}