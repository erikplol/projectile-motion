// Physics calculations for pendulum motion
export class PendulumPhysics {
    constructor() {
        this.g = 9.8; // gravity (m/s²)
    }

    // Calculate angular frequency for small angles
    getAngularFrequency(length) {
        return Math.sqrt(this.g / length);
    }

    // Calculate period
    getPeriod(length) {
        return 2 * Math.PI * Math.sqrt(length / this.g);
    }

    // Calculate frequency
    getFrequency(length) {
        return 1 / this.getPeriod(length);
    }

    // Calculate angular acceleration
    getAngularAcceleration(length, angle) {
        return -(this.g / length) * Math.sin(angle);
    }

    // Calculate linear velocity from angular velocity
    getLinearVelocity(length, angularVelocity) {
        return length * angularVelocity;
    }

    // Calculate height from angle
    getHeight(length, angle) {
        return length * (1 - Math.cos(angle));
    }

    // Calculate kinetic energy
    getKineticEnergy(mass, length, angularVelocity) {
        const v = this.getLinearVelocity(length, angularVelocity);
        return 0.5 * mass * v * v;
    }

    // Calculate potential energy
    getPotentialEnergy(mass, length, angle) {
        const h = this.getHeight(length, angle);
        return mass * this.g * h;
    }

    // Calculate total energy
    getTotalEnergy(mass, length, angle, angularVelocity) {
        return this.getKineticEnergy(mass, length, angularVelocity) + 
               this.getPotentialEnergy(mass, length, angle);
    }

    // Update pendulum state (Runge-Kutta 4th order method for better accuracy)
    updateState(angle, angularVelocity, length, dt, damping = 0) {
        // RK4 implementation for better accuracy
        const acceleration = (theta, omega) => {
            return -(this.g / length) * Math.sin(theta) - (damping * omega);
        };

        const k1_theta = angularVelocity;
        const k1_omega = acceleration(angle, angularVelocity);

        const k2_theta = angularVelocity + 0.5 * dt * k1_omega;
        const k2_omega = acceleration(angle + 0.5 * dt * k1_theta, angularVelocity + 0.5 * dt * k1_omega);

        const k3_theta = angularVelocity + 0.5 * dt * k2_omega;
        const k3_omega = acceleration(angle + 0.5 * dt * k2_theta, angularVelocity + 0.5 * dt * k2_omega);

        const k4_theta = angularVelocity + dt * k3_omega;
        const k4_omega = acceleration(angle + dt * k3_theta, angularVelocity + dt * k3_omega);

        const newAngle = angle + (dt / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta);
        const newAngularVelocity = angularVelocity + (dt / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega);

        return {
            angle: newAngle,
            angularVelocity: newAngularVelocity
        };
    }

    // Calculate bob position in 3D space
    getBobPosition(length, angle, pivotHeight) {
        const bobX = length * Math.sin(angle);
        const bobY = pivotHeight - length * Math.cos(angle);
        return { x: bobX, y: bobY, z: 0 };
    }

    // Calculate rod rotation
    getRodRotation(angle) {
        return angle; // Rotation around Z-axis
    }
}
