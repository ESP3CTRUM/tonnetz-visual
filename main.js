// Importar Three.js y OrbitControls desde un CDN moderno
import * as THREE from 'https://unpkg.com/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.153.0/examples/jsm/controls/OrbitControls.js';

// Configuración básica de la escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222233);

// Cámara de perspectiva
const camera = new THREE.PerspectiveCamera(
  60, // FOV
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near
  1000 // Far
);
camera.position.set(0, 10, 20);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Optimización sugerida
renderer.shadowMap.enabled = false; // Sombra desactivada por rendimiento

document.body.appendChild(renderer.domElement);

// Controles de órbita
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;

// Animación principal
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Ajuste responsivo
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Generación de nodos y conexiones del Tonnetz ===

// Parámetros del Tonnetz
const numFilas = 5; // Número de filas de nodos
const numColumnas = 7; // Número de columnas de nodos
const distancia = 2; // Distancia entre nodos

// Función para calcular la posición de cada nodo en una cuadrícula hexagonal
function calcularPosicionNodo(fila, columna) {
  const x = columna * distancia + (fila % 2) * (distancia / 2);
  const y = 0;
  const z = fila * (distancia * Math.sin(Math.PI / 3));
  return new THREE.Vector3(x, y, z);
}

// Crear nodos (esferas)
const nodos = [];
const geometriaNodo = new THREE.SphereGeometry(0.3, 24, 24);
const materialNodo = new THREE.MeshStandardMaterial({ color: 0x66ccff });

for (let fila = 0; fila < numFilas; fila++) {
  for (let columna = 0; columna < numColumnas; columna++) {
    const posicion = calcularPosicionNodo(fila, columna);
    const esfera = new THREE.Mesh(geometriaNodo, materialNodo.clone());
    esfera.position.copy(posicion);
    scene.add(esfera);
    nodos.push({ fila, columna, mesh: esfera, posicion });
  }
}

// === Efectos visuales dinámicos y modularización ===

// Guardar referencias a las líneas para manipulación dinámica
const conexiones = [];

function conectarNodos(nodoA, nodoB) {
  const puntos = [nodoA.posicion, nodoB.posicion];
  const geometriaLinea = new THREE.BufferGeometry().setFromPoints(puntos);
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  const linea = new THREE.Line(geometriaLinea, material);
  scene.add(linea);
  conexiones.push({
    nodos: [nodoA, nodoB],
    linea,
    material
  });
}

// Conexiones horizontales y diagonales (hex grid)
for (let nodo of nodos) {
  // Derecha
  const vecinoDerecha = nodos.find(n => n.fila === nodo.fila && n.columna === nodo.columna + 1);
  if (vecinoDerecha) conectarNodos(nodo, vecinoDerecha);
  // Diagonal abajo derecha
  const vecinoDiagDer = nodos.find(n => n.fila === nodo.fila + 1 && n.columna === nodo.columna + (nodo.fila % 2));
  if (vecinoDiagDer) conectarNodos(nodo, vecinoDiagDer);
  // Diagonal abajo izquierda
  const vecinoDiagIzq = nodos.find(n => n.fila === nodo.fila + 1 && n.columna === nodo.columna - 1 + (nodo.fila % 2));
  if (vecinoDiagIzq) conectarNodos(nodo, vecinoDiagIzq);
}

// Luz ambiental y direccional para mejor visualización
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(luzAmbiente);
const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.6);
luzDireccional.position.set(10, 20, 10);
scene.add(luzDireccional);

// Añadir interacción: al hacer click en un nodo, resalta las conexiones
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
  // Calcular posición normalizada del mouse
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodos.map(n => n.mesh));
  if (intersects.length > 0) {
    const nodoSeleccionado = nodos.find(n => n.mesh === intersects[0].object);
    resaltarConexiones(nodoSeleccionado);
  }
}

function resaltarConexiones(nodo) {
  // Restaurar todas las líneas
  conexiones.forEach(c => {
    c.material.color.set(0xffffff);
    c.material.linewidth = 2;
  });
  // Resaltar conexiones del nodo
  conexiones.forEach(c => {
    if (c.nodos.includes(nodo)) {
      c.material.color.set(0xff3366);
      c.material.linewidth = 6;
    }
  });
  // Resaltar el nodo
  nodos.forEach(n => n.mesh.material.color.set(0x66ccff));
  nodo.mesh.material.color.set(0xff3366);
}

window.addEventListener('click', onClick);

// === Estructura para integración MIDI/audio ===
// Aquí se puede conectar la lógica de eventos musicales para llamar a resaltarConexiones(nodo) según la nota tocada
// Por ejemplo, usando Tone.js o MIDI.js para detectar eventos y activar efectos visuales

// Ejemplo de función para simular evento musical (puedes llamar esto desde integración MIDI)
function activarNotaPorIndice(indice) {
  if (nodos[indice]) {
    resaltarConexiones(nodos[indice]);
  }
}

// === Lógica del menú de usuario ===

const colorInput = document.getElementById('color');
const resetBtn = document.getElementById('reset');
const instrumentoSelect = document.getElementById('instrumento');

colorInput.addEventListener('input', (e) => {
  const color = new THREE.Color(e.target.value);
  nodos.forEach(n => {
    // Solo cambia el color si el nodo no está resaltado
    if (n.mesh.material.color.getHexString() !== 'ff3366') {
      n.mesh.material.color.copy(color);
    }
  });
});

resetBtn.addEventListener('click', () => {
  // Restaurar color de nodos y líneas
  const color = new THREE.Color(colorInput.value);
  nodos.forEach(n => n.mesh.material.color.copy(color));
  conexiones.forEach(c => {
    c.material.color.set(0xffffff);
    c.material.linewidth = 2;
  });
});

instrumentoSelect.addEventListener('change', (e) => {
  // Aquí se puede integrar la lógica para cambiar el instrumento virtual
  // Por ahora solo mostramos en consola
  console.log('Instrumento seleccionado:', e.target.value);
});
