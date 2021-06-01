# simulate_perspective.py - search for a simple formula for the insolation on a flat earth

import numpy as np
import matplotlib.pyplot as plt
from scipy import optimize
import seaborn as sns
sns.set_style('whitegrid')

n = 36
m = 39
l = 12
p = 5

r0 = 2
zS = 1

r = np.linspace(0, 2*r0, n)
λ = np.linspace(0, np.pi, n)
ɸ = np.arctan(zS/r)

Λ, R = np.meshgrid(λ, r)
Λ, Φ = np.meshgrid(λ, ɸ)

X, Y = R*np.cos(Λ), R*np.sin(Λ)

ψ = np.linspace(0, np.pi/2, l)

S = np.zeros((n, l))
for i in range(l):
	xS = r0*(1 + ψ[i]/(np.pi/2)*np.cos(np.linspace(0, np.pi, m)))
	S[:,i] = np.sum(zS/((X[:,:,None] - xS[None,None,:])**2 + Y[:,:,None]**2 + zS**2)**(3/2), axis=(1,2))
S /= n*m

sns.set_palette('rainbow', n_colors=l)
plt.figure()
plt.plot(r, S)
# plt.plot(r, zS/(r**2 + zS**2), 'k--')
plt.xlabel("raditude")
plt.ylabel("insolacion")

C = np.empty((l, p))
for i in range(l):
	C[i,:] = np.polyfit(r**2, 1/S[:,i], p-1)[::-1]
# plt.figure()
# plt.plot(ψ, C)
# plt.xlabel("axial tilt")
# plt.ylabel("polynomial coefficient")

slopes = np.empty(p)
blopes = np.empty(p)
offsets = np.empty(p)
for i in range(p):
	a, b, c = optimize.curve_fit((lambda x,a,b,c: a*np.cos(2*x) + b*np.sin(2*x) + c), ψ, C[:,i])[0]
	slopes[i] = a
	blopes[i] = b
	offsets[i] = c
print(slopes)
print(blopes)
print(offsets)

plt.figure()
plt.plot(r, S)
for i in range(l):
	d =  3.90524*np.cos(2*ψ[i]) - 0.36763*np.sin(2*ψ[i]) + 7.23562
	c = -2.90351*np.cos(2*ψ[i]) + 0.04898*np.sin(2*ψ[i]) - 0.43212
	b =  0.37105*np.cos(2*ψ[i]) - 0.05585*np.sin(2*ψ[i]) + 0.22424
	a = -0.01266*np.cos(2*ψ[i]) + 0.00263*np.sin(2*ψ[i]) - 0.01163
	z =  0.00012*np.cos(2*ψ[i]) + 0.00008*np.sin(2*ψ[i]) + 0.00034
	v = 1/(z*r**8 + a*r**6 + b*r**4 + c*r**2 + d)
	plt.plot(r, v, '--')
# plt.plot(r, zS/(r**2 + zS**2), 'k--')
plt.show()
