import { PendulumPhysics } from './physics.js';

// Configuration constants
const CONFIG = {
    PIVOT: {
        HEIGHT: 5,
        RADIUS: 0.15,
        COLOR: 0x6a7a8a,
        METALNESS: 0.8,
        ROUGHNESS: 0.2
    },
    BEAM: {
        WIDTH: 6,
        HEIGHT: 0.3,
        DEPTH: 0.3,
        COLOR: 0x6a7a8a
    },
    ROD: {
        RADIUS: 0.03,
        COLOR: 0xa78bfa,
        METALNESS: 0.6,
        ROUGHNESS: 0.3,
        SEGMENTS: 8
    },
    BOB: {
        RADIUS: 0.3,
        COLOR: 0x60a5fa,
        METALNESS: 0.8,
        ROUGHNESS: 0.2,
        EMISSIVE: 0x60a5fa,
        EMISSIVE_INTENSITY: 0.3,
        SEGMENTS: 32
    },
    REFERENCE_LINE: {
        COLOR: 0xff5555,
        DASH_SIZE: 0.2,
        GAP_SIZE: 0.15,
        OPACITY: 0.5
    },
    SCENE: {
        BACKGROUND: 0x1a1d2e,
        FOG_COLOR: 0x1a1d2e,
        FOG_NEAR: 30,
        FOG_FAR: 100
    },
    GROUND: {
        SIZE: 20,
        COLOR: 0x1a2530,
        ROUGHNESS: 0.85,
        POSITION_Y: -3
    },
    GRID: {
        SIZE: 20,
        DIVISIONS: 20,
        COLOR1: 0x5a7aa0,
        COLOR2: 0x3a4a6a
    },
    CAMERA: {
        FOV: 45,
        POSITION: { x: 2.66, y: 2.97, z: 10.47 },
        LOOK_AT: { x: 3.05, y: 2.03, z: -0.09 }
    },
    LIGHTS: {
        AMBIENT: {
            COLOR: 0x6a7a9a,
            INTENSITY: 0.8
        },
        DIRECTIONAL: {
            COLOR: 0xffffff,
            INTENSITY: 1.8,
            POSITION: { x: 10, y: 20, z: 10 }
        },
        HEMISPHERE: {
            SKY_COLOR: 0x9bb5ff,
            GROUND_COLOR: 0x3a4a6a,
            INTENSITY: 1.0
        }
    },
    CONTROLS: {
        DAMPING_FACTOR: 0.05
    },
    ANIMATION: {
        DT: 0.016 // ~60fps
    }
};

// Scene setup
let scene, camera, renderer, controls;
let pendulumBob, pendulumRod, pivotPoint, referenceLine;
let isAnimating = false;
let time = 0;

// Default parameters
const DEFAULT_PARAMS = {
    length: 3.0,
    angle: 30,
    mass: 1.0,
    gravity: 9.8,
    damping: 0.0
};

let params = { ...DEFAULT_PARAMS };
let currentAngle = 0;
let angularVelocity = 0;

const physics = new PendulumPhysics();

// Initialize
function init() {
    initScene();
    initCamera();
    initRenderer();
    initLights();
    initGround();
    initControls();
    
    createPendulum();
    
    window.addEventListener('resize', onWindowResize);
    
    resetPendulum();
    updateDisplay();
}

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.SCENE.BACKGROUND);
    scene.fog = new THREE.Fog(
        CONFIG.SCENE.FOG_COLOR,
        CONFIG.SCENE.FOG_NEAR,
        CONFIG.SCENE.FOG_FAR
    );
}

