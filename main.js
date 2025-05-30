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
  TWEEN.update();
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
    // Asignar metadatos
    esfera.userData = {
      tipo: 'nodo',
      fila,
      columna,
      nota: null // Se asigna después
    };
    scene.add(esfera);
    nodos.push({ fila, columna, mesh: esfera, posicion });
  }
}

// Asignar nota a userData de cada nodo
nodos.forEach((n, idx) => {
  n.mesh.userData.nota = notaPorNodo[idx];
});

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

// === Módulo de Audio y Síntesis ===

let audioIniciado = false;
let sampler = null;
let notaPorNodo = [];

// Mapeo simple de nodos a notas (C4, D4, E4, ...)
const notasBase = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"];

function asignarNotasANodos() {
  // Asignar notas cíclicamente a los nodos
  let idx = 0;
  for (let n of nodos) {
    notaPorNodo.push(notasBase[idx % notasBase.length]);
    idx++;
  }
}
asignarNotasANodos();

async function cargarSampler(instrumento = "acoustic_grand_piano") {
  // Usar Tone.js Sampler con samples de piano por defecto
  sampler = new Tone.Sampler({
    urls: {
      C4: "C4.mp3",
      Ds4: "Ds4.mp3",
      Fs4: "Fs4.mp3",
      A4: "A4.mp3"
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    onload: () => console.log("Sampler cargado")
  }).toDestination();
}

// Botón para iniciar el audio (por políticas de autoplay)
const btnIniciarAudio = document.getElementById('iniciarAudio');
btnIniciarAudio.addEventListener('click', async () => {
  if (!audioIniciado) {
    await Tone.start();
    await cargarSampler();
    audioIniciado = true;
    btnIniciarAudio.disabled = true;
    btnIniciarAudio.textContent = "Audio iniciado";
  }
});

// === Sistema de estados para nodos activos ===
const nodosActivos = new Set();

// === Animación suave con Tween.js ===
function animarNodo(nodo, activo = true) {
  const mesh = nodo.mesh;
  // Color
  const colorInicial = { ...mesh.material.color };
  const colorFinal = activo ? { r: 1, g: 0.2, b: 0.4 } : { r: 0.4, g: 0.8, b: 1 };
  new TWEEN.Tween(colorInicial)
    .to(colorFinal, 250)
    .onUpdate(() => {
      mesh.material.color.setRGB(colorInicial.r, colorInicial.g, colorInicial.b);
    })
    .start();
  // Escala
  const escalaInicial = { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z };
  const escalaFinal = activo ? { x: 1.5, y: 1.5, z: 1.5 } : { x: 1, y: 1, z: 1 };
  new TWEEN.Tween(escalaInicial)
    .to(escalaFinal, 250)
    .onUpdate(() => {
      mesh.scale.set(escalaInicial.x, escalaInicial.y, escalaInicial.z);
    })
    .start();
}

// Modificar la función de click para animar y gestionar estados
function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  // Buscar intersección con nodos
  const intersected = raycaster.intersectObjects(nodos.map(n => n.mesh));
  if (intersected.length > 0) {
    const mesh = intersected[0].object;
    const nodo = nodos.find(n => n.mesh === mesh);
    resaltarConexiones(nodo);
    // Animar nodo
    if (!nodosActivos.has(nodo)) {
      animarNodo(nodo, true);
      nodosActivos.add(nodo);
      setTimeout(() => {
        animarNodo(nodo, false);
        nodosActivos.delete(nodo);
      }, 400);
    }
    // Reproducir nota asociada
    if (audioIniciado && sampler) {
      const idx = nodos.indexOf(nodo);
      const nota = notaPorNodo[idx];
      sampler.triggerAttackRelease(nota, "8n");
    }
  }
}

window.addEventListener('click', onClick);

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

// === Importación y Parsing de Archivos MIDI ===

let eventosMIDI = [];

