// Physics calculations for projectile motion
export class ProjectilePhysics {
    constructor() {
        this.g = 9.81; // gravity (m/s²)
    }

    // Calculate velocity components
    getVelocityComponents(v0, angle) {
        const angleRad = (angle * Math.PI) / 180;
        return {
            vx: v0 * Math.cos(angleRad),
            vy: v0 * Math.sin(angleRad)
        };
    }

    // Calculate maximum height
    getMaxHeight(y0, v0, angle) {
        const angleRad = (angle * Math.PI) / 180;
        const vy = v0 * Math.sin(angleRad);
        return y0 + (vy * vy) / (2 * this.g);
    }

    // Calculate time of flight
    getTimeOfFlight(y0, v0, angle) {
        const angleRad = (angle * Math.PI) / 180;
        const vy = v0 * Math.sin(angleRad);
        // Using quadratic formula: -0.5*g*t² + vy*t + y0 = 0
        const discriminant = (vy * vy) + (2 * this.g * y0);
        return (vy + Math.sqrt(discriminant)) / this.g;
    }

    // Calculate maximum range
    getMaxRange(y0, v0, angle) {
        const components = this.getVelocityComponents(v0, angle);
        const timeOfFlight = this.getTimeOfFlight(y0, v0, angle);
        return components.vx * timeOfFlight;
    }

    // Calculate position at time t
    getPosition(y0, v0, angle, t) {
        const components = this.getVelocityComponents(v0, angle);
        return {
            x: components.vx * t,
            y: y0 + (components.vy * t) - (0.5 * this.g * t * t)
        };
    }

    // Generate trajectory points
    generateTrajectory(y0, v0, angle, numPoints = 50) {
        const timeOfFlight = this.getTimeOfFlight(y0, v0, angle);
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = (i / numPoints) * timeOfFlight;
            const pos = this.getPosition(y0, v0, angle, t);
            if (pos.y >= 0) {
                points.push(pos);
            }
        }
        
        return points;
    }
}
