# Projectile Motion and Pendulum Simulation

Interactive physics website for learning:
- Projectile motion (`Gerak Parabola`)
- Simple pendulum (`Bandul Sederhana`)

Live website: `https://erikplol.github.io/projectile-motion/`

## Authors
1. Medericus Mundi Miseridityo (5025231169)
2. Muhammad Baihaqi Dawanis (5025231177)

## What This Project Contains
- `index.html`: Landing page to choose a simulation.
- `projectile/`: 3D projectile simulator with trajectory and velocity vectors.
- `harmonic/`: 3D pendulum simulator with period, frequency, and energy display.

Both simulations are built with:
- `Three.js` for 3D rendering
- `OrbitControls` for camera interaction
- `KaTeX` for rendering equations in the theory modal

## Simulation Details

### 1) Projectile Motion (`projectile/`)
User can change:
- Launch height (`0` to `5` m)
- Initial velocity (`1` to `20` m/s)
- Launch angle (`0` to `90` deg)

Real-time outputs:
- Velocity components (`vx`, `vy`)
- Maximum height
- Horizontal range
- Time of flight

Core equations used:
- `vx = v0 cos(theta)`
- `vy = v0 sin(theta)`
- `y(t) = y0 + vy t - 1/2 g t^2`
- `T = (vy + sqrt(vy^2 + 2 g y0)) / g`
- `R = vx * T`

### 2) Simple Pendulum (`harmonic/`)
User can change:
- Initial angle (`5` to `85` deg)
- String length (`1` to `5` m)
- Mass (`0.1` to `5` kg)

Real-time outputs:
- Period and frequency
- Instantaneous angle, angular velocity, angular acceleration
- Kinetic and potential energy

Core equations used:
- `omega = sqrt(g / L)`
- `T = 2 pi sqrt(L / g)`
- `f = 1 / T`
- `alpha = -(g / L) sin(theta)`
- `Ek = 1/2 m v^2`, `Ep = m g L (1 - cos(theta))`

Numerical integration:
- Pendulum state update uses RK4 (Runge-Kutta 4th order) for better stability and accuracy.

## Run Locally
Because this project loads ES modules and 3D assets, use a local HTTP server.

Example options:

```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js (if installed)
npx serve .
```

Then open:
- `http://localhost:8000/`

## Learning Focus
This project is designed for interactive exploration of:
- Kinematics and vector decomposition (projectile motion)
- Oscillation, period/frequency, and energy conversion (pendulum)