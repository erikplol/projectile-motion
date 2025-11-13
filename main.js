import { ProjectilePhysics } from './physics.js';

// Configuration constants
const CONFIG = {
    CANNON: {
        SCALE: 0.6,
        ROTATION_Y: -Math.PI / 2,
        POSITION_OFFSET: 0.6,
        BARREL_LENGTH: 1.0
    },
    PLATFORM: {
        RADIUS: 0.8,
        HEIGHT: 0.3,
        COLOR: 0x8B4513,
        RADIAL_SEGMENTS: 32
    },
    LANDING_MARKER: {
        RADIUS: 0.3,
        COLOR: 0xff0000,
        OPACITY: 0.7,
        SEGMENTS: 32
    },
    PROJECTILE: {
        RADIUS: 0.1,
        COLOR: 0x2196F3,
        START_OFFSET: { x: -1.0, y: 1.0, z: 0.0 } 
    },
    SCENE: {
        SKY_COLOR: 0x87ceeb,
        GROUND_COLOR: 0x4a8c3f
    },
    CAMERA: {
        FOV: 60,
        POSITION: { x: 8, y: 6, z: 12 },
        LOOK_AT: { x: 5, y: 2, z: 0 }
    },
    CONTROLS: {
        DAMPING_FACTOR: 0.05,
        MIN_DISTANCE: 5,
        MAX_DISTANCE: 50
    },
    ANIMATION: {
        SPEED: 0.01
    },
    TRAJECTORY: {
        COLOR: 0xffff00,
        LINEWIDTH: 2
    },
    VELOCITY_ARROW: {
        SCALE: 0.3,
        HEAD_LENGTH: 0.5,
        HEAD_WIDTH: 0.3,
        COMPONENT_HEAD_LENGTH: 0.3,
        COMPONENT_HEAD_WIDTH: 0.2,
        TOTAL_COLOR: 0xffff00,
        VX_COLOR: 0xff0000,
        VY_COLOR: 0x00ff00
    }
};

// Scene setup
let scene, camera, renderer, controls;
let launcher, projectile, trajectoryLine, velocityArrow, componentArrows;
let ground, gridHelper, platform, landingMarker;
let isAnimating = false;
let animationProgress = 0;
let trajectoryPoints = [];

// Parameters
const DEFAULT_PARAMS = {
    height: 1.5,
    velocity: 10,
    angle: 30,
    showGrid: true,
    showVector: true,
    showComponents: true
};

let params = { ...DEFAULT_PARAMS };

const physics = new ProjectilePhysics();

// Initialize scene
function init() {
    initScene();
    initCamera();
    initRenderer();
    initLights();
    initGround();
    initGrid();
    initControls();
    initPlatform();
    initLandingMarker();
    
    // Create objects
    createLauncher();
    createProjectile();
    createTrajectoryLine();
    createVelocityArrows();
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Initial update
    updateCalculations();
    updateDisplay();
}

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.SCENE.SKY_COLOR);
}

function initCamera() {
    camera = new THREE.PerspectiveCamera(
        CONFIG.CAMERA.FOV,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(CONFIG.CAMERA.POSITION.x, CONFIG.CAMERA.POSITION.y, CONFIG.CAMERA.POSITION.z);
    camera.lookAt(CONFIG.CAMERA.LOOK_AT.x, CONFIG.CAMERA.LOOK_AT.y, CONFIG.CAMERA.LOOK_AT.z);
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
}

function initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
}

function initGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: CONFIG.SCENE.GROUND_COLOR,
        roughness: 0.8,
        metalness: 0.2
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function initGrid() {
    gridHelper = new THREE.GridHelper(100, 100, 0x333333, 0x555555);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
}

