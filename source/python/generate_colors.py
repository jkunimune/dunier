"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
from colormath.color_objects import LabColor, sRGBColor
from colormath.color_conversions import convert_color
from colormath.color_diff import delta_e_cie2000
import numpy as np
import matplotlib.pyplot as plt

N = 36
min_L = 50
max_L = 75
r = 40
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
		color = LabColor(z, r*np.cos(θ), r*np.sin(θ))

		rgb = convert_color(color, sRGBColor)
		if len(Z_PERIOD) == 1:
			print("'rgb({:.0f}, {:.0f}, {:.0f})',".format(
				256*rgb.rgb_r, 256*rgb.rgb_g, 256*rgb.rgb_b))

		angles.append(np.degrees(θ)%360)
		heights.append(z)
		colors.append(color)
	badness = 0
	for i in range(1, N):
		badness += 1/np.min([delta_e_cie2000(colors[i], colors[j]) for j in range(N) if j < i])
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
