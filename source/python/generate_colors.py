"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
from colour import convert
import numpy as np
import matplotlib.pyplot as plt

min_L = .83
max_L = .90
r = .06
ɸ = 0
N = 30

golden_angle = 2*np.pi*(1 + np.sqrt(5))/2


def angular_distance(a, b):
	return abs((a - b + 180)%360 - 180)


angles = []
heights = []
colors = []
valid = []
for i in range(N):
	θ = i*golden_angle + ɸ
	z = i/(N - 1)*(max_L - min_L) + min_L
	x = r*np.cos(θ)
	y = r*np.sin(θ)
	rgb = convert((z, x, y), "Oklab", "sRGB")
	rgb = np.clip(rgb, 0, 1)
	oklab = convert(rgb, "sRGB", "Oklab")

	distance_from_water = np.sqrt((z - .89)**2 + (x + 0.011)**2 + (y + 0.039)**2)

	angles.append(np.degrees(θ)%360)
	heights.append(z)
	colors.append(rgb)
	valid.append(distance_from_water > 0.05)  # be wary of light blues

# try to find an order that makes the first few colors very spread out
order = np.arange(len(colors))
order = order[np.array(valid)[order]]
angles = np.array(angles)[order]
heights = np.array(heights)[order]
colors = np.array(colors)[order]

for r, g, b in colors:
	print(f"'rgb({int(256*r)}, {int(256*g)}, {int(256*b)})',")

plt.scatter(angles, heights, c=colors)
for i in range(len(colors)):
	plt.text(angles[i], heights[i], f"{i}")
plt.xlabel("hue (°)")
plt.ylabel("lightness (%)")
plt.show()
