"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
from matplotlib import pyplot as plt
from numpy import linspace, pi, radians, cos, sin, exp, array, zeros_like, maximum
from scipy.special import legendre

TERME_NOISE_LEVEL = 12
BARXE_NOISE_LEVEL = 1
ATMOSPHERE_THICKNESS = 12
OROGRAPHIC_MAGNITUDE = 1

TUNDRA_TEMP = -15
EVAPORATION_INTERCEPT = -15
EVAPORATION_COFFICIENT = 0.009
EVAPORATION_POWER = 4/3
TAIGA_TEMP = -5
FLASH_TEMP = +50
TROPIC_TEMP = +22
FOREST_FACTOR = 1.35

RIVER_THRESH = -20

MOUNTAIN_HEIGHT = 4

OBLIQUITY = radians(23.5)
AVERAGE_TEMPERATURE = 15

latitude = linspace(0, pi/2, 10)
insolation = 1 - (
	5/8*legendre(2)(cos(OBLIQUITY))*legendre(2)(sin(latitude)) -
	9/64*legendre(4)(cos(OBLIQUITY))*legendre(4)(sin(latitude)) -
	65/1024*legendre(6)(cos(OBLIQUITY))*legendre(6)(sin(latitude))
)

coastal_temperature = insolation**(1/4)*(AVERAGE_TEMPERATURE + 273) - 273
inland_temperature = coastal_temperature
mountain_temperature = (insolation*exp(-MOUNTAIN_HEIGHT/ATMOSPHERE_THICKNESS))**(1/4)*(AVERAGE_TEMPERATURE + 273) - 273

coastal_rainfall = cos(latitude)**2 + cos(3*latitude)**2 + OROGRAPHIC_MAGNITUDE
inland_rainfall = cos(latitude)**2 + cos(3*latitude)**2
mountain_rainfall = cos(latitude)**2 + cos(3*latitude)**2 - OROGRAPHIC_MAGNITUDE

plt.figure(figsize=(4.25, 4.25))

plt.gca().set_facecolor("#82C17A")
plt.axvspan(-100, TROPIC_TEMP,
            facecolor="#B0C797", edgecolor="black", linewidth=0.7)
plt.axvspan(-100, TAIGA_TEMP,
            facecolor="#9FE0B0", edgecolor="black", linewidth=0.7)
T = linspace(-100, 100, 101)
plt.fill_between(T, zeros_like(T), FOREST_FACTOR*EVAPORATION_COFFICIENT*maximum(0, T - EVAPORATION_INTERCEPT)**EVAPORATION_POWER,
                  facecolor="#D9E88A", edgecolor="black", linewidth=0.7)
plt.axvspan(FLASH_TEMP, 100,
            facecolor="#A1A17E", edgecolor="black", linewidth=0.7)
plt.axvspan(-100, TUNDRA_TEMP,
            facecolor="#F5FFF8", edgecolor="black", linewidth=0.7)
plt.fill_between(T, zeros_like(T), EVAPORATION_COFFICIENT*maximum(0, T - EVAPORATION_INTERCEPT)**EVAPORATION_POWER,
                 facecolor="#FCF0B7", edgecolor="black", linewidth=0.7)
plt.axvspan(-100, RIVER_THRESH,
            facecolor="white", edgecolor="black", linewidth=0.7)

# for i in range(len(latitude)):
# 	temperature = array([coastal_temperature[i], inland_temperature[i], mountain_temperature[i]])
# 	rainfall = array([coastal_rainfall[i], inland_rainfall[i], mountain_rainfall[i]])
# 	plt.plot(temperature, rainfall, color="#000", linewidth=1.4)
# # for dT, dR in [(0, -BARXE_NOISE_LEVEL), (0, BARXE_NOISE_LEVEL), (-TERME_NOISE_LEVEL, 0), (TERME_NOISE_LEVEL, 0)]:
# # 	plt.plot(temperature + dT, rainfall + dR, color="#777", linewidth=0.7)
# plt.scatter(inland_temperature, inland_rainfall, c="#000", s=20)

plt.xlabel("Average temperature (°C)")
plt.xlim(-30, 35)
plt.ylabel("Average rainfall (dimensionless)")
plt.ylim(0, 3)
plt.tight_layout()
plt.show()
