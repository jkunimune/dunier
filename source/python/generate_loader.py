import numpy as np
import matplotlib.pyplot as plt
import os
import shutil
import subprocess

points = [ # define the shape
	[ 0.8, -np.sqrt(6**2 - .8**2) + 1e-14, -1],
	[ 0.8,  0.0, 1],
	[ 3.5,  0.0, 1],
	[ 3.5,  3.0, 1],
	[-3.0,  3.0, 1],
	[-5.0,  0.0, 1],
	[-0.8,  0.0, 1],
	[-0.8, -np.sqrt(6**2 - .8**2) + 1e-14, -1],
]

for i in range(len(points), 0, -1): # populate edges
	p0, p1 = points[i-1], points[i%len(points)]
	for c in np.linspace(0, 1, int(36*np.hypot(p1[0] - p0[0], p1[1] - p0[1])))[1:-1]:
		points.insert(i, [c*p0[0] + (1-c)*p1[0], c*p0[1] + (1-c)*p1[1], max(p0[2], p1[2])])
points = np.array(points)/6 # convert to numpy array and rescale
for i in range(points.shape[0]): # rotate
	points[i,:2] = np.matmul([[np.sqrt(3)/2, 1/2], [-1/2, np.sqrt(3)/2]], points[i,:2])

coords = np.vstack([np.arcsin(points[:,1]), np.arcsin(points[:,0]/np.sqrt(1 - points[:,1]**2))]).T # project
coords[points[:,2] < 0, 1] = -np.pi - coords[points[:,2] < 0, 1]

try:
	os.mkdir('../resources/frames')
except FileExistsError:
	pass

fig = plt.figure()
fig.set_size_inches((1, 1))
ax = plt.Axes(fig, [0, 0, 1, 1])
ax.set_axis_off()
fig.add_axes(ax)
for i, t in enumerate(range(180, 540, 6)): # draw it
	ax.clear()
	# ax.fill(np.cos(np.linspace(0, 2*np.pi)), np.sin(np.linspace(0, 2*np.pi)), color='#8393bf')
	θ = np.radians(t)
	y = np.sin(coords[:,0])
	x = np.sqrt(1 - y**2)*np.sin(coords[:,1] + θ)
	z = np.sqrt(1 - y**2)*np.cos(coords[:,1] + θ)
	if np.any(z > 0): # reproject with longitudinal rotation
		side = np.copysign(1, x[np.argmax(np.where(z >= 0, np.abs(x)/np.sqrt(1 - y**2), -np.inf))])
		x[z < 0] = (side*np.sqrt(1 - y**2))[z < 0]
		ax.fill(x, y, color='#ffffff')#'#c9eca9')
	ax.axis([-1, 1, -1, 1])
	plt.savefig('../resources/frames/frame{:03d}.png'.format(i), bbox_inches=0, transparent=True)

subprocess.run(['magick', "convert", '-resize', '20%', '-delay', '2', '-dispose', '3', '../resources/frames/frame*.png', '../resources/lada.mp4']) # and compress it into a GIF
# subprocess.run(['ffmpeg', '-framerate', '1', '-i', '../resources/frames/frame%03d.png', '-c:v', 'libx264', '-y', '../resources/lada.mp4']) # and compress it into a GIF

shutil.rmtree('../resources/frames') # clean up
