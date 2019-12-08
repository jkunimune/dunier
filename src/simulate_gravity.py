import numpy as np
import matplotlib.pyplot as plt
from scipy.special import jv, jn_zeros

RES = 24
MAX_ASPECT_RATIO = 2
BOUNDARY_EXCESS = 3
EIGEN_RES = 48
INTEGRATION_RES = 8

ρB = 1.1*MAX_ASPECT_RATIO
zB = 1.1
ρ_inf = ρB*BOUNDARY_EXCESS
z_inf = zB*BOUNDARY_EXCESS

ρ_mesh = np.linspace(0, ρB, int(MAX_ASPECT_RATIO*RES)+1) # radial coordinate
z_mesh = np.linspace(0, zB, int(RES)+1) # axial coordinate
dρ, dz = ρ_mesh[1], z_mesh[1]
ρ, z = ρ_mesh[:-1]+dρ/2, z_mesh[:-1]+dz/2
P, Z = np.meshgrid(ρ, z)
ρ_in_pixel = np.linspace(-dρ/2, dρ/2, INTEGRATION_RES+1)[:-1] + dρ/INTEGRATION_RES/2 # radial coordinate
z_in_pixel = np.linspace(-dz/2, dz/2, INTEGRATION_RES+1)[:-1] + dz/INTEGRATION_RES/2 # axial coordinate
P_in_pixel, Z_in_pixel = np.meshgrid(ρ_in_pixel, z_in_pixel)
n_in_pixel = P_in_pixel.size

print("sana baze")

max_n = int(EIGEN_RES*MAX_ASPECT_RATIO) # for relevant ns and ms
max_m = int(EIGEN_RES)
J_zeros = jn_zeros(0, max_n)
B = np.empty((max_n*max_m, *P.shape)) # create a basis matrix (each layer is an eigenfunction)
PB = np.empty((max_n*max_m, *P.shape)) # and one weighted by radius (each layer is rho times an eigenfunction)
Λ = np.empty((max_n*max_m)) # store the corresponding eigenvalues
for n in range(0, max_n):
	for m in range(0, max_m):
		kn = J_zeros[n]/ρ_inf # choose a wavenumber
		km = (m+1/2)*np.pi/z_inf
		P_fine = P[:,:,np.newaxis,np.newaxis] + P_in_pixel[np.newaxis,np.newaxis,:,:] # make sure the eigenfunctions are properly smoothed
		Z_fine = Z[:,:,np.newaxis,np.newaxis] + Z_in_pixel[np.newaxis,np.newaxis,:,:]
		Ψnm = jv(0, kn*P_fine) * np.cos(km*Z_fine)
		norm = np.sqrt(ρ_inf**2/2*jv(1, kn*ρ_inf)**2 * z_inf/2)
		B[n*max_m+m, :,:] = np.mean(Ψnm, axis=(2,3))/norm
		PB[n*max_m+m, :,:] = np.mean(P_fine*Ψnm, axis=(2,3))/norm
		Λ[n*max_m+m] = kn**2 + km**2

print("iterating over angular velocities")

rotation_parameters = []
aspect_ratios = []
for ω2 in np.linspace(0, 0.5, 51): # angular velocity
	print("solving for equilibrium: {}".format(ω2))

	planet = np.zeros(P.shape) # initialize a spherical planet
	planet[np.hypot(P, Z) < 1] = 1

	while True:
		A = np.sum(PB*planet[np.newaxis, :, :]*dρ*dz, axis=(1,2)) # fourier transform
		planet_twiddle = np.sum(B*A[:, np.newaxis, np.newaxis], axis=0)

		ɸ = np.sum(B*(A/Λ)[:, np.newaxis, np.newaxis], axis=0) # compute the potential
		g = np.linalg.norm(np.gradient(ɸ, z, ρ), axis=0)
		ɸ /= np.max(g[:-1,:-1]) # normalize so surface gravity is 1

		ɸ += ω2*P**2/2 # introduce the effective rotational potential

		plt.clf() # do an interim plot
		plt.pcolormesh(ρ_mesh, z_mesh, planet)
		plt.colorbar()
		plt.contour(ρ, z, ɸ, levels=12, colors='w')
		plt.axis('equal')
		plt.pause(1/60)

		edge = np.nonzero(np.linalg.norm(np.gradient(planet), axis=0)) # redistribute the mass
		num_rocks = int(np.sum(planet[edge])) # this could be run multiple times to get an exact equipotential solution before recomputing the potential,
		hierarchy = np.argsort(-ɸ[edge]) # but this way is a little stabler, and I think a little faster
		if np.all(planet[edge[0][hierarchy[:num_rocks]],edge[1][hierarchy[:num_rocks]]] == 1): # terminal condition A:
			max_radius = np.max(P[np.nonzero(planet)]) + dρ/2 # if this changes absolutely noting, break
			min_radius = np.max(Z[np.nonzero(planet)]) + dz/2
			break
		planet[edge[0][hierarchy[:num_rocks]],edge[1][hierarchy[:num_rocks]]] = 1 # WHEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
		planet[edge[0][hierarchy[num_rocks:]],edge[1][hierarchy[num_rocks:]]] = 0 # EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE

		if np.any(np.nonzero(planet[:,-1])): # terminal condition B:
			max_radius, min_radius = np.nan, np.nan # if it has hit the boundary, break
			break

	g = 1 # (because I normalized it)
	rotation_parameters.append(ω2*max_radius/g)
	aspect_ratios.append(max_radius/min_radius)
	if np.isnan(aspect_ratios[-1]):
		break

print("analisa")
rotation_parameters = np.array(rotation_parameters)
aspect_ratios = np.array(aspect_ratios)
print(rotation_parameters)
print(aspect_ratios)

fit, err = opt.curve_fit(lambda x, a: 1+x/2+a*x**2, rotation_parameters, aspect_ratios)
print("α = 1 + 1/2*Rω^2/g + {:.3f}*(Rω^2/g)^2".format(fit[0]))

plt.clf()
plt.plot(rotation_parameters, aspect_ratios, 'o')
plt.plot(rotation_parameters, 1 + rotation_parameters/2 + fit[0]*rotation_parameters**2)
plt.xlabel("R*ω^2/g")
plt.ylabel("α")
plt.show()
