import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 15, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Materials
const atomMaterial = new THREE.MeshStandardMaterial({ color: 0xb0c4de, metalness: 0.6, roughness: 0.2 });
const protonMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const originMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

const atomRadius = 0.3;
const protonRadius = 0.2;

const unitCellSize = 2;
const latticeSize = 5;
const latticeOffset = (latticeSize * unitCellSize) / 2;

const minBound = new THREE.Vector3(Infinity, Infinity, Infinity);
const maxBound = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

// FCC lattice
function createAtom(x, y, z) {
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(atomRadius, 16, 16), atomMaterial);
  sphere.position.set(x, y, z);
  scene.add(sphere);
  minBound.min(sphere.position);
  maxBound.max(sphere.position);
}

function createFCCUnitCell(origin) {
  const [ox, oy, oz] = origin;
  const positions = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1],
    [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5],
    [1, 0.5, 0.5], [0.5, 1, 0.5], [0.5, 0.5, 1]
  ];
  for (const [x, y, z] of positions) {
    createAtom(
      ox + x * unitCellSize,
      oy + y * unitCellSize,
      oz + z * unitCellSize
    );
  }
}

// Build lattice
for (let x = 0; x < latticeSize; x++) {
  for (let y = 0; y < latticeSize; y++) {
    for (let z = 0; z < latticeSize; z++) {
      createFCCUnitCell([
        x * unitCellSize - latticeOffset + unitCellSize / 2,
        y * unitCellSize - latticeOffset + unitCellSize / 2,
        z * unitCellSize - latticeOffset + unitCellSize / 2
      ]);
    }
  }
}

// Bounding box
const center = new THREE.Vector3().addVectors(minBound, maxBound).multiplyScalar(0.5);
const size = new THREE.Vector3().subVectors(maxBound, minBound).addScalar(atomRadius * 2);
const outlineGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
const outlineEdges = new THREE.EdgesGeometry(outlineGeometry);
const outlineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const outline = new THREE.LineSegments(outlineEdges, outlineMaterial);
outline.position.copy(center);
scene.add(outline);

// 🟢 Origin marker + axes now at corner
const originMarker = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), originMaterial);
originMarker.position.copy(minBound);
scene.add(originMarker);

const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.copy(minBound);
scene.add(axesHelper);

// Proton and trail
const proton = new THREE.Mesh(new THREE.SphereGeometry(protonRadius, 16, 16), protonMaterial);
scene.add(proton);

const trailPoints = [];
const trailGeometry = new THREE.BufferGeometry();
const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trailLine);

// DOM elements
const inputX = document.getElementById("inputX");
const inputY = document.getElementById("inputY");
const inputZ = document.getElementById("inputZ");
const inputVX = document.getElementById("inputVX");
const inputVY = document.getElementById("inputVY");
const inputVZ = document.getElementById("inputVZ");
const normalizeCheckbox = document.getElementById("normalizeVector");
const speedSlider = document.getElementById("speedSlider");
const speedLabel = document.getElementById("speedLabel");
const zoomSlider = document.getElementById("zoomSlider");
const zoomLabel = document.getElementById("zoomLabel");


const launchBtn = document.getElementById("launchBtn");
const resetBtn = document.getElementById("resetBtn");

// 💬 Input defaults: now reflect corner origin
inputX.value = minBound.x.toFixed(1);
inputY.value = minBound.y.toFixed(1);
inputZ.value = minBound.z.toFixed(1);
inputVX.value = "0.0";
inputVY.value = "0.0";
inputVZ.value = "0.1";
speedLabel.textContent = parseFloat(speedSlider.value).toFixed(2);

let protonVelocity = new THREE.Vector3();
let protonActive = false;

function updateProtonPositionFromInputs() {
  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);
  const z = parseFloat(inputZ.value);
  if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
    proton.position.set(x, y, z);
  }
}

[inputX, inputY, inputZ].forEach(input => {
  input.addEventListener("input", updateProtonPositionFromInputs);
});

