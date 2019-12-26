// map.js: all of the cartographic code
'use strict';


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
