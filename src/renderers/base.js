import TextureBuffer from './textureBuffer';
import { NUM_LIGHTS } from '../scene';
import { vec4 } from 'gl-matrix';

export const MAX_LIGHTS_PER_CLUSTER = 100;

const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

const clamp3 = ([v1, v2, v3], [min1, min2, min3], [max1, max2, max3]) =>
	[clamp(v1, min1, max1), clamp(v2, min2, max2), clamp(v3, min3, max3)];

export default class BaseRenderer {
	constructor(xSlices, ySlices, zSlices) {
		// Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
		this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
		this.slices = {
			x: xSlices,
			y: ySlices,
			z: zSlices,
		};
	}

	updateClusters(camera, viewMatrix, scene) {
		const slices = this.slices;
		const buffer = this._clusterTexture.buffer;
		const bufferIndex = (i, c) => this._clusterTexture.bufferIndex(i, c);

		const h = 2 * Math.tan((camera.fov / 2) * (2 * Math.PI / 360));
		const w = h * camera.aspect;

		for (let z = 0; z < slices.z; z++) {
			for (let y = 0; y < slices.y; y++) {
				for (let x = 0; x < slices.x; x++) {
					let i = x + y * slices.x + z * slices.x * slices.y;
			 		// Reset the light count to 0 for every cluster
				 	buffer[bufferIndex(i, 0)] = 0;
				}
			}
		}


		/* iterate over the lights, determine minimum and maximum coords
		 * (transformed from model to view), and write the indices to the clusterTexture buffer */
		for (let i = 0; i < NUM_LIGHTS; i++) {
			const light = scene.lights[i];
			const pos = light.position;
			let radius = light.radius;

			const pos_view = vec4.transformMat4([], vec4.fromValues(pos[0], pos[1], pos[2], 1.0), viewMatrix);
			pos_view[2] = -pos_view[2];

			/* determine the minimum and maximum coords of the bounding box in the transformed (frustum) view */
			let mins = [
				(pos_view[0] - radius) * slices.x / (w * pos_view[2]) + slices.x / 2,
				(pos_view[1] - radius) * slices.y / (h * pos_view[2]) + slices.y / 2,
				(pos_view[2] - radius) * slices.z / camera.far
			];
			let maxs = [
				(pos_view[0] + radius) * slices.x / (w * pos_view[2]) + slices.x / 2,
				(pos_view[1] + radius) * slices.y / (h * pos_view[2]) + slices.y / 2,
				(pos_view[2] + radius) * slices.z / camera.far
			];

			mins = clamp3(mins.map(Math.floor), [0, 0, 0], [slices.x - 1, slices.y - 1, slices.z - 1]);
			maxs = clamp3(maxs.map(Math.floor), [0, 0, 0], [slices.x - 1, slices.y - 1, slices.z - 1]);

			for (let z = mins[2]; z <= maxs[2]; z++) {
				for (let y = mins[1]; y <= maxs[1]; y++) {
					for (let x = mins[0]; x <= maxs[0]; x++) {
						const idx = x + y * slices.x + z * slices.x * slices.y;
						const light_count = buffer[bufferIndex(idx, 0)] + 1;

						if (light_count > MAX_LIGHTS_PER_CLUSTER)
							continue;

						buffer[bufferIndex(idx, 0)] = light_count;
						buffer[bufferIndex(idx, Math.floor(light_count / 4)) + light_count % 4] = i;
					}
				}
			}

		}
		this._clusterTexture.update();
	}
}
