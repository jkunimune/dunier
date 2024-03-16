# simulate_sunlight.py - validate the insolation on an oblique sphere

import numpy as np
from scipy import integrate, optimize
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style('whitegrid')

AXIAL_TILTS = np.linspace(0, np.pi/2, 20)
LATITUDES = np.linspace(0, np.pi/2, 16)


def vector(λ, θ):
	return np.stack([
		np.cos(λ)*np.cos(θ),
		np.cos(λ)*np.sin(θ),
		np.sin(λ)], axis=0)


def powcos(x, a, δ, γ):
	return δ + a*np.cos(x)**γ


def gencos(x, a, δ):
	return δ + a*np.cos(x)


def line(x, a, b):
	return a*x + b


def prop(x, a):
	return a*x


def p2(x):
	return (3*x**2 - 1)/2


def p4(x):
	return (35*x**4 - 30*x**2 + 3)/8


def p6(x):
	return (231*x**6 - 315*x**4 + 105*x**2 - 5)/16


if __name__ == '__main__':
	TEMPERATURES = np.empty((len(LATITUDES), len(AXIAL_TILTS)))
	for i in range(len(LATITUDES)):
		for j in range(len(AXIAL_TILTS)):
			λ = LATITUDES[i]
			Δλ = AXIAL_TILTS[j]
			total, err = integrate.dblquad(lambda θ, ɸ: np.maximum(0, np.sum(vector(λ, θ)*vector(Δλ*np.sin(ɸ), 0), axis=0)), 0, 2*np.pi, lambda ɸ: 0, lambda ɸ: 2*np.pi,
				epsabs=1e-0, epsrel=1e-2)
			TEMPERATURES[i,j] = total/(2*np.pi)**2

	PARAMS = np.empty((3, len(AXIAL_TILTS)))
	FIT_TEMPERATURES = np.empty(TEMPERATURES.shape)
	for j in range(len(AXIAL_TILTS)):
		params, pcov = optimize.curve_fit(
			powcos, LATITUDES, TEMPERATURES[:,j],
			p0=(TEMPERATURES[0,j]-TEMPERATURES[-1,j], TEMPERATURES[-1,j], 1))
		PARAMS[:,j] = params
		FIT_TEMPERATURES[:,j] = powcos(LATITUDES, *params)

	ampl_params, pcov = optimize.curve_fit(line, AXIAL_TILTS, PARAMS[0,:])
	shift_params, pcov = optimize.curve_fit(prop, AXIAL_TILTS, PARAMS[1,:])
	power_params = [(PARAMS[2,-1]-PARAMS[2,0])/(np.pi/2), 1]

	FIT_PARAMS = np.empty(PARAMS.shape)
	FIT_FIT_TEMPERATURES = np.empty(TEMPERATURES.shape)
	for j in range(len(AXIAL_TILTS)):
		FIT_PARAMS[:,j] = [
			line(AXIAL_TILTS[j], *ampl_params),
			prop(AXIAL_TILTS[j], *shift_params),
			line(AXIAL_TILTS[j], *power_params)]
		FIT_FIT_TEMPERATURES[:,j] = powcos(LATITUDES, *FIT_PARAMS[:,j])

	# Δλ, λ = np.meshgrid(AXIAL_TILTS, LATITUDES)
	# FIT_FIT_TEMPERATURES = 1 - 5/8*p2(np.cos(Δλ))*p2(np.sin(λ)) - 9/64*p4(np.cos(Δλ))*p4(np.sin(λ)) - 65/1024*p6(np.cos(Δλ)*np.sin(λ))

	plt.figure()
	x_ax = np.concatenate((AXIAL_TILTS - AXIAL_TILTS[1]/2, [AXIAL_TILTS[-1] + AXIAL_TILTS[1]/2]))
	y_ax = np.concatenate((LATITUDES - LATITUDES[1]/2, [LATITUDES[-1] + LATITUDES[1]/2]))
	plt.pcolormesh(x_ax, y_ax, TEMPERATURES, cmap='inferno')
	plt.xlabel("Axial tilt")
	plt.ylabel("Latitude")
	plt.colorbar()

	plt.figure()
	sns.set_palette('rainbow', n_colors=len(AXIAL_TILTS))
	plt.plot(LATITUDES, TEMPERATURES)
	plt.xlabel("Latitude")
	plt.ylabel("Temperature")

	plt.figure()
	sns.set_palette('Set1', n_colors=3)
	plt.plot(AXIAL_TILTS, PARAMS[0,:], label="Amplitude")
	plt.plot(AXIAL_TILTS, PARAMS[1,:], label="Shift")
	plt.plot(AXIAL_TILTS, PARAMS[2,:], label="Power")
	plt.xlabel("Axial tilt")
	plt.legend()

	plt.figure()
	sns.set_palette('Set1', n_colors=3)
	plt.plot(AXIAL_TILTS, FIT_PARAMS[0,:], label="Amplitude")
	plt.plot(AXIAL_TILTS, FIT_PARAMS[1,:], label="Shift")
	plt.plot(AXIAL_TILTS, FIT_PARAMS[2,:], label="Power")
	plt.xlabel("Axial tilt")
	plt.legend()

	plt.figure()
	sns.set_palette('rainbow', n_colors=len(AXIAL_TILTS))
	plt.plot(LATITUDES, FIT_FIT_TEMPERATURES)
	plt.xlabel("Latitude")
	plt.ylabel("Temperature")

	plt.figure()
	sns.set_palette('viridis', n_colors=len(LATITUDES))
	plt.plot(AXIAL_TILTS, TEMPERATURES.transpose())
	plt.xlabel("Axial tilt")
	plt.ylabel("Temperature")

	plt.show()