speedSlider.addEventListener("input", () => {
  speedLabel.textContent = parseFloat(speedSlider.value).toFixed(2);
});
zoomSlider.addEventListener("input", () => {
  const zoomValue = parseFloat(zoomSlider.value);
  zoomLabel.textContent = `${zoomValue.toFixed(2)}×`;

  // Adjust camera distance by scaling its position vector from the center
  const direction = new THREE.Vector3().subVectors(camera.position, center).normalize();
  const distance = 15 * zoomValue; // Base distance is 15
  camera.position.copy(direction.multiplyScalar(distance).add(center));
  camera.lookAt(center);
});


// 🚀 Launch
launchBtn.addEventListener("click", () => {
  updateProtonPositionFromInputs();
  trailPoints.length = 0;
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));

  const vx = parseFloat(inputVX.value);
  const vy = parseFloat(inputVY.value);
  const vz = parseFloat(inputVZ.value);
  let velocityVec = new THREE.Vector3(vx, vy, vz);

  if (velocityVec.length() === 0) {
    console.warn("Trajectory vector is zero—cannot launch.");
    return;
  }

  if (normalizeCheckbox.checked) {
    velocityVec.normalize();
  }

  const speed = parseFloat(speedSlider.value);
  velocityVec.multiplyScalar(speed);
  protonVelocity.copy(velocityVec);
  protonActive = true;

  // 🌐 Send to backend for stopping power prediction
  const start_pos = [
    parseFloat(inputX.value),
    parseFloat(inputY.value),
    parseFloat(inputZ.value)
  ];

  const vdir = [vx, vy, vz];
  let vdir_normalized = vdir;
  if (normalizeCheckbox.checked) {
    const mag = Math.sqrt(vdir[0]**2 + vdir[1]**2 + vdir[2]**2);
    vdir_normalized = vdir.map(v => v / mag);
  }

  const payload = {
    start_pos: start_pos,
    vdir: vdir_normalized,
    vmag: speed
  };

  fetch("https://stoppingpowersimulationbackended-1.onrender.com/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(result => {
    const display = document.getElementById("resultDisplayOverlay");
    if (result.stopping_power !== undefined) {
      display.innerHTML = `
  <strong>Estimated Stopping Power:</strong> ${result.stopping_power.toFixed(4)} MeV/(mg/cm²)
  <br />
  <span style="font-size: 0.9em; color: gray;">
    ⚠️ This result uses a legacy featurizer stack that may include incomplete or degraded components.
    Predictions are exploratory and may not reflect physically accurate stopping powers.
    <br />
    ℹ️ <em>Note: Starting position is not used in prediction. Only velocity direction and magnitude affect the result.</em>
  </span>
`;

    } else {
      display.innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
  })
  .catch(err => {
    document.getElementById("resultDisplay").innerHTML =
      `<span style="color: red;">Request failed: ${err.message}</span>`;
  });
});

// 🔄 Reset
resetBtn.addEventListener("click", () => {
  protonActive = false;
  trailPoints.length = 0;
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));

  inputX.value = minBound.x.toFixed(1);
  inputY.value = minBound.y.toFixed(1);
  inputZ.value = minBound.z.toFixed(1);
  updateProtonPositionFromInputs();

  inputVX.value = "0.0";
  inputVY.value = "0.0";
  inputVZ.value = "0.1";
  protonVelocity.set(0, 0, 0);

  // Clear result display
  document.getElementById("resultDisplay").innerHTML = "";
;
});


// 🔁 Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (protonActive) {
    proton.position.add(protonVelocity);
    trailPoints.push(proton.position.clone());

    const positions = new Float32Array(trailPoints.length * 3);
    trailPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });

    trailGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    trailGeometry.setDrawRange(0, trailPoints.length);

    if (proton.position.distanceTo(center) > latticeSize * unitCellSize * 2) {
      protonActive = false;
    }
  }

  controls.update(); // Optional: smooth camera motion
  renderer.render(scene, camera); 
}


updateProtonPositionFromInputs();
zoomSlider.dispatchEvent(new Event("input")); // 👈 Initializes zoom
animate();




















