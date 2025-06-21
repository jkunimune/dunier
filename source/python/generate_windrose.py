"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""

from __future__ import annotations

from typing import Optional

from numpy import sin, cos, arange, pi, radians

LAYER_HEIGHT = 6
INNER_RADIUS = 4*LAYER_HEIGHT - 1
BEND = 6


def generate_windrose():
	paths = []

	paths.append(circle(INNER_RADIUS + 3, "white", "none"))

	for bearing in arange(0, 360, 11.25):
		paths.append(ray(bearing, "lightgray"))

	for bearing in arange(0, 360, 22.5):
		left_shaded = bearing >= 180
		if bearing % 90 == 0:
			r0 = LAYER_HEIGHT
			dark_color = "dimgray"
			light_color = "gray"
		elif bearing % 45 == 0:
			r0 = 2*LAYER_HEIGHT
			dark_color = "gray"
			light_color = "darkgray"
		else:
			r0 = 3*LAYER_HEIGHT
			dark_color = "darkgray"
			light_color = "lightgray"
		r1 = INNER_RADIUS

		paths.append(point(bearing, r0, r1, not left_shaded, light_color))
		paths.append(point(bearing, r0, r1, left_shaded, dark_color))
		if r0 - LAYER_HEIGHT > 0:
			paths.append(point(bearing, r0 - 1, r0 - LAYER_HEIGHT, not left_shaded, "lightgray"))
			paths.append(point(bearing, r0 - 1, r0 - LAYER_HEIGHT, left_shaded, "darkgray"))

	paths.append(circle(INNER_RADIUS + 0.5, "none", "lightgray"))
	paths.append(circle(INNER_RADIUS + 2.5, "none", "lightgray"))
	paths.append(circle(LAYER_HEIGHT - 1, "dimgray", "none"))
	paths.append(star(LAYER_HEIGHT - 1, (LAYER_HEIGHT - 1)*.4, 4, "gray"))
	paths.append(star((LAYER_HEIGHT - 1)*.8, (LAYER_HEIGHT - 1)*.45, 8, "gray"))

	save_windrose(paths)


def point(θ: float, r0: float, r1: float, left: bool, color: str) -> Path:
	s = 2/3*LAYER_HEIGHT if r1 > 0 else r0*pi/4
	dx = -BEND/abs(r1 - r0) if r1 > 0 else 0
	c = 2/3
	if left:
		s *= -1
		dx *= -1
	x = r0*sin(s/r0)
	y = -r0*cos(s/r0)
	return Path(
		d=f"M0,{-r1} Q{x*c+dx},{y*c-r1*(1-c)},{x},{y} A{r0},{r0},0,0,{1 if left else 0},0,{-r0} Z",
		fill=color, stroke=color, stroke_width=0.01, transform=f"rotate({θ})")


def ray(θ: float, color: str) -> Path:
	return Path(
		d=f"M0,{INNER_RADIUS + 2} V{-(INNER_RADIUS + 2)}",
		fill="none", stroke=color, stroke_width=0.35, transform=f"rotate({θ})")


def circle(r: float, fill: str, stroke: str) -> Path:
	return Path(
		d=f"M0,{r} A{r},{r},0,0,0,0,{-r} A{r},{r},0,0,0,0,{r} Z",
		fill=fill, stroke=stroke, stroke_width=1, transform=None)


def star(r1: float, r0: float, n: int, fill: str) -> Path:
	points = []
	for bearing in arange(0, 360, 360/n):
		points.append((r1*sin(radians(bearing)), -r1*cos(radians(bearing))))
		bearing = bearing + 360/(2*n)
		points.append((r0*sin(radians(bearing)), -r0*cos(radians(bearing))))
	return Path(
		d="M" + "L".join(f"{x},{y} " for x, y in points) + "Z",
		fill=fill, stroke="none", stroke_width=0, transform=None)


def save_windrose(paths: list[Path]):
	with open("../../resources/windrose.svg", "w") as file:
		file.write(
			'<?xml version="1.0" encoding="utf-8"?>\n'
			f'<svg version="1.1" xmlns="http://www.w3.org/2000/svg" '
			f'viewBox="-{INNER_RADIUS + 3} -{INNER_RADIUS + 3} {2*INNER_RADIUS + 6} {2*INNER_RADIUS + 6}">\n'
		)
		for path in paths:
			if path.transform is not None:
				file.write(
					f'  <path fill="{path.fill}" stroke="{path.stroke}" stroke-width="{path.stroke_width}" '
					f'transform="{path.transform}" d="{path.d}" />\n'
				)
			else:
				file.write(
					f'  <path fill="{path.fill}" stroke="{path.stroke}" stroke-width="{path.stroke_width}" '
					f'd="{path.d}" />\n'
				)
		file.write(
			'</svg>\n'
		)


class Path:
	def __init__(self, d: str, fill: str, stroke: str, stroke_width: float, transform: Optional[str]):
		self.d = d
		self.fill = fill
		self.stroke = stroke
		self.stroke_width = stroke_width
		self.transform = transform


if __name__ == "__main__":
	generate_windrose()
