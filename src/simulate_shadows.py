# simulate_shadows.py - search for a simple formula for the insolation on the inside of a toroid

import numpy as np
from scipy import integrate
import matplotlib.pyplot as plt
import seaborn as sns
sns.set_style('whitegrid')

n = 73
m = 217
l = 11
k = 73
R = 1.5
κ = .6

ɸ = np.linspace(-np.pi/2, np.pi/2, n)
λ = np.linspace(0, np.pi, n)
β = np.arctan(κ*np.tan(ɸ))

Λ, Φ = np.meshgrid(λ, ɸ)
Λ, B = np.meshgrid(λ, β)

θ = np.linspace(0, np.pi/2, m)

S_saf = np.zeros((m, n, n))
S_say = np.zeros((m, n, n))

for i in range(m): # start by iterating over all axis-planet-sun-angles
	x = (R - np.cos(B))*np.sin(Λ)
	y = (R - np.cos(B))*np.cos(Λ)
	z = κ*np.sin(B)
	ny = -np.cos(Φ)*np.cos(Λ)
	nz = np.sin(Φ)
	sy = np.cos(θ[i])
	sz = -np.sin(θ[i])

	if np.tan(θ[i]) < κ or np.sin(θ[i]) < 1/R:
		μ = (sz/sy)/κ
		z0 = z/κ - μ*y
		a = (μ**2 + 1)**2
		b = 4*μ*z0*(μ**2 + 1)
		c = 2*(μ**2 + 1)*(R**2 + x**2 + z0**2 - 1) + 4*μ**2*z0**2 - 4*R**2
		d = 4*μ*z0*(R**2 + x**2 + z0**2 - 1)
		e = (R**2 + x**2 + z0**2 - 1)**2 - 4*R**2*x**2
		a, b, c, d, e = a/30, b/30, c/30, d/30, e/30 # this helps with overflow
		Δ = 256*a**3*e**3 - 192*a**2*b*d*e**2 - 128*a**2*c**2*e**2 + 144*a**2*c*d**2*e \
			- 27*a**2*d**4 + 144*a*b**2*c*e**2 - 6*a*b**2*d**2*e - 80*a*b*c**2*d*e \
			+ 18*a*b*c*d**3 + 16*a*c**4*e - 4*a*c**3*d**2 - 27*b**4*e**2 + 18*b**3*c*d*e \
			- 4*b**3*d**3 - 4*b**2*c**3*e + b**2*c**2*d**2
		clear = np.logical_or(Δ < 0, y < 0)

		if np.random.random() < 1e-1:
			plt.figure()
			j = np.random.randint(n)
			k = np.random.randint(n)
			Y = np.linspace(np.sqrt((R-1)**2 - np.minimum(R-1, x[j,k])**2), np.sqrt((R+1)**2 - x[j,k]**2), 217)
			plt.plot( Y,  κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
			plt.plot(-Y,  κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
			plt.plot( Y, -κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
			plt.plot(-Y, -κ*np.sqrt(np.maximum(0, 1 - (R - np.hypot(Y, x[j,k]))**2)), 'k-')
			Yp = np.linspace(-R-1, R+1)
			Zp = a*Yp**4 + b[j,k]*Yp**3 + c[j,k]*Yp**2 + d[j,k]*Yp + e[j,k]
			plt.plot(Yp, 2*Zp/abs(Zp).max())
			plt.axline((y[j,k], z[j,k]), slope=sz/sy, color='g' if (ny[j,k]*sy + nz[j,k]*sz <= 0 and clear[j,k]) else 'r')
			plt.scatter([y[j,k]], [z[j,k]], c='k')
			plt.axis('equal')
			plt.xlim(-R - 1, R + 1)
			plt.show()

	else:
		clear = True

	S_saf[i,:,:] = -np.minimum(0, ny*sy + nz*sz) # compute the insolation on each point in the inner hemispire
	S_say[i,:,:] = S_saf[i,:,:] * clear # and account for autosciation

for i in range(0, m, 3): # plot the results thus far
	plt.clf()
	plt.contourf( λ,  ɸ, S_say[i,:,:], levels=np.linspace(0, 1, 8))
	plt.contourf(-λ,  ɸ, S_say[i,:,:], levels=np.linspace(0, 1, 8))
	plt.pause(0.01)
plt.show()

ψ = np.linspace(0, np.pi/2, l)
t = np.linspace(0, np.pi/2, k)

S_ide = np.zeros((l, n)) # average it out over the year for various obliquities
S_tru = np.zeros((l, n))
for j in range(l):
	θ_samp = np.arcsin(np.sin(ψ[j])*np.sin(t))
	i = np.round(np.interp(θ_samp, θ, np.arange(m))).astype(int)
	for sign in [-1, 1]:
		S_ide[j,:] += np.mean(S_saf[i,::sign,:], axis=(0, 2))
		S_tru[j,:] += np.mean(S_say[i,::sign,:], axis=(0, 2))

sns.set_palette('rainbow', n_colors=l)
for j in range(l):
	plt.plot(np.degrees(β), 1 - S_tru[j,:]/S_ide[j,:], label=f"Obliquity={np.degrees(ψ[j]):.0f}°")
for j in range(l):
	dz = 2*R*np.tan(ψ[j])/κ
	if dz == 0:
		plt.plot(np.degrees(β), np.ones(β.shape), '--')
	else:
		plt.plot(np.degrees(β), np.minimum(1, np.minimum(1, (1 - np.sin(β))/dz) * np.minimum(1, (1 + np.sin(β))/dz) + 0.8*np.cos(ɸ)**3*np.sqrt(κ)/R + 0.4*np.sin(2*β)**2/(1+dz)), '--')
plt.xlabel("Latitude (°)")
plt.ylabel("Opacity")
plt.legend()
plt.show()
