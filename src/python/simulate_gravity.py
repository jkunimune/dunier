import numpy as np
import matplotlib.pyplot as plt
from scipy.special import jv, jn_zeros
import scipy.optimize as opt

MODE = 'toroid'
PARAM_SWEEP = np.linspace(1, 3.5, 51)

RES = 20
MAX_ASPECT_RATIO = 3.5
BOUNDARY_EXCESS = 3
EIGEN_RES = 40
INTEGRATION_RES = 8

ρB = 1.1*MAX_ASPECT_RATIO
zB = 1.1
z_inf = zB*BOUNDARY_EXCESS
ρ_inf = ρB + (z_inf - zB)

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

max_n = int(EIGEN_RES*ρ_inf/z_inf) # for relevant ns and ms
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
aspect_ratios, elongations = [], []
for α_0 in PARAM_SWEEP: # angular momentum
	print("solving for equilibrium: {}".format(α_0))

	planet = np.zeros(P.shape) # initialize a spherical/toral planet
	if MODE == 'ellipsoid':
		planet[np.hypot(P/α_0, Z) < 1] = 1
	elif MODE == 'toroid':
		planet[np.hypot(P-α_0, Z) < 1] = 1
	else:
		raise Exception()

	for i in range(int(MAX_ASPECT_RATIO*RES)):
		A = np.sum(PB*planet[np.newaxis, :, :]*dρ*dz, axis=(1,2)) # fourier transform
		planet_twiddle = np.sum(B*A[:, np.newaxis, np.newaxis], axis=0)

		ɸ = np.sum(B*(A/Λ)[:, np.newaxis, np.newaxis], axis=0) # compute the potential
		g = np.linalg.norm(np.gradient(ɸ, z, ρ), axis=0)
		if MODE == 'ellipsoid':
			ɸ_in = ɸ[np.nonzero(planet[:,0])[0], 0][np.argmax(Z[np.nonzero(planet[:,0])[0], 0])]
		else:
			ɸ_in = ɸ[0, np.nonzero(planet[0,:])[0]][np.argmin(P[0, np.nonzero(planet[0,:])[0]])]
		ɸ_out = ɸ[0, np.nonzero(planet[0,:])[0]][np.argmax(P[0, np.nonzero(planet[0,:])[0]])]
		g_out = g[0, np.nonzero(planet[0,:])[0]][np.argmax(P[0, np.nonzero(planet[0,:])[0]])]

		ρ_min = P[np.nonzero(planet)].min() - dρ/2
		ρ_max = P[np.nonzero(planet)].max() + dρ/2
		z_max = Z[np.nonzero(planet)].max() + dz/2
		ω = np.sqrt(max(0, 2*(ɸ_in - ɸ_out)/((ρ_max-dρ/2)**2 - (ρ_min+dρ/2)**2)))
		ɸ += P**2*ω**2/2 # introduce the effective rotational potential

		plt.clf() # do an interim plot
		plt.pcolormesh(ρ_mesh, z_mesh, planet)
		plt.colorbar()
		plt.contour(ρ, z, ɸ, levels=12, colors='w')
		plt.axis('equal')
		plt.pause(1/60)

		edge = np.nonzero(np.linalg.norm(planet+np.gradient(planet), axis=0)) # redistribute the mass within the planet and adjacent spaces
		hierarchy = np.argsort(-ɸ[edge]) # but this way is a little stabler, and I think a little faster TODO what if I find an equipotential for real each time
		cutoff = int(np.sum(planet[edge]))
		if np.all(planet[edge[0][hierarchy[:cutoff]],edge[1][hierarchy[:cutoff]]] == 1): # terminal condition A:
			break # if this changes absolutely noting, break
		planet[edge[0][hierarchy[:cutoff]],edge[1][hierarchy[:cutoff]]] = 1 # WHEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
		planet[edge[0][hierarchy[cutoff:]],edge[1][hierarchy[cutoff:]]] = 0 # EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE

		if np.any(np.nonzero(planet[:,-1])): # terminal condition B:
			ρ_min, ρ_max, z_max = np.nan, np.nan, np.nan # if it has hit the boundary, break
			break
		if MODE == 'toroid' and np.any(np.nonzero(planet[:,0])):
			ρ_min = np.nan # if it is a torus and collapsed into a sphere, break
			break

	if np.isnan(ρ_min): # let us know how it went
		print("xibay")
	else:
		print("win")
	if np.isnan(ρ_max): # and stop trying if it's hitting the walls
		break
	rotation_parameters.append(ρ_max*ω**2/g_out)
	if MODE == 'ellipsoid':
		aspect_ratios.append(ρ_max/z_max)
		elongations.append(0)
	else:
		aspect_ratios.append((ρ_max+ρ_min)/(ρ_max-ρ_min))
		elongations.append((ρ_max-ρ_min)/(2*z_max))

print("analisa")
rotation_parameters = np.array(rotation_parameters)
aspect_ratios = np.array(aspect_ratios)
elongations = np.array(elongations)
print(rotation_parameters)
print(aspect_ratios)
print(elongations)
valid = np.isfinite(aspect_ratios)
if MODE == 'ellipsoid':
	α_fit_params, err = opt.curve_fit(lambda x, a, b: 1 + x/2 + a*x**2 + b*x**3, rotation_parameters[valid], aspect_ratios[valid])
	α_fit = 1 + 0.5*rotation_parameters + α_fit_params[0]*rotation_parameters**2 + α_fit_params[1]*rotation_parameters**3
	print("α = 1 + 1/2*Rω^2/g + {:.3f}*(Rω^2/g)^2 + {:.3f}*(Rω^2/g)^3".format(*α_fit_params))
	e_fit = elongations
else:
	α_fit_params, err = opt.curve_fit(lambda x, a, b: (a*x + b*x**2), rotation_parameters[valid], 1/aspect_ratios[valid])
	α_fit = 1/(α_fit_params[0]*rotation_parameters + α_fit_params[1]*rotation_parameters**2)
	print("α = 1/({:.3f}*Rω^2/g + {:.3f}(Rω^2/g)^2)".format(*α_fit_params))
	e_fit_params, err = opt.curve_fit(lambda x, a, b: 1+b*x+a*x**2, rotation_parameters[valid], elongations[valid])
	e_fit = 1 + e_fit_params[1]*rotation_parameters + e_fit_params[0]*rotation_parameters**2
	print("e = 1 + {1:.3f}*Rω^2/g + {0:.3f}*(Rω^2/g)^2".format(*e_fit_params))
plt.clf()
plt.plot(rotation_parameters[valid], aspect_ratios[valid], 'o')
plt.plot(rotation_parameters[valid], α_fit[valid], '--')
plt.xlabel("R*ω^2/g")
plt.ylabel("α")
plt.figure()
plt.plot(rotation_parameters[valid], elongations[valid], 'o')
plt.plot(rotation_parameters[valid], e_fit[valid], '--')
plt.xlabel("R*ω^2/g")
plt.ylabel("e")
plt.show()
