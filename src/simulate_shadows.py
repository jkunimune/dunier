# simulate_shadows.py - search for a simple formula for the insolation on the inside of a toroid

import numpy as np
from scipy import integrate, optimize
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style('whitegrid')

n = 73
m = 37#217
R = 3
κ = 1

ɸ = np.linspace(-np.pi/2, np.pi/2, n)
λ = np.linspace(0, np.pi, n)
β = np.arctan(κ*np.tan(ɸ))

Λ, Φ = np.meshgrid(λ, ɸ)
Λ, B = np.meshgrid(λ, β)

θ = np.linspace(0, np.pi/2, m)

S_saf = np.zeros((m, n, n))
S_say = np.zeros((m, n, n))

for i in range(m):
	x = (R - np.cos(B))*np.sin(Λ)
	y = (R - np.cos(B))*np.cos(Λ)
	z = κ*np.sin(B)
	ny = -np.cos(Φ)*np.cos(Λ)
	nz = np.sin(Φ)
	sy = np.cos(θ[i])
	sz = -np.sin(θ[i])

	cy = -R*np.cos(np.arcsin(x/R))
	a, b = 1/np.cos(np.arcsin(x/R)), κ
	clear = np.logical_or(
		y < cy + a,
		np.where(y != cy, np.hypot(y - cy, z*a/b) * np.sin(θ[i] + np.tan(z*a/b/(y - cy))), z) > a
	)

	j = np.random.randint(n)
	k = np.random.randint(n)
	T = np.linspace(0, 2*np.pi, 217)
	Y = np.linspace(np.sqrt((R-1)**2 - np.minimum(R-1, x[j,k])**2), np.sqrt((R+1)**2 - x[j,k]**2), 217)
	plt.plot( Y,  κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
	plt.plot(-Y,  κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
	plt.plot( Y, -κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
	plt.plot(-Y, -κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
	plt.plot(a[j,k]*np.cos(T) + cy[j,k], b*np.sin(T), 'k--')
	plt.axline((y[j,k], z[j,k]), slope=sz/sy, color='g' if (ny[j,k]*sy + nz[j,k]*sz <= 0 and clear[j,k]) else 'r')
	plt.scatter([y[j,k]], [z[j,k]], c='k')
	plt.axis('equal')
	plt.xlim(-R - 1, R + 1)
	plt.show()

	S_saf[i,:,:] = -np.minimum(0, ny*sy + nz*sz)
	S_say[i,:,:] = S_saf[i,:,:] * clear

for i in range(m):
	plt.clf()
	plt.contourf( λ,  ɸ, S_say[i,:,:], levels=np.linspace(0, 1, 8))
	plt.contourf(-λ,  ɸ, S_say[i,:,:], levels=np.linspace(0, 1, 8))
	plt.pause(0.1)

plt.show()