function initControls() {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = CONFIG.CONTROLS.DAMPING_FACTOR;
    controls.screenSpacePanning = false;
    controls.minDistance = CONFIG.CONTROLS.MIN_DISTANCE;
    controls.maxDistance = CONFIG.CONTROLS.MAX_DISTANCE;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(CONFIG.CAMERA.LOOK_AT.x, CONFIG.CAMERA.LOOK_AT.y, CONFIG.CAMERA.LOOK_AT.z);
}

function initPlatform() {
    const geometry = new THREE.CylinderGeometry(
        CONFIG.PLATFORM.RADIUS,
        CONFIG.PLATFORM.RADIUS,
        1, // Initial height, will be updated
        CONFIG.PLATFORM.RADIAL_SEGMENTS
    );
    const material = new THREE.MeshStandardMaterial({
        color: CONFIG.PLATFORM.COLOR,
        roughness: 0.8,
        metalness: 0.2
    });
    
    platform = new THREE.Mesh(geometry, material);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    // Position platform at initial height
    updatePlatformHeight();
    
    scene.add(platform);
}

function initLandingMarker() {
    const geometry = new THREE.CircleGeometry(
        CONFIG.LANDING_MARKER.RADIUS,
        CONFIG.LANDING_MARKER.SEGMENTS
    );
    const material = new THREE.MeshBasicMaterial({
        color: CONFIG.LANDING_MARKER.COLOR,
        transparent: true,
        opacity: CONFIG.LANDING_MARKER.OPACITY,
        side: THREE.DoubleSide
    });
    
    landingMarker = new THREE.Mesh(geometry, material);
    landingMarker.rotation.x = -Math.PI / 2; // Lay flat on ground
    landingMarker.position.y = 0.02; // Slightly above ground to prevent z-fighting
    
    scene.add(landingMarker);
}

function updatePlatformHeight() {
    if (!platform) return;
    
    // Update the cylinder's height to match launch height
    const height = params.height > 0 ? params.height : 0.01; // Minimum height to avoid zero
    
    // Recreate geometry with new height
    platform.geometry.dispose();
    platform.geometry = new THREE.CylinderGeometry(
        CONFIG.PLATFORM.RADIUS,
        CONFIG.PLATFORM.RADIUS,
        height,
        CONFIG.PLATFORM.RADIAL_SEGMENTS
    );
    
    // Position platform so it starts at ground (y=0) and extends up to params.height
    platform.position.y = height / 2;
}

function createLauncher() {
    loadCannonWithMaterials();
}

function loadCannonWithMaterials() {
    const mtlLoader = new THREE.MTLLoader();
    
    mtlLoader.load( 
        'models/cannon.mtl',
        (materials) => onMaterialsLoaded(materials),
        (xhr) => console.log(`MTL: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`),
        (error) => {
            console.error('Error loading MTL:', error);
            loadCannonWithoutMaterials();
        }
    );
}

function onMaterialsLoaded(materials) {
    materials.preload();
    console.log('MTL loaded successfully!');
    
    const objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    
    objLoader.load(
        'models/cannon.obj',
        (obj) => onCannonLoaded(obj),
        (xhr) => console.log(`OBJ: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`),
        (error) => {
            console.error('Error loading OBJ:', error);
            loadCannonWithoutMaterials();
        }
    );
}

function loadCannonWithoutMaterials() {
    console.log('Loading cannon without materials...');
    const objLoader = new THREE.OBJLoader();
    
    objLoader.load(
        'models/cannon.obj',
        (obj) => {
            applyDefaultMaterials(obj);
            onCannonLoaded(obj);
        },
        (xhr) => console.log(`OBJ (fallback): ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`),
        (error) => console.error('Error loading OBJ (fallback):', error)
    );
}

function applyDefaultMaterials(obj) {
    obj.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
                color: 0x666666,
                roughness: 0.7,
                metalness: 0.3
            });
        }
    });
}

