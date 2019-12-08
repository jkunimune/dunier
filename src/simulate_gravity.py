import numpy as np
import matplotlib.pyplot as plt
from scipy.special import jv, jn_zeros

RES = 12
MAX_ASPECT_RATIO = 1.5
BOUNDARY_EXCESS = 3
EIGEN_RES = 36
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

print("forming basis")

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

for ω2 in [1/6]:#np.linspace(0, 1, 6): # angular kinetic energy
	# for i in range(max_n*max_m):

		print("solving for potential")

		planet = np.zeros(P.shape)
		planet[np.hypot(P, Z) < 1] = 1 # define the initial planet

		A = np.sum(PB*planet[np.newaxis, :, :]*dρ*dz, axis=(1,2)) # fourier transform
		planet_twiddle = np.sum(B*A[:, np.newaxis, np.newaxis], axis=0)

		ɸ = np.sum(B*(A/Λ)[:, np.newaxis, np.newaxis], axis=0) # compute the potential
		g = np.linalg.norm(np.gradient(ɸ, z, ρ), axis=0)
		ɸ /= np.max(g[:-1,:-1])

		ɸ += ω2*P**2/2 # introduce the effective rotational potential

		print("numografa")

		plt.pcolormesh(ρ_mesh, z_mesh, planet_twiddle)
		plt.colorbar()
		plt.contour(ρ, z, ɸ, levels=12, colors='w')
		plt.axis('equal')
		plt.show()