function initCamera() {
    camera = new THREE.PerspectiveCamera(
        CONFIG.CAMERA.FOV,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(
        CONFIG.CAMERA.POSITION.x,
        CONFIG.CAMERA.POSITION.y,
        CONFIG.CAMERA.POSITION.z
    );
    camera.lookAt(
        CONFIG.CAMERA.LOOK_AT.x,
        CONFIG.CAMERA.LOOK_AT.y,
        CONFIG.CAMERA.LOOK_AT.z
    );
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
}

function initLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(
        CONFIG.LIGHTS.AMBIENT.COLOR,
        CONFIG.LIGHTS.AMBIENT.INTENSITY
    );
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(
        CONFIG.LIGHTS.DIRECTIONAL.COLOR,
        CONFIG.LIGHTS.DIRECTIONAL.INTENSITY
    );
    directionalLight.position.set(
        CONFIG.LIGHTS.DIRECTIONAL.POSITION.x,
        CONFIG.LIGHTS.DIRECTIONAL.POSITION.y,
        CONFIG.LIGHTS.DIRECTIONAL.POSITION.z
    );
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(
        CONFIG.LIGHTS.HEMISPHERE.SKY_COLOR,
        CONFIG.LIGHTS.HEMISPHERE.GROUND_COLOR,
        CONFIG.LIGHTS.HEMISPHERE.INTENSITY
    );
    scene.add(hemisphereLight);
}

function initGround() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(
        CONFIG.GROUND.SIZE,
        CONFIG.GROUND.SIZE
    );
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.GROUND.COLOR,
        roughness: CONFIG.GROUND.ROUGHNESS
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = CONFIG.GROUND.POSITION_Y;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(
        CONFIG.GRID.SIZE,
        CONFIG.GRID.DIVISIONS,
        CONFIG.GRID.COLOR1,
        CONFIG.GRID.COLOR2
    );
    gridHelper.position.y = CONFIG.GROUND.POSITION_Y + 0.01;
    scene.add(gridHelper);
}

function initControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = CONFIG.CONTROLS.DAMPING_FACTOR;
    controls.target.set(
        CONFIG.CAMERA.LOOK_AT.x,
        CONFIG.CAMERA.LOOK_AT.y,
        CONFIG.CAMERA.LOOK_AT.z
    );
    controls.update();
}

function createPendulum() {
    // Pivot point (ceiling attachment)
    const pivotGeometry = new THREE.SphereGeometry(
        CONFIG.PIVOT.RADIUS,
        16,
        16
    );
    const pivotMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.PIVOT.COLOR,
        metalness: CONFIG.PIVOT.METALNESS,
        roughness: CONFIG.PIVOT.ROUGHNESS
    });
    pivotPoint = new THREE.Mesh(pivotGeometry, pivotMaterial);
    pivotPoint.position.set(0, CONFIG.PIVOT.HEIGHT, 0);
    scene.add(pivotPoint);

    // Support beam
    const beamGeometry = new THREE.BoxGeometry(
        CONFIG.BEAM.WIDTH,
        CONFIG.BEAM.HEIGHT,
        CONFIG.BEAM.DEPTH
    );
    const beamMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.BEAM.COLOR 
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(0, CONFIG.PIVOT.HEIGHT, 0);
    scene.add(beam);

    // Pendulum rod
    createRod();

    // Pendulum bob
    createBob();

    // Reference line (vertical equilibrium)
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, CONFIG.PIVOT.HEIGHT, 0),
        new THREE.Vector3(0, CONFIG.PIVOT.HEIGHT - params.length - 1, 0)
    ]);
    const lineMaterial = new THREE.LineDashedMaterial({ 
        color: CONFIG.REFERENCE_LINE.COLOR,
        dashSize: CONFIG.REFERENCE_LINE.DASH_SIZE,
        gapSize: CONFIG.REFERENCE_LINE.GAP_SIZE,
        opacity: CONFIG.REFERENCE_LINE.OPACITY,
        transparent: true
    });
    referenceLine = new THREE.Line(lineGeometry, lineMaterial);
    referenceLine.computeLineDistances();
    scene.add(referenceLine);
}

function createRod() {
    if (pendulumRod) scene.remove(pendulumRod);
    
    const rodGeometry = new THREE.CylinderGeometry(
        CONFIG.ROD.RADIUS,
        CONFIG.ROD.RADIUS,
        params.length,
        CONFIG.ROD.SEGMENTS
    );
    const rodMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.ROD.COLOR,
        metalness: CONFIG.ROD.METALNESS,
        roughness: CONFIG.ROD.ROUGHNESS
    });
    pendulumRod = new THREE.Mesh(rodGeometry, rodMaterial);
    scene.add(pendulumRod);
}