function onCannonLoaded(obj) {
    launcher = obj;
    
    // Transform cannon
    launcher.scale.set(CONFIG.CANNON.SCALE, CONFIG.CANNON.SCALE, CONFIG.CANNON.SCALE);
    launcher.position.set(0, params.height + CONFIG.CANNON.POSITION_OFFSET, 0);
    
    launcher.rotation.order = 'YXZ';
    launcher.rotation.y = CONFIG.CANNON.ROTATION_Y;
    
    // Setup shadows
    launcher.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    scene.add(launcher);
    console.log('Launcher loaded successfully!');
    
    updateLauncherAngle();
    
    // Update all projectile-related components now that launcher is loaded
    if (projectile) {
        setProjectileToStartPosition();
    }
    if (trajectoryLine) {
        updateTrajectory();
    }
    if (velocityArrow) {
        updateVelocityVectors();
    }
    if (landingMarker) {
        updateLandingMarker();
    }
}

function createProjectile() {
    const geometry = new THREE.SphereGeometry(CONFIG.PROJECTILE.RADIUS, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: CONFIG.PROJECTILE.COLOR,
        metalness: 0.5,
        roughness: 0.2
    });
    
    projectile = new THREE.Mesh(geometry, material);
    projectile.castShadow = true;
    
    const pos = getProjectileStartPosition();
    projectile.position.set(pos.x, pos.y, pos.z);
    
    scene.add(projectile);
}

function getProjectileStartPosition() {
    if (!launcher) {
        // Fallback if launcher not loaded yet
        return {
            x: CONFIG.PROJECTILE.START_OFFSET.x,
            y: params.height + CONFIG.PROJECTILE.START_OFFSET.y,
            z: CONFIG.PROJECTILE.START_OFFSET.z
        };
    }
    
    // Update the launcher's world matrix to ensure it's current
    launcher.updateMatrixWorld(true);
    
    // Create a point at the barrel tip in LOCAL space
    // BARREL_LENGTH is the main offset, START_OFFSET is for fine-tuning in local space
    const barrelTipLocal = new THREE.Vector3(
        CONFIG.CANNON.BARREL_LENGTH + CONFIG.PROJECTILE.START_OFFSET.x,
        CONFIG.PROJECTILE.START_OFFSET.y,
        CONFIG.PROJECTILE.START_OFFSET.z
    );
    
    // Transform to world space using the launcher's transformation matrix
    const barrelTipWorld = barrelTipLocal.applyMatrix4(launcher.matrixWorld);
    
    return { 
        x: barrelTipWorld.x, 
        y: barrelTipWorld.y, 
        z: barrelTipWorld.z 
    };
}

function createTrajectoryLine() {
    const material = new THREE.LineBasicMaterial({ 
        color: CONFIG.TRAJECTORY.COLOR, 
        linewidth: CONFIG.TRAJECTORY.LINEWIDTH
    });
    const geometry = new THREE.BufferGeometry();
    trajectoryLine = new THREE.Line(geometry, material);
    scene.add(trajectoryLine);
}

function createVelocityArrows() {
    createMainVelocityArrow();
    createComponentVelocityArrows();
}

function createMainVelocityArrow() {
    const startPos = getProjectileStartPosition();
    
    velocityArrow = new THREE.ArrowHelper(
        new THREE.Vector3(1, 1, 0).normalize(),
        new THREE.Vector3(startPos.x, startPos.y, startPos.z),
        2,
        CONFIG.VELOCITY_ARROW.TOTAL_COLOR,
        CONFIG.VELOCITY_ARROW.HEAD_LENGTH,
        CONFIG.VELOCITY_ARROW.HEAD_WIDTH
    );
    scene.add(velocityArrow);
}

function createComponentVelocityArrows() {
    const startPos = getProjectileStartPosition();
    const origin = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
    
    componentArrows = {
        x: createComponentArrow(origin, new THREE.Vector3(1, 0, 0), CONFIG.VELOCITY_ARROW.VX_COLOR),
        y: createComponentArrow(origin, new THREE.Vector3(0, 1, 0), CONFIG.VELOCITY_ARROW.VY_COLOR)
    };
}

