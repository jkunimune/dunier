"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
from colour import convert
import numpy as np
import matplotlib.pyplot as plt

N = 36
min_L = .75
max_L = .90
r = .09
ɸ = 0
# Z_PERIOD = np.linspace(3, 9, 601)
Z_PERIOD = [3.89]

badnesses = []
for z_period in Z_PERIOD:
	angles = []
	heights = []
	colors = []
	for i in range(N):
		θ = i*2*np.pi*(1 + np.sqrt(5))/2 + ɸ
		z = (i+1)/z_period%1
		z = z*(max_L - min_L) + min_L
		x = r*np.cos(θ)
		y = r*np.sin(θ)
		oklab = (z, x, y)

		if np.cos(θ - np.radians(229)) > .8 and z > .85:
			continue  # skip light blues

		rgb = convert((z, x, y), "Oklab", "sRGB")
		if len(Z_PERIOD) == 1:
			print("'rgb({:.0f}, {:.0f}, {:.0f})',".format(
				256*rgb[0], 256*rgb[1], 256*rgb[2]))

		angles.append(np.degrees(θ)%360)
		heights.append(z)
		colors.append(oklab)
	badness = 0
	for i in range(1, len(colors)):
		badness += 1/np.min([np.sqrt(np.sum((np.subtract(colors[i], colors[j]))**2)) for j in range(len(colors)) if j < i])
	badnesses.append(badness)

if len(Z_PERIOD) > 1:
	print(f"maxim bon zamane: {Z_PERIOD[np.argmin(badnesses)]}")
	plt.scatter(Z_PERIOD, badnesses)
	plt.xlabel("z zamane")
	plt.ylabel("malia")
else:
	print(f"malia da zamane: {badness}")
	plt.scatter(angles, heights, c=range(len(angles)))
	plt.xlabel("gone (°)")
	plt.ylabel("gawia (%)")
plt.show()
