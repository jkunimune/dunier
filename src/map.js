// map.js: all of the cartographic code
'use strict';

const MAP_PRECISION = 0.1;


class MapProjection {
	constructor(surface) {
		this.surface = surface;
	}

	map(polygon, svg, color) {
		const jinPoints = [];
		const cutPoints = [];
		for (const vertex of polygon) {
			const {u, v} = vertex.getCircumcenter();
			const {x, y} = this.project(u, v); // project each point to the plane
			jinPoints.push([u, v]);
			cutPoints.push([x, y]);
		}

		for (let i = 1; i < jinPoints.length; i ++) { // sweep through the resulting polygon
			const [x0, y0] = cutPoints[i];
			const [x1, y1] = cutPoints[(i + 1)%jinPoints.length];
			if (Math.hypot(x1 - x0, y1 - y0) > MAP_PRECISION) { // look for lines that are too long
				const [u0, v0] = jinPoints[i];
				const [u1, v1] = jinPoints[(i + 1)%jinPoints.length];
				const midPos = this.surface.xyz(u0, v0).plus(
					this.surface.xyz(u1, v1)).times(1/2); // and split them in half
				const {u, v} = this.surface.uv(midPos.x, midPos.y, midPos.z);
				const {x, y} = this.project(u, v);
				jinPoints.splice(i+1, 0, [u, v]); // add the midpoints to the polygon
				cutPoints.splice(i+1, 0, [x, y]);
				i --; // and check again
			}
		}

		svg.polygon(cutPoints).fill(color);
	}

	project(u, v) {
		throw "Unimplemented";
	}
}


class Azimuthal extends MapProjection {
	constructor(surface, svg) {
		super(surface, svg);
	}

	project(u, v) {
		const p = linterp(u, this.surface.refLatitudes, this.surface.cumulDistances);
		const r = 1 - p/this.surface.height;
		return {x: r*Math.sin(v), y: -r*Math.cos(v)};
	}
}