function createComponentArrow(origin, direction, color) {
    const arrow = new THREE.ArrowHelper(
        direction,
        origin,
        2,
        color,
        CONFIG.VELOCITY_ARROW.COMPONENT_HEAD_LENGTH,
        CONFIG.VELOCITY_ARROW.COMPONENT_HEAD_WIDTH
    );
    scene.add(arrow);
    return arrow;
}

function updateLauncherAngle() {
    if (!launcher) return;
    
    // Update launcher height
    launcher.position.y = params.height + CONFIG.CANNON.POSITION_OFFSET;
    
    // Apply angle rotation on X axis (after Y rotation is already applied)
    const angleRad = (params.angle * Math.PI) / 180;
    launcher.rotation.x = angleRad;
}

function updateTrajectory() {
    const startPos = getProjectileStartPosition();
    
    // Generate trajectory from the barrel tip height
    trajectoryPoints = physics.generateTrajectory(
        startPos.y,
        params.velocity,
        params.angle,
        100
    );
    
    // Map trajectory points to world coordinates
    // Physics calculates trajectory starting from x=0, so we offset by startPos.x
    const points = trajectoryPoints.map(p => 
        new THREE.Vector3(p.x + startPos.x, p.y, startPos.z)
    );
    
    trajectoryLine.geometry.setFromPoints(points);
}

function updateVelocityVectors() {
    const components = physics.getVelocityComponents(params.velocity, params.angle);
    const angleRad = (params.angle * Math.PI) / 180;
    const origin = getProjectileStartPosition();
    const originVec = new THREE.Vector3(origin.x, origin.y, origin.z);
    
    updateMainVelocityArrow(originVec, angleRad, params.velocity);
    updateComponentArrows(originVec, components);
}

function updateMainVelocityArrow(origin, angleRad, velocity) {
    if (!velocityArrow) return;
    
    const direction = new THREE.Vector3(
        Math.cos(angleRad),
        Math.sin(angleRad),
        0
    ).normalize();
    
    const length = velocity * CONFIG.VELOCITY_ARROW.SCALE;
    velocityArrow.position.copy(origin);
    velocityArrow.setDirection(direction);
    velocityArrow.setLength(
        length,
        CONFIG.VELOCITY_ARROW.HEAD_LENGTH,
        CONFIG.VELOCITY_ARROW.HEAD_WIDTH
    );
    velocityArrow.visible = params.showVector;
}

function updateComponentArrows(origin, components) {
    if (!componentArrows) return;
    
    updateComponentArrow(componentArrows.x, origin, components.vx);
    updateComponentArrow(componentArrows.y, origin, components.vy);
}

function updateComponentArrow(arrow, origin, magnitude) {
    arrow.position.copy(origin);
    arrow.setLength(
        magnitude * CONFIG.VELOCITY_ARROW.SCALE,
        CONFIG.VELOCITY_ARROW.COMPONENT_HEAD_LENGTH,
        CONFIG.VELOCITY_ARROW.COMPONENT_HEAD_WIDTH
    );
    arrow.visible = params.showComponents;
}

function updateCalculations() {
    const components = physics.getVelocityComponents(params.velocity, params.angle);
    const maxHeight = physics.getMaxHeight(params.height, params.velocity, params.angle);
    const maxRange = physics.getMaxRange(params.height, params.velocity, params.angle);
    const timeOfFlight = physics.getTimeOfFlight(params.height, params.velocity, params.angle);
    
    // Update info panel
    updateInfoDisplay({
        height: params.height,
        velocity: params.velocity,
        angle: params.angle,
        vx: components.vx,
        vy: components.vy,
        maxHeight,
        maxRange,
        timeOfFlight
    });
}