function createBob() {
    if (pendulumBob) scene.remove(pendulumBob);
    
    const bobGeometry = new THREE.SphereGeometry(
        CONFIG.BOB.RADIUS,
        CONFIG.BOB.SEGMENTS,
        CONFIG.BOB.SEGMENTS
    );
    const bobMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.BOB.COLOR,
        metalness: CONFIG.BOB.METALNESS,
        roughness: CONFIG.BOB.ROUGHNESS,
        emissive: CONFIG.BOB.EMISSIVE,
        emissiveIntensity: CONFIG.BOB.EMISSIVE_INTENSITY
    });
    pendulumBob = new THREE.Mesh(bobGeometry, bobMaterial);
    pendulumBob.castShadow = true;
    scene.add(pendulumBob);
}

function updatePendulumPosition() {
    const bobPos = physics.getBobPosition(params.length, currentAngle, CONFIG.PIVOT.HEIGHT);
    
    // Update bob position
    pendulumBob.position.set(bobPos.x, bobPos.y, bobPos.z);
    
    // Update rod position and rotation
    pendulumRod.position.set(
        bobPos.x / 2,
        CONFIG.PIVOT.HEIGHT - params.length / 2 * Math.cos(currentAngle),
        0
    );
    pendulumRod.rotation.z = physics.getRodRotation(currentAngle);
}

function updateDisplay() {
    const period = physics.getPeriod(params.length);
    const frequency = physics.getFrequency(params.length);
    const angleDeg = currentAngle * 180 / Math.PI;
    const angularAcceleration = physics.getAngularAcceleration(params.length, currentAngle);
    
    const kineticEnergy = physics.getKineticEnergy(params.mass, params.length, angularVelocity);
    const potentialEnergy = physics.getPotentialEnergy(params.mass, params.length, currentAngle);
    
    document.getElementById('amplitudeDisplay').textContent = angleDeg.toFixed(1) + '°';
    document.getElementById('periodDisplay').textContent = period.toFixed(2) + ' s';
    document.getElementById('frequencyDisplay').textContent = frequency.toFixed(2) + ' Hz';
    document.getElementById('positionDisplay').textContent = angleDeg.toFixed(1) + '°';
    document.getElementById('velocityDisplay').textContent = angularVelocity.toFixed(2) + ' rad/s';
    document.getElementById('accelerationDisplay').textContent = angularAcceleration.toFixed(2) + ' rad/s²';
    document.getElementById('kineticDisplay').textContent = kineticEnergy.toFixed(2) + ' J';
    document.getElementById('potentialDisplay').textContent = potentialEnergy.toFixed(2) + ' J';
}

function resetPendulum() {
    isAnimating = false;
    time = 0;
    currentAngle = params.angle * Math.PI / 180;
    angularVelocity = 0;
    updatePendulumPosition();
    updateDisplay();
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) controls.update();
    
    if (isAnimating) {
        // Update pendulum state using physics
        const newState = physics.updateState(
            currentAngle,
            angularVelocity,
            params.length,
            CONFIG.ANIMATION.DT,
            params.damping
        );
        
        currentAngle = newState.angle;
        angularVelocity = newState.angularVelocity;
        
        updatePendulumPosition();
        updateDisplay();
        
        time += CONFIG.ANIMATION.DT;
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Event Listeners
document.getElementById('amplitudeSlider').addEventListener('input', (e) => {
    params.angle = parseFloat(e.target.value);
    document.getElementById('amplitudeValue').textContent = params.angle.toFixed(0);
    if (!isAnimating) {
        resetPendulum();
    }
});

document.getElementById('periodSlider').addEventListener('input', (e) => {
    params.length = parseFloat(e.target.value);
    document.getElementById('periodValue').textContent = params.length.toFixed(1);
    
    // Recreate pendulum with new length
    createRod();
    createBob();
    
    if (!isAnimating) {
        resetPendulum();
    }
});

document.getElementById('massSlider').addEventListener('input', (e) => {
    params.mass = parseFloat(e.target.value);
    document.getElementById('massValue').textContent = params.mass.toFixed(1);
    updateDisplay();
});

document.getElementById('startBtn').addEventListener('click', () => {
    isAnimating = true;
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    isAnimating = false;
});

document.getElementById('resetHarmonicBtn').addEventListener('click', () => {
    resetPendulum();
});

document.getElementById('springToggle').addEventListener('change', (e) => {
    pendulumRod.visible = e.target.checked;
});

// Start
init();
animate();
