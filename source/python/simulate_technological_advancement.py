"""
This work by Justin Kunimune is marked with CC0 1.0 Universal.
To view a copy of this license, visit <https://creativecommons.org/publicdomain/zero/1.0>
"""
from matplotlib import pyplot as plt
from numpy import linspace, exp, stack, full, array, concatenate, expand_dims, arange, newaxis

k = 0.01

ɣ_A = 0.0015
ɣ_B = 0.0010
ɣ_C = 0.0005
ɣ_D = 0.0000


def main():
	step_size = 100
	num_steps = 6

	T_A_0 = 2
	T_B_0 = 1
	T_C_0 = 1
	T_D_0 = 1

	initial_state = array([T_A_0, T_B_0, T_C_0, T_D_0])

	jank_time = array([0])
	jank_solution = expand_dims(initial_state, axis=0)
	for i in range(num_steps):
		t, new_states = simulate_diffusion(jank_solution[-1], step_size)
		jank_time = concatenate([jank_time, jank_time[-1] + t])
		jank_solution = concatenate([jank_solution, new_states])
		_, new_states = simulate_growth(jank_solution[-1], step_size)
		jank_time = concatenate([jank_time, jank_time[-1:]])
		jank_solution = concatenate([jank_solution, new_states[-1:]])
	staggered_jank_time = jank_time[:, newaxis] + arange(-3, 1)[newaxis, :]*5

	true_time = array([0])
	true_solution = expand_dims(initial_state, axis=0)
	for i in range(num_steps):
		t, new_states = simulate_growth_and_diffusion(true_solution[-1], step_size)
		true_time = concatenate([true_time, true_time[-1] + t])
		true_solution = concatenate([true_solution, new_states])

	plt.figure()
	plt.plot(staggered_jank_time, jank_solution, "--")
	plt.gca().set_prop_cycle(None)
	plt.plot(true_time, true_solution, "-")
	plt.tight_layout()
	plt.show()


def simulate_growth(initial_state, duration):
	T_A_0, T_B_0, T_C_0, T_D_0 = initial_state
	t = linspace(0, duration)[1:]
	T_A = T_A_0*exp(ɣ_A*t)
	T_B = T_B_0*exp(ɣ_B*t)
	T_C = T_C_0*exp(ɣ_C*t)
	T_D = T_D_0*exp(ɣ_D*t)
	return t, stack([T_A, T_B, T_C, T_D], axis=1)


def simulate_diffusion(initial_state, duration):
	T_A_0, T_B_0, T_C_0, T_D_0 = initial_state
	t = linspace(0, duration)[1:]
	T_A = full(t.shape, T_A_0)
	T_B = T_A + (T_B_0 - T_A)*exp(-k*t)
	T_C = T_A + (T_B_0*exp(-k*t) - T_A*exp(-k*t))*k*t + T_C_0*exp(-k*t) - T_A_0*exp(-k*t)
	T_D = T_A + (((T_B_0 - T_A_0)*k*t/2 + T_C_0 - T_A_0)*k*t + T_D_0 - T_A_0)*exp(-k*t)
	return t, stack([T_A, T_B, T_C, T_D], axis=1)


def simulate_growth_and_diffusion(initial_state, duration):
	T_A_0, T_B_0, T_C_0, T_D_0 = initial_state
	t = linspace(0, duration)[1:]
	τ = k*t
	λA = ɣ_A/k
	λB = ɣ_B/k - 1
	λC = ɣ_C/k - 1
	λD = ɣ_D/k - 1
	T_A = T_A_0*exp(λA*τ)
	T_B = T_B_0*exp(λB*τ) + T_A_0*(exp(λA*τ) - exp(λB*τ))/(λA - λB)
	T_C = T_C_0*exp(λC*τ) + T_B_0*(exp(λB*τ) - exp(λC*τ))/(λB - λC) + T_A_0*((exp(λA*τ) - exp(λC*τ))/(λA - λC) - (exp(λB*τ) - exp(λC*τ))/(λB - λC))/(λA - λB)
	T_D = T_D_0*exp(λD*τ) + T_C_0*(exp(λC*τ) - exp(λD*τ))/(λC - λD) + T_B_0*((exp(λB*τ) - exp(λD*τ))/(λB - λD) - (exp(λC*τ) - exp(λD*τ))/(λC - λD))/(λB - λC) + T_A_0*(((exp(λA*τ) - exp(λD*τ))/(λA - λD) - (exp(λC*τ) - exp(λD*τ))/(λC - λD))/(λA - λC) - ((exp(λB*τ) - exp(λD*τ))/(λB - λD) - (exp(λC*τ) - exp(λD*τ))/(λC - λD))/(λB - λC))/(λA - λB)
	return t, stack([T_A, T_B, T_C, T_D], axis=1)


if __name__ == "__main__":
	main()