function updateInfoDisplay(data) {
    document.getElementById('launchHeightDisplay').textContent = `${data.height.toFixed(2)} m`;
    document.getElementById('launchVelocityDisplay').textContent = `${data.velocity.toFixed(2)} m/s`;
    document.getElementById('launchAngleDisplay').textContent = `${data.angle.toFixed(0)}°`;
    document.getElementById('vxDisplay').textContent = `${data.vx.toFixed(2)} m/s`;
    document.getElementById('vyDisplay').textContent = `${data.vy.toFixed(2)} m/s`;
    document.getElementById('maxHeightDisplay').textContent = `${data.maxHeight.toFixed(2)} m`;
    document.getElementById('maxRangeDisplay').textContent = `${data.maxRange.toFixed(2)} m`;
    document.getElementById('timeOfFlightDisplay').textContent = `${data.timeOfFlight.toFixed(2)} s`;
}

function updateDisplay() {
    updateLauncherAngle();
    updatePlatformHeight();
    updateTrajectory();
    updateVelocityVectors();
    updateGridVisibility();
    updateLandingMarker();
    
    // Update projectile position if not animating
    if (!isAnimating) {
        setProjectileToStartPosition();
    }
}

function updateGridVisibility() {
    if (gridHelper) {
        gridHelper.visible = params.showGrid;
    }
}

function updateLandingMarker() {
    if (!landingMarker || trajectoryPoints.length === 0) return;
    
    const startPos = getProjectileStartPosition();
    
    // Use the last point of the trajectory for accurate landing position
    const lastPoint = trajectoryPoints[trajectoryPoints.length - 1];
    
    // Position marker at landing point (accounting for start position offset)
    landingMarker.position.x = startPos.x + lastPoint.x;
    landingMarker.position.z = startPos.z;
}

function resetProjectile() {
    stopAnimation();
    
    // Reset all parameters to defaults
    params.height = DEFAULT_PARAMS.height;
    params.velocity = DEFAULT_PARAMS.velocity;
    params.angle = DEFAULT_PARAMS.angle;
    params.showGrid = DEFAULT_PARAMS.showGrid;
    params.showVector = DEFAULT_PARAMS.showVector;
    params.showComponents = DEFAULT_PARAMS.showComponents;
    
    // Update UI sliders to default values
    document.getElementById('heightSlider').value = DEFAULT_PARAMS.height;
    document.getElementById('heightValue').textContent = DEFAULT_PARAMS.height.toFixed(1);
    
    document.getElementById('velocitySlider').value = DEFAULT_PARAMS.velocity;
    document.getElementById('velocityValue').textContent = DEFAULT_PARAMS.velocity.toFixed(1);
    
    document.getElementById('angleSlider').value = DEFAULT_PARAMS.angle;
    document.getElementById('angleValue').textContent = DEFAULT_PARAMS.angle.toFixed(0);
    
    // Update UI checkboxes to default states
    document.getElementById('gridToggle').checked = DEFAULT_PARAMS.showGrid;
    document.getElementById('vectorToggle').checked = DEFAULT_PARAMS.showVector;
    document.getElementById('componentsToggle').checked = DEFAULT_PARAMS.showComponents;
    
    // Update visibility of visual elements
    if (gridHelper) {
        gridHelper.visible = params.showGrid;
    }
    if (velocityArrow) {
        velocityArrow.visible = params.showVector;
    }
    if (componentArrows) {
        componentArrows.x.visible = params.showComponents;
        componentArrows.y.visible = params.showComponents;
    }
    
    // Reset camera position and controls
    resetCamera();
    
    // Recalculate and update display
    updateCalculations();
    updateDisplay();
    setProjectileToStartPosition();
}

