# simulate_perspective.py - search for a simple formula for the insolation on a flat earth

import numpy as np
import matplotlib.pyplot as plt
from scipy import optimize
import seaborn as sns
sns.set_style('whitegrid')

n = 36
m = 39
l = 12
p = 4

r0 = 1/2
z0 = 1/4

r = np.linspace(0, 2*r0, n)
λ = np.linspace(0, np.pi, n)
ɸ = np.arctan(z0/r)

Λ, R = np.meshgrid(λ, r)
Λ, Φ = np.meshgrid(λ, ɸ)

X, Y = R*np.cos(Λ), R*np.sin(Λ)

ψ = np.linspace(0, 1.5, l)

S = np.zeros((n, l))
for i in range(l):
	xS = r0*(1 + ψ[i]/(np.pi/2)*np.cos(np.linspace(0, np.pi, m)))[None,None,:]
	# zS = z0*np.sqrt(1 - (xS/(2*r0))**2)
	zS = z0
	S[:,i] = np.sum(zS/((X[:,:,None] - xS)**2 + Y[:,:,None]**2 + zS**2)**(3/2), axis=(1,2))
S /= n*m/z0**2

sns.set_palette('rainbow', n_colors=l)
plt.figure()
plt.plot(r, S)
plt.plot(r, z0**3/(r**2 + z0**2)**(3/2), 'k--', label="tidally lockd")
plt.xlabel("raditude")
plt.ylabel("insolacion")

C = np.empty((l, p))
for i in range(l):
	C[i,:] = np.polyfit(r**2, 1/S[:,i], p-1)[::-1]
	# C[i,:] = optimize.curve_fit((lambda x,d,c,b,a: a*np.exp(-(x/b)**2) + c*np.exp(-(x/d)**2)), r, S[:,i], p0=[-.5, .5*r0, 1, 1.5*r0], maxfev=10000)[0]
plt.figure()
plt.plot(ψ, C)
plt.xlabel("axial tilt")
plt.ylabel("polynomial coefficient")

slopes = np.empty(p)
# blopes = np.empty(p)
offsets = np.empty(p)
for i in range(p):
	a, c = optimize.curve_fit((lambda x,a,c: a*np.cos(2*x) + c), ψ, C[:,i])[0]
	slopes[i] = a
	offsets[i] = c
slopes = np.around(slopes, 3)
offsets = np.around(offsets, 3)
print(slopes)
print(offsets)

plt.figure()
# plt.plot(r, S)
for i in range(l):
	d, c, b, a = np.matmul(np.stack([slopes, offsets], axis=1), [np.cos(2*ψ[i]), 1])
	# d, c, b, a = C[i,:]
	v = 1/(a*r**6 + b*r**4 + c*r**2 + d)
	print(r)
	print(np.cos(2*ψ[i]))
	# v = a*np.exp(-(r/b)**2) + c*np.exp(-(r/d)**2)
	plt.plot(r, v, '--')
# plt.yscale('log')
plt.show()