const inputMidi = document.getElementById('midiFile');
inputMidi.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const arrayBuffer = ev.target.result;
    parsearMIDI(arrayBuffer);
  };
  reader.readAsArrayBuffer(file);
});

function parsearMIDI(arrayBuffer) {
  // Usar midi-parser-js para convertir a JSON
  const midiArray = new Uint8Array(arrayBuffer);
  const midiData = MidiParser.parse(midiArray);
  // Validar tipo
  if (midiData.header && (midiData.header.formatType === 0 || midiData.header.formatType === 1)) {
    eventosMIDI = extraerEventosNotas(midiData);
    alert('Archivo MIDI cargado correctamente. Eventos de nota: ' + eventosMIDI.length);
  } else {
    alert('Formato MIDI no soportado. Solo Type 0 y 1.');
  }
}

function extraerEventosNotas(midiData) {
  // Extraer eventos de notaOn y notaOff con tiempo
  let eventos = [];
  (midiData.track || []).forEach(track => {
    let tiempo = 0;
    (track.event || []).forEach(ev => {
      tiempo += ev.deltaTime || 0;
      if (ev.type === 9 && ev.data && ev.data[1] > 0) { // noteOn
        eventos.push({
          nota: ev.data[0],
          tiempo,
          tipo: 'on',
          canal: ev.channel
        });
      }
      if (ev.type === 8 || (ev.type === 9 && ev.data && ev.data[1] === 0)) { // noteOff
        eventos.push({
          nota: ev.data[0],
          tiempo,
          tipo: 'off',
          canal: ev.channel
        });
      }
    });
  });
  return eventos;
}

// === Paletas de color ===
const paletas = {
  warm: { node: "#FF5733", line: "#FFC300", background: "#F2A65A" },
  cool: { node: "#3498DB", line: "#2ECC71", background: "#B3B6B7" },
  neutral: { node: "#808080", line: "#A9A9A9", background: "#D3D3D3" }
};

function aplicarPaleta(nombre) {
  const paleta = paletas[nombre];
  if (!paleta) return;
  // Fondo
  const colorFondo = new THREE.Color(scene.background);
  const colorFondoFinal = new THREE.Color(paleta.background);
  new TWEEN.Tween({ r: colorFondo.r, g: colorFondo.g, b: colorFondo.b })
    .to({ r: colorFondoFinal.r, g: colorFondoFinal.g, b: colorFondoFinal.b }, 500)
    .onUpdate(function (val) {
      scene.background.setRGB(val.r, val.g, val.b);
    })
    .start();
  // Nodos
  nodos.forEach(n => {
    const colorInicial = { ...n.mesh.material.color };
    const colorFinal = new THREE.Color(paleta.node);
    new TWEEN.Tween(colorInicial)
      .to({ r: colorFinal.r, g: colorFinal.g, b: colorFinal.b }, 500)
      .onUpdate(() => {
        n.mesh.material.color.setRGB(colorInicial.r, colorInicial.g, colorInicial.b);
      })
      .start();
  });
  // Líneas
  conexiones.forEach(c => {
    const colorInicial = { ...c.material.color };
    const colorFinal = new THREE.Color(paleta.line);
    new TWEEN.Tween(colorInicial)
      .to({ r: colorFinal.r, g: colorFinal.g, b: colorFinal.b }, 500)
      .onUpdate(() => {
        c.material.color.setRGB(colorInicial.r, colorInicial.g, colorInicial.b);
      })
      .start();
  });
}

// === UI: pantalla completa y reset de vista ===
const btnFullscreen = document.getElementById('fullscreen');
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.body.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

const btnResetView = document.getElementById('resetView');
btnResetView.addEventListener('click', () => {
  camera.position.set(0, 10, 20);
  controls.target.set(0, 0, 0);
  controls.update();
});

// === Selector de paleta de color ===
const paletaSelect = document.getElementById('paleta');
paletaSelect.addEventListener('change', (e) => {
  aplicarPaleta(e.target.value);
});
// Aplicar paleta por defecto
aplicarPaleta('cool');