function resetCamera() {
    if (camera) {
        // Reset camera position to default
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
    
    if (controls) {
        // Reset controls target
        controls.target.set(
            CONFIG.CAMERA.LOOK_AT.x,
            CONFIG.CAMERA.LOOK_AT.y,
            CONFIG.CAMERA.LOOK_AT.z
        );
        controls.update();
    }
}

function stopAnimationAndResetPosition() {
    stopAnimation();
    setProjectileToStartPosition();
}

function stopAnimation() {
    isAnimating = false;
    animationProgress = 0;
}

function setProjectileToStartPosition() {
    const startPos = getProjectileStartPosition();
    projectile.position.set(startPos.x, startPos.y, startPos.z);
}

function shootProjectile() {
    if (isAnimating) return;
    startAnimation();
}

function startAnimation() {
    isAnimating = true;
    animationProgress = 0;
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update orbit controls
    if (controls) {
        controls.update();
    }
    
    if (isAnimating && trajectoryPoints.length > 0) {
        animationProgress += 0.01;
        
        if (animationProgress >= 1) {
            animationProgress = 1;
            isAnimating = false;
        }
        
        const index = Math.floor(animationProgress * (trajectoryPoints.length - 1));
        const point = trajectoryPoints[index];
        const startPos = getProjectileStartPosition();
        
        // Use the calculated starting position offset
        projectile.position.set(point.x + startPos.x, point.y, startPos.z);
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// UI Event Listeners
function setupEventListeners() {
    setupSliderListeners();
    setupToggleListeners();
    setupButtonListeners();
    setupModalListeners();
}

function setupSliderListeners() {
    setupHeightSlider();
    setupVelocitySlider();
    setupAngleSlider();
}

function setupHeightSlider() {
    const slider = document.getElementById('heightSlider');
    const display = document.getElementById('heightValue');
    
    slider.addEventListener('input', (e) => {
        params.height = parseFloat(e.target.value);
        display.textContent = params.height.toFixed(1);
        updateCalculations();
        updateDisplay();
        stopAnimationAndResetPosition();
    });
}

function setupVelocitySlider() {
    const slider = document.getElementById('velocitySlider');
    const display = document.getElementById('velocityValue');
    
    slider.addEventListener('input', (e) => {
        params.velocity = parseFloat(e.target.value);
        display.textContent = params.velocity.toFixed(1);
        updateCalculations();
        updateDisplay();
        stopAnimationAndResetPosition();
    });
}

function setupAngleSlider() {
    const slider = document.getElementById('angleSlider');
    const display = document.getElementById('angleValue');
    
    slider.addEventListener('input', (e) => {
        params.angle = parseFloat(e.target.value);
        display.textContent = params.angle.toFixed(0);
        updateCalculations();
        updateDisplay();
        stopAnimationAndResetPosition();
    });
}

function setupToggleListeners() {
    setupGridToggle();
    setupVectorToggle();
    setupComponentsToggle();
}

function setupGridToggle() {
    document.getElementById('gridToggle').addEventListener('change', (e) => {
        params.showGrid = e.target.checked;
        updateGridVisibility();
    });
}

function setupVectorToggle() {
    document.getElementById('vectorToggle').addEventListener('change', (e) => {
        params.showVector = e.target.checked;
        if (velocityArrow) {
            velocityArrow.visible = params.showVector;
        }
    });
}

function setupComponentsToggle() {
    document.getElementById('componentsToggle').addEventListener('change', (e) => {
        params.showComponents = e.target.checked;
        if (componentArrows) {
            componentArrows.x.visible = params.showComponents;
            componentArrows.y.visible = params.showComponents;
        }
    });
}

function setupButtonListeners() {
    document.getElementById('shootBtn').addEventListener('click', shootProjectile);
    document.getElementById('resetBtn').addEventListener('click', resetProjectile);
}

function setupModalListeners() {
    const modal = document.getElementById('theoryModal');
    const theoryBtn = document.getElementById('theoryBtn');
    const closeBtn = document.querySelector('.close');
    
    theoryBtn.addEventListener('click', () => openModal(modal));
    closeBtn.addEventListener('click', () => closeModal(modal));
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

function openModal(modal) {
    modal.style.display = 'block';
}

function closeModal(modal) {
    modal.style.display = 'none';
}

// Start
init();
setupEventListeners();
animate();
