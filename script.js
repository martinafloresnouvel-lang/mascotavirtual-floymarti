"use strict";

/* ============================================================
   MI MASCOTA VIRTUAL — LÓGICA DEL JUEGO
   ------------------------------------------------------------
   El archivo sigue siempre el mismo orden:
     1. Ajustes
     2. Utilidades
     3. Estado (los datos) y guardado
     4. Elementos de la pantalla
     5. Dibujar (render)
     6. Personalidad y frases
     7. Monedas, misiones, XP y variedad
     8. Acciones del jugador
     9. Nombre personalizable
    10. Tienda (incluida Lola)
    11. Misiones
    12. Armario (accesorios y decoración)
    13. Elegir mascota
    14. Abrir y cerrar paneles
    15. El reloj del juego
    16. Empezar de nuevo
    17. Arrancar

   Regla de oro: las acciones cambian "estado" y después llaman
   a render() y guardar().
   ============================================================ */

/* ------------------------------------------------------------
   1. AJUSTES
   ------------------------------------------------------------ */

const CLAVE_GUARDADO = "mascota-virtual-v1";
const NOMBRE_POR_DEFECTO = "Mochi";
const MONEDAS_INICIALES = 40;

// Versión de los datos guardados. Al subirla, normalizar() se
// encarga de que las partidas antiguas sigan funcionando.
const VERSION = 3;

// Tope de monedas que se pueden ganar cuidándola en un día.
// Evita farmear pulsando botones sin parar.
const CAP_MONEDAS_DIA = 30;

// Segmentos de las barras pequeñas
const MAX_SEGMENTOS = 10;

const RITMO = {
  hambre: 0.08,
  felicidad: 0.045,
  energia: 0.035,
};

const RITMO_DORMIDA = {
  energia: 0.6,
  hambre: 0.02,
};

const MAX_SEGUNDOS_FUERA = 3 * 60 * 60;
const FACTOR_FUERA = 0.5;

/* ------------------------------------------------------------
   2. UTILIDADES
   ------------------------------------------------------------ */

function limitar(valor, minimo = 0, maximo = 100) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function numeroSeguro(valor, porDefecto) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Elige una frase distinta de la última, para no repetirse
let ultimaFrase = "";
function elegirDistinto(lista) {
  if (!lista || lista.length === 0) return "";
  if (lista.length === 1) {
    ultimaFrase = lista[0];
    return lista[0];
  }
  let opcion = elegir(lista);
  for (let intento = 0; intento < 6 && opcion === ultimaFrase; intento++) {
    opcion = elegir(lista);
  }
  ultimaFrase = opcion;
  return opcion;
}

function elemento(id) {
  return document.getElementById(id);
}

function fechaDeHoy() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return hoy.getFullYear() + "-" + mes + "-" + dia;
}

// Las tres misiones del día se eligen según la fecha,
// así son las mismas durante todo el día.
function misionesDeHoy() {
  const hoy = new Date();
  const inicioDeAnio = new Date(hoy.getFullYear(), 0, 0);
  const dias = Math.floor((hoy.getTime() - inicioDeAnio.getTime()) / 86400000);
  const inicio = dias % MISIONES.length;
  return [0, 1, 2].map((i) => MISIONES[(inicio + i) % MISIONES.length]);
}

function contarAcogimiento() {
  return Object.values(estado.habitacion).filter(Boolean).length;
}

/* ------------------------------------------------------------
   EXPERIENCIA Y CRECIMIENTO
   ------------------------------------------------------------
   Cada nivel pide más XP que el anterior. La fórmula sube
   rápido a propósito: subir de nivel debe costar.
   ------------------------------------------------------------ */
function xpNecesaria(nivel) {
  return 70 + nivel * 35 + nivel * nivel * 10;
}

// La mascota crece un 6% por nivel, con un tope del 50%.
function escalaDeNivel(nivel) {
  return Math.min(1.5, 1 + (nivel - 1) * 0.06);
}

/* ------------------------------------------------------------
   3. ESTADO Y GUARDADO
   ------------------------------------------------------------ */

function estadoInicial() {
  return {
    version: VERSION,
    especie: "perro",
    nombre: NOMBRE_POR_DEFECTO,
    hambre: 15,
    felicidad: 80,
    energia: 90,
    durmiendo: false,
    ultimaVez: Date.now(),

    monedas: MONEDAS_INICIALES,
    inventario: [],

    // Progreso: xp es lo que llevas del nivel actual
    nivel: 1,
    xp: 0,

    // Variar de acción da un pequeño impulso (combo de cuidados)
    variedad: { ultima: null, combo: 0 },

    equipado: { cabeza: null, cara: null, cuello: null },
    habitacion: {
      alfombra: null,
      pared: null,
      planta: null,
      mueble: null,
      luz: null,
      juguete: null,
      lola: null,
    },

    misiones: { fecha: fechaDeHoy(), progreso: {}, reclamadas: [] },
    economia: { fecha: fechaDeHoy(), ganadasHoy: 0 },
  };
}

let estado = estadoInicial();

// Cachés para no reconstruir los dibujos en cada segundo
let firmaDecoracion = "";
let caraPintada = "";
let cuerpoPintado = "";
const accesoriosPintados = {};

// Estado de la pantalla (no se guarda)
let panelAbierto = null;
let categoriaTienda = "juguetes";
let expresionTemporal = null;
let temporizadorExpresion = null;
let parpadeando = false;
let ultimoTic = Date.now();
let ticsDesdeGuardado = 0;
let ticsVariedad = 0;
let hayProgreso = false;
let partidaLista = false;

function guardar() {
  // En la primera partida no guardamos hasta que elijas mascota
  if (!partidaLista) return;

  try {
    const copia = { ...estado, ultimaVez: Date.now() };
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(copia));
  } catch (error) {
    console.warn("No se pudo guardar el progreso:", error);
  }
}

/* Convierte los datos guardados en un estado seguro.
   Aquí también ocurre la "migración": los guardados antiguos
   (que no tenían monedas ni tienda) reciben los valores nuevos
   sin perder el nombre ni las necesidades. */
function normalizar(datos) {
  const base = estadoInicial();
  if (!datos || typeof datos !== "object") return base;

  const est = { ...base };

  if (typeof datos.nombre === "string" && datos.nombre.trim()) {
    est.nombre = datos.nombre.trim().slice(0, 14);
  }

  est.hambre = limitar(numeroSeguro(datos.hambre, base.hambre));
  est.felicidad = limitar(numeroSeguro(datos.felicidad, base.felicidad));
  est.energia = limitar(numeroSeguro(datos.energia, base.energia));
  est.durmiendo = Boolean(datos.durmiendo);
  est.ultimaVez = numeroSeguro(datos.ultimaVez, Date.now());
  est.monedas = Math.max(0, Math.floor(numeroSeguro(datos.monedas, MONEDAS_INICIALES)));

  // Especie: si el guardado no la tiene (partidas antiguas), es un perro
  if (ESPECIES.some((especie) => especie.id === datos.especie)) {
    est.especie = datos.especie;
  }

  // Nivel y experiencia
  est.nivel = Math.max(1, Math.floor(numeroSeguro(datos.nivel, 1)));
  est.xp = Math.max(0, Math.floor(numeroSeguro(datos.xp, 0)));
  // Si por lo que sea hay más XP que la necesaria, la pasamos al siguiente nivel
  while (est.xp >= xpNecesaria(est.nivel)) {
    est.xp -= xpNecesaria(est.nivel);
    est.nivel++;
  }

  // Combo de variedad
  if (datos.variedad && typeof datos.variedad === "object") {
    est.variedad = {
      ultima: typeof datos.variedad.ultima === "string" ? datos.variedad.ultima : null,
      combo: limitar(Math.floor(numeroSeguro(datos.variedad.combo, 0)), 0, 6),
    };
  }

  // Inventario: solo ids que existan de verdad y sin repetidos
  const inventario = Array.isArray(datos.inventario) ? datos.inventario : [];
  est.inventario = [...new Set(inventario.filter((id) => objetoPorId(id)))];

  // Accesorios equipados
  if (datos.equipado && typeof datos.equipado === "object") {
    for (const ranura of ["cabeza", "cara", "cuello"]) {
      const id = datos.equipado[ranura];
      const objeto = objetoPorId(id);
      if (objeto && objeto.ranura === ranura && est.inventario.includes(id)) {
        est.equipado[ranura] = id;
      }
    }
  }

  // Decoración colocada
  if (datos.habitacion && typeof datos.habitacion === "object") {
    for (const ranura of Object.keys(est.habitacion)) {
      const id = datos.habitacion[ranura];
      const objeto = objetoPorId(id);
      if (objeto && objeto.ranura === ranura && est.inventario.includes(id)) {
        est.habitacion[ranura] = id;
      }
    }
  }

  // Misiones: si son de otro día, empiezan de cero
  const misiones = datos.misiones;
  if (misiones && misiones.fecha === fechaDeHoy()) {
    est.misiones = { fecha: misiones.fecha, progreso: {}, reclamadas: [] };
    if (misiones.progreso && typeof misiones.progreso === "object") {
      for (const clave of Object.keys(misiones.progreso)) {
        est.misiones.progreso[clave] = Math.max(
          0,
          Math.floor(numeroSeguro(misiones.progreso[clave], 0))
        );
      }
    }
    if (Array.isArray(misiones.reclamadas)) {
      est.misiones.reclamadas = misiones.reclamadas.filter(
        (n) => Number.isInteger(n) && n >= 0 && n < 3
      );
    }
  }

  // Monedas ganadas hoy (para el tope diario)
  const economia = datos.economia;
  if (economia && economia.fecha === fechaDeHoy()) {
    est.economia = {
      fecha: economia.fecha,
      ganadasHoy: Math.max(0, Math.floor(numeroSeguro(economia.ganadasHoy, 0))),
    };
  }

  return aplicarTiempoFuera(est);
}

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE_GUARDADO);
    if (!crudo) return estadoInicial();
    return normalizar(JSON.parse(crudo));
  } catch (error) {
    console.warn("No se pudo leer el progreso guardado:", error);
    return estadoInicial();
  }
}

// El tiempo también pasa mientras la pestaña está cerrada
function aplicarTiempoFuera(datos) {
  const segundos = Math.min(
    (Date.now() - datos.ultimaVez) / 1000,
    MAX_SEGUNDOS_FUERA
  );

  if (segundos < 30) return datos;

  datos.hambre = limitar(datos.hambre + RITMO.hambre * segundos * FACTOR_FUERA);
  datos.felicidad = limitar(
    datos.felicidad - RITMO.felicidad * segundos * FACTOR_FUERA
  );
  datos.energia = limitar(
    datos.energia + RITMO_DORMIDA.energia * 0.05 * segundos * FACTOR_FUERA
  );

  return datos;
}

/* Comprueba si ha cambiado el día y renueva misiones y tope */
function asegurarDia() {
  const hoy = fechaDeHoy();
  let cambio = false;

  if (estado.misiones.fecha !== hoy) {
    estado.misiones = { fecha: hoy, progreso: {}, reclamadas: [] };
    cambio = true;
  }

  if (estado.economia.fecha !== hoy) {
    estado.economia = { fecha: hoy, ganadasHoy: 0 };
    cambio = true;
  }

  if (cambio) {
    avisar("Nuevo día: misiones renovadas 📜");
    renderPaneles();
    guardar();
  }
}

/* ------------------------------------------------------------
   4. ELEMENTOS DE LA PANTALLA
   ------------------------------------------------------------ */

const burbuja = elemento("burbuja");
const escena = elemento("habitacion");
const decoracion = elemento("decoracion");
const particulas = elemento("particulas");
const mascota = elemento("mascota");

const capas = {
  cuerpo: elemento("capa-cuerpo"),
  cuello: elemento("capa-cuello"),
  cara: elemento("capa-cara"),
  cabeza: elemento("capa-cabeza"),
  gafas: elemento("capa-gafas"),
};

const tituloNombre = elemento("titulo-nombre");
const animoTxt = elemento("animo");
const monedero = elemento("monedero");
const monedasTxt = elemento("monedas");
const monedasSuma = elemento("monedas-suma");
const formNombre = elemento("form-nombre");
const entradaNombre = elemento("entrada-nombre");
const botonEditarNombre = elemento("btn-editar-nombre");
const puntoMisiones = elemento("punto-misiones");

const nivelNum = elemento("nivel-num");
const nivelRelleno = elemento("nivel-relleno");
const nivelXp = elemento("nivel-xp");
const barraNivel = document.querySelector(".nivel-barra");

const listaEspecies = elemento("lista-especies");

const segmentos = {
  hambre: elemento("seg-hambre"),
  felicidad: elemento("seg-felicidad"),
  energia: elemento("seg-energia"),
};

const numeros = {
  hambre: elemento("hambre-num"),
  felicidad: elemento("felicidad-num"),
  energia: elemento("energia-num"),
};

const medidores = {
  hambre: document.querySelector('.medidor[data-stat="hambre"]'),
  felicidad: document.querySelector('.medidor[data-stat="felicidad"]'),
  energia: document.querySelector('.medidor[data-stat="energia"]'),
};

const listaTienda = elemento("lista-tienda");
const listaMisiones = elemento("lista-misiones");
const listaArmario = elemento("lista-armario");
const saldoTienda = elemento("saldo-tienda");
const pestanasTienda = elemento("pestanas-tienda");
const telon = elemento("telon");
const avisos = elemento("avisos");

const hojas = {
  tienda: elemento("hoja-tienda"),
  misiones: elemento("hoja-misiones"),
  armario: elemento("hoja-armario"),
  especie: elemento("hoja-especie"),
};

// Piezas extra que necesitan algunos muebles
const PIEZAS_DECO = {
  cama: '<span class="almohada"></span>',
  guirnalda: "<span></span>".repeat(7),
  estanteria: "<span></span>".repeat(7),
  corazon: "<span></span>",
  reloj: "<span></span>",
  cactus: "<span></span>",
  mesita: "<span></span>",
  patito: "<span></span>",
};

/* ------------------------------------------------------------
   5. DIBUJAR EN PANTALLA
   ------------------------------------------------------------ */

let temporizadorBurbuja = null;

function decir(texto, duracion = 3200) {
  burbuja.textContent = texto;
  burbuja.classList.add("visible");

  clearTimeout(temporizadorBurbuja);
  temporizadorBurbuja = setTimeout(() => {
    burbuja.classList.remove("visible");
  }, duracion);
}

function lanzarParticulas(emoji, cantidad = 6, desdeX = null) {
  for (let i = 0; i < cantidad; i++) {
    const particula = document.createElement("span");
    particula.className = "particula";
    particula.textContent = emoji;
    const x = desdeX === null ? 32 + Math.random() * 36 : desdeX + (Math.random() * 6 - 3);
    particula.style.left = x + "%";
    particula.style.setProperty("--giro", Math.random() * 60 - 30 + "deg");
    particula.style.animationDelay = i * 0.07 + "s";

    particulas.appendChild(particula);
    setTimeout(() => particula.remove(), 1600 + i * 80);
  }
}

function animarMascota(clase) {
  mascota.classList.remove(clase);
  void mascota.offsetWidth;
  mascota.classList.add(clase);

  mascota.addEventListener(
    "animationend",
    () => mascota.classList.remove(clase),
    { once: true }
  );
}

function mostrarExpresion(tipo, duracion = 1000) {
  expresionTemporal = tipo;
  clearTimeout(temporizadorExpresion);

  temporizadorExpresion = setTimeout(() => {
    expresionTemporal = null;
    renderMascota();
  }, duracion);

  renderMascota();
}

function avisar(texto) {
  // Como mucho tres avisos a la vez, para no tapar la escena
  while (avisos.children.length >= 3) {
    avisos.firstElementChild.remove();
  }

  const aviso = document.createElement("div");
  aviso.className = "aviso";
  aviso.textContent = texto;
  avisos.appendChild(aviso);
  setTimeout(() => aviso.remove(), 2800);
}

function mostrarSumaMonedas(cantidad) {
  monedasSuma.textContent = "+" + cantidad;

  monedero.classList.remove("gana");
  void monedero.offsetWidth;
  monedero.classList.add("gana");

  monedasSuma.classList.remove("visible");
  void monedasSuma.offsetWidth;
  monedasSuma.classList.add("visible");

  setTimeout(() => {
    monedero.classList.remove("gana");
    monedasSuma.classList.remove("visible");
  }, 950);
}

// Elige su cara según cómo está
function animoActual() {
  if (estado.durmiendo) return "durmiendo";
  if (estado.hambre >= 72) return "hambrienta";
  if (estado.felicidad <= 25) return "triste";
  if (estado.felicidad >= 70 && estado.hambre < 50) return "feliz";
  return "normal";
}

function renderCabecera() {
  tituloNombre.textContent = estado.nombre;
  animoTxt.textContent = etiquetaAnimo();
  document.title = estado.nombre + " · Mi mascota virtual";
  monedasTxt.textContent = estado.monedas;
  saldoTienda.textContent = estado.monedas;
  puntoMisiones.hidden = !hayMisionesListas();
}

/* Nivel, barra de XP y tamaño de la mascota */
function renderNivel() {
  const necesaria = xpNecesaria(estado.nivel);
  const porcentaje = limitar((estado.xp / necesaria) * 100);

  nivelNum.textContent = "Nv. " + estado.nivel;
  nivelRelleno.style.width = porcentaje + "%";
  nivelXp.textContent = estado.xp + " / " + necesaria + " XP";

  if (barraNivel) {
    barraNivel.setAttribute("aria-valuenow", Math.round(porcentaje));
    barraNivel.setAttribute(
      "aria-valuetext",
      estado.xp + " de " + necesaria + " puntos de experiencia"
    );
  }

  // El tamaño crece con el nivel (con un máximo razonable)
  document.documentElement.style.setProperty(
    "--escala-nivel",
    escalaDeNivel(estado.nivel).toFixed(2)
  );
}

function renderHud() {
  const valores = {
    hambre: Math.round(estado.hambre),
    felicidad: Math.round(estado.felicidad),
    energia: Math.round(estado.energia),
  };

  for (const clave of Object.keys(valores)) {
    const valor = valores[clave];
    const encendidos = Math.round(valor / (100 / MAX_SEGMENTOS));

    [...segmentos[clave].children].forEach((segmento, i) => {
      segmento.classList.toggle("on", i < encendidos);
    });

    numeros[clave].textContent = valor;
    segmentos[clave].setAttribute("aria-valuenow", valor);

    if (clave === "hambre") {
      medidores.hambre.classList.remove("medio", "alto");
      if (valor >= 70) medidores.hambre.classList.add("alto");
      else if (valor >= 40) medidores.hambre.classList.add("medio");
    }
  }
}

function renderMascota() {
  const animo = animoActual();
  const cara = parpadeando ? "parpadeo" : expresionTemporal || animo;
  const paleta = paletaDeEspecie(estado.especie);

  // El cuerpo se redibuja solo cuando cambia la especie
  if (cuerpoPintado !== estado.especie) {
    capas.cuerpo.replaceChildren(
      dibujarSprite(mapaCuerpo(estado.especie), PX, paleta)
    );
    cuerpoPintado = estado.especie;
    caraPintada = "";
  }

  // La cara se redibuja cuando cambia la expresión o la especie
  const claveCara = estado.especie + "|" + cara;
  if (claveCara !== caraPintada) {
    capas.cara.replaceChildren(
      dibujarSprite(mapaCara(cara, estado.especie), PX, paleta)
    );
    caraPintada = claveCara;
  }

  mascota.classList.remove("normal", "feliz", "triste", "hambrienta", "durmiendo");
  mascota.classList.add(animo);
  mascota.setAttribute(
    "aria-label",
    "Tu mascota " + estado.nombre + ", un " + especiePorId(estado.especie).nombre
  );

  escena.classList.toggle("noche", estado.durmiendo);
  escena.classList.toggle("con-lampara", Boolean(estado.habitacion.luz));

  renderAccesorios();
}

function renderAccesorios() {
  const puestos = {
    cabeza: estado.equipado.cabeza,
    cara: estado.equipado.cara,
    cuello: estado.equipado.cuello,
  };

  for (const ranura of Object.keys(puestos)) {
    const id = puestos[ranura];
    if (accesoriosPintados[ranura] === id) continue;
    accesoriosPintados[ranura] = id;

    const capa = ranura === "cara" ? capas.gafas : capas[ranura];

    if (!id) {
      capa.replaceChildren();
      continue;
    }

    const filas = mapaAccesorio(id);
    capa.replaceChildren(filas ? dibujarSprite(filas) : document.createTextNode(""));
  }
}

function renderDecoracion() {
  const firma = JSON.stringify(estado.habitacion);
  if (firma === firmaDecoracion) return;
  firmaDecoracion = firma;

  decoracion.replaceChildren();

  for (const ranura of Object.keys(estado.habitacion)) {
    const id = estado.habitacion[ranura];
    if (!id) continue;

    const nodo = document.createElement("div");
    nodo.className = "deco deco-" + id;
    nodo.dataset.ranura = ranura;
    nodo.innerHTML = PIEZAS_DECO[id] || "";

    // Lola es una mascota dibujada, no un mueble de CSS
    if (id === "lola") {
      nodo.appendChild(dibujarSprite(mapaLola(), 5, PALETA_LOLA));
      nodo.setAttribute("title", "Lola, tu compañera");
    }

    decoracion.appendChild(nodo);
  }
}

function render() {
  renderCabecera();
  renderNivel();
  renderHud();
  renderMascota();
  renderDecoracion();
}

/* ------------------------------------------------------------
   6. PERSONALIDAD: sus frases
   ------------------------------------------------------------ */

const FRASES = {
  comer: [
    "¡Ñam ñam! 🍓",
    "¡Qué rico! ¿Hay más? 😋",
    "Gracias, estaba delicioso 💕",
    "Mmm... sabe a cariño 🥰",
    "¡Comida! ¡Mi palabra favorita! 🍰",
  ],
  llena: [
    "¡Estoy llena, gracias! 🥰",
    "No puedo con otra miga más 😅",
    "Mi barriguita dice que pare 🍙",
  ],
  mimo: [
    "¡Me encantan los mimos! 💗",
    "Purrr... sigue, sigue 🥰",
    "¡Qué a gustito! ✨",
    "Detrás de la oreja, porfa 💕",
    "Se me cierran los ojos de gusto 😊",
  ],
  jugar: [
    "¡Qué divertido! 🎾",
    "¡Otra vez, otra vez! 🥳",
    "¡Corre, corre! 💨",
    "¡Atrapa la pelota! 🐾",
  ],
  cansada: [
    "Estoy muy cansada... 😪",
    "Uf, necesito una siestita 💤",
    "Ahora mismo no puedo ni saltar 🥱",
  ],
  cosquillas: [
    "¡Jaja, cosquillas! 🤭",
    "¡No, no, mi barriguita no! 😆",
    "¡Para, para, que me muero de risa! 🤣",
    "¡Otra vez las cosquillas! 🙈",
  ],
  saludo: [
    "¡Hola! Soy {nombre} 🐾",
    "¡Qué alegría verte! 💕",
    "¡Has vuelto! Te estaba esperando 🥰",
  ],
};

const FRASES_LOLA = [
  "Lola te da la patita 🧸",
  "Lola se pone a bailar un poquito 🎶",
  "Lola te trae su corazón de peluche 💛",
  "Lola dice que hoy es un buen día para abrazos 🫂",
];

const CHARLAS = {
  hambrienta: [
    "¿Tienes algo rico? 🍓",
    "Mi barriguita hace ruido...",
    "Soñé con un pastel gigante 🍰",
  ],
  triste: [
    "¿Jugamos un ratito? 🥺",
    "Extraño los mimos...",
    "¿Me haces cariñitos? 💗",
  ],
  feliz: [
    "¡Qué día tan bonito! ☀️",
    "¡Te quiero mucho! 💕",
    "¡Soy muy feliz! ✨",
    "Hoy todo me parece divertido 🐾",
  ],
  normal: [
    "¿Qué hacemos ahora? ✨",
    "Me gusta esta habitación 🏠",
    "Estaba pensando en comida... 🍪",
    "¿Sabes que eres mi persona favorita? 💛",
  ],
  durmiendo: ["Zzz... 😴", "Zzz... cinco minutitos más 💤"],
};

function reaccionCompra(objeto) {
  if (objeto.categoria === "especial") {
    return elegirDistinto([
      "¡Lola! ¡Ha venido a vivir con nosotras! 🧸💛",
      "Ahora somos dos... ¡qué ilusión! 🥳",
      "Lola dice hola con la patita 🐾",
    ]);
  }

  if (objeto.categoria === "juguetes") {
    return elegirDistinto([
      "¡Un juguete nuevo! ¿Jugamos ahora? 🥳",
      "¡" + objeto.nombre + "! Prometo cuidarlo mucho 💛",
      "Huele a juguete nuevo 🐾",
    ]);
  }

  if (objeto.categoria === "accesorios") {
    return elegirDistinto([
      "¿Me queda bien? Dime que sí 💅",
      "¡Me veo guapísima con esto! ✨",
      "Ahora sí que estoy elegante 🎀",
    ]);
  }

  return elegirDistinto([
    "¡La habitación está quedando preciosa! 🏠",
    "¡Qué acogedor! Me dan ganas de quedarme aquí 💛",
    "¡" + objeto.nombre + "! Justo lo que quería 🥰",
  ]);
}

function reaccionAccesorio(objeto) {
  const frases = {
    lazo: ["¿Me queda bien el lazo? 🎀", "¡Soy una señorita elegante! 💅"],
    gorro: ["Este gorro es calentito... 💤", "¿Me lo dejo para dormir? 🧢"],
    gafas: ["Con estas gafas parezco misteriosa 🕶️", "Nadie sabe quién soy 😎"],
    bufanda: ["¡Qué abrigo tan rico! 🧣", "Huele a menta fresquita 🌿"],
    corona: ["¡Hoy mando yo en la habitación! 👑", "Una reina necesita su trono 🛋️"],
    collar: ["¡Suena la campanita! 🍀", "Este collar me trae suerte ✨"],
  };
  return elegirDistinto(frases[objeto.id] || ["¡Me encanta! ✨"]);
}

function reaccionDecoracion(objeto) {
  const frases = {
    alfombra: ["¡Pisar aquí es como pisar nubes! ☁️"],
    corazon: ["¡Una alfombra con corazón! Qué bonita 💗"],
    cuadro: ["Ese cuadro me recuerda al jardín 🌼"],
    guirnalda: ["¡Parece que hoy es fiesta! 🎏"],
    poster: ["La luna de la pared me da sueños bonitos 🌙"],
    reloj: ["Tic-tac, tic-tac... ¡me hipnotiza! 🕰️"],
    planta: ["Voy a cuidar mucho esta plantita 🪴"],
    cactus: ["El cactus parece enfadado, pero es buenísimo 🌵"],
    estanteria: ["¡Cuántos cuentos! ¿Me lees uno? 📚"],
    cama: ["¡Mi camita! Voy a dormir de maravilla 🛏️"],
    sofa: ["Este sillón pide una siesta ya 🛋️"],
    mesita: ["¿Hay té para dos? 🫖"],
    lampara: ["Esta luz es tan cálida... 🏮"],
    farolillo: ["¡Cuántos colores! Parece una fiesta 🪔"],
    pelota: ["¡Mi pelota! ¿La tiras? 🧶"],
    raton: ["¡El ratoncito! ¡Mío, mío! 🐭"],
    cascabel: ["¡Suena genial! 🔔"],
    patito: ["¡El patito hace cuac! 🦆"],
    lola: ["Lola es mi mejor amiga 🧸"],
  };
  return elegirDistinto(frases[objeto.id] || ["¡Qué bonito queda! ✨"]);
}

/* ------------------------------------------------------------
   7. MONEDAS Y MISIONES
   ------------------------------------------------------------ */

// Etiqueta corta de ánimo para la cabecera
function etiquetaAnimo() {
  if (estado.durmiendo) return "😴 dormilona";
  if (estado.hambre >= 72) return "🍓 hambrienta";
  if (estado.felicidad <= 25) return "🥺 tristona";
  if (estado.variedad.combo >= 3) return "✨ en racha";
  if (estado.felicidad >= 75 && estado.hambre < 45 && estado.energia > 40) {
    return "😊 radiante";
  }
  return "🙂 tranquila";
}

/* Variar de acción da un pequeño impulso.
   Si repites la misma acción, el combo baja; si cambias, sube.
   A partir de 3 el ánimo mejora y desde 4 cae una moneda extra. */
function registrarVariedad(accion) {
  const variedad = estado.variedad;
  if (!variedad) return 0;

  if (variedad.ultima === accion) {
    variedad.combo = Math.max(0, variedad.combo - 1);
  } else {
    variedad.combo = Math.min(6, variedad.combo + 1);
  }
  variedad.ultima = accion;

  if (variedad.combo >= 3) {
    estado.felicidad = limitar(estado.felicidad + 2);
  }
  if (variedad.combo >= 4) {
    ganarMonedas(1);
  }

  return variedad.combo;
}

/* Suma experiencia y sube de nivel si llega.
   Cada nivel cuesta más que el anterior. */
function ganarXp(cantidad) {
  const xp = Math.max(0, Math.floor(numeroSeguro(cantidad, 0)));
  if (xp <= 0) return 0;

  estado.xp += xp;
  let subidas = 0;

  while (estado.xp >= xpNecesaria(estado.nivel)) {
    estado.xp -= xpNecesaria(estado.nivel);
    estado.nivel++;
    subidas++;
  }

  if (subidas > 0) celebrarNivel(subidas);
  return subidas;
}

function celebrarNivel(subidas) {
  animarMascota("crecer");
  lanzarParticulas("⭐", 10);
  avisar(
    subidas > 1
      ? "¡" + subidas + " niveles de golpe! Nivel " + estado.nivel + " ✨"
      : "¡Nivel " + estado.nivel + "! " + estado.nombre + " ha crecido ✨"
  );
  decir(
    elegirDistinto([
      "¡Me he hecho más grande! Nivel " + estado.nivel + " ⭐",
      "¡Mira cuánto he crecido! 🌟",
      "¡Subir de nivel sienta genial! Nivel " + estado.nivel + " 💛",
    ]),
    3600
  );
  renderNivel();
}

function progresoMision(id, cantidad = 1) {
  const actual = numeroSeguro(estado.misiones.progreso[id], 0);
  estado.misiones.progreso[id] = actual + cantidad;
}

function hayMisionesListas() {
  return misionesDeHoy().some((mision, indice) => {
    const progreso = numeroSeguro(estado.misiones.progreso[mision.id], 0);
    return progreso >= mision.meta && !estado.misiones.reclamadas.includes(indice);
  });
}

/* Da monedas respetando el tope diario. Devuelve cuántas dio. */
function ganarMonedas(cantidad) {
  const disponible = Math.max(0, CAP_MONEDAS_DIA - estado.economia.ganadasHoy);
  const ganadas = Math.min(cantidad, disponible);
  if (ganadas <= 0) return 0;

  estado.monedas += ganadas;
  estado.economia.ganadasHoy += ganadas;
  progresoMision("monedas", ganadas);
  mostrarSumaMonedas(ganadas);
  return ganadas;
}

/* ------------------------------------------------------------
   8. ACCIONES DEL JUGADOR
   ------------------------------------------------------------ */

function avisarSiDuerme() {
  if (estado.durmiendo) {
    decir(elegir(["Shhh... está durmiendo 😴", "Zzz... vuelve en un ratito 💤"]), 2200);
    return true;
  }
  return false;
}

function alimentar() {
  if (avisarSiDuerme()) return;

  if (estado.hambre <= 4) {
    decir(elegirDistinto(FRASES.llena), 2600);
    return;
  }

  estado.hambre = limitar(estado.hambre - 26);
  estado.felicidad = limitar(estado.felicidad + 6);
  estado.energia = limitar(estado.energia + 3);

  registrarVariedad("comer");
  ganarXp(6);
  progresoMision("alimentar");
  ganarMonedas(2);

  mostrarExpresion("comiendo", 1100);
  decir(elegirDistinto(FRASES.comer));
  lanzarParticulas(elegir(["🍓", "🍰", "🍪", "🍙"]), 6);
  animarMascota("saltar");

  render();
  guardar();
}

function acariciar() {
  if (avisarSiDuerme()) return;

  estado.felicidad = limitar(estado.felicidad + 14);
  estado.energia = limitar(estado.energia + 2);

  registrarVariedad("mimo");
  ganarXp(5);
  progresoMision("mimar");
  ganarMonedas(1);

  mostrarExpresion("mimo", 1200);
  decir(elegirDistinto(FRASES.mimo));
  lanzarParticulas("💗", 7);

  render();
  guardar();
}

/* Varios toques seguidos: cosquillas (una reacción rapidita) */
function cosquillas() {
  estado.felicidad = limitar(estado.felicidad + 10);
  ganarXp(2);

  mostrarExpresion("mimo", 1400);
  decir(elegirDistinto(FRASES.cosquillas), 2600);
  lanzarParticulas("🤭", 6);
  animarMascota("saltar");

  render();
  guardar();
}

function jugar() {
  if (avisarSiDuerme()) return;

  const juguete = estado.habitacion.juguete
    ? objetoPorId(estado.habitacion.juguete)
    : null;

  let felicidadExtra = 0;
  let ahorroEnergia = 0;
  let icono = "🎾";

  if (juguete && juguete.id === "pelota") {
    felicidadExtra = 6;
    icono = "🧶";
  } else if (juguete && juguete.id === "raton") {
    felicidadExtra = 12;
    icono = "🐭";
  } else if (juguete && juguete.id === "cascabel") {
    ahorroEnergia = 6;
    icono = "🔔";
  } else if (juguete && juguete.id === "patito") {
    felicidadExtra = 4;
    icono = "🦆";
  }

  const coste = 18 - ahorroEnergia;

  if (estado.energia < coste + 4) {
    decir(elegirDistinto(FRASES.cansada), 3000);
    lanzarParticulas("💤", 3);
    return;
  }

  estado.felicidad = limitar(estado.felicidad + 22 + felicidadExtra);
  estado.energia = limitar(estado.energia - coste);
  estado.hambre = limitar(estado.hambre + 12);

  registrarVariedad("jugar");
  ganarXp(8);
  progresoMision("jugar");
  ganarMonedas(2);

  const frases = juguete
    ? [
        "¡" + juguete.nombre + "! ¡Mi favorito! 🥳",
        "¡Mira cómo salto con mi " + juguete.nombre + "! ✨",
        "¡Otra ronda con el " + juguete.nombre + "! 🐾",
      ]
    : FRASES.jugar;

  decir(elegirDistinto(frases));
  lanzarParticulas(icono, 8);
  animarMascota("saltar");

  render();
  guardar();
}

/* Si duerme, tocarla la despierta. Si está despierta, cada toque
   son mimos. Si le das varios seguidos, le salen cosquillas. */
let toquesSeguidos = 0;
let temporizadorToques = null;

function tocarMascota() {
  if (estado.durmiendo) {
    toquesSeguidos = 0;
    despertarConUnToque();
    return;
  }

  toquesSeguidos++;
  clearTimeout(temporizadorToques);
  temporizadorToques = setTimeout(() => {
    toquesSeguidos = 0;
  }, 1500);

  if (toquesSeguidos >= 4) {
    toquesSeguidos = 0;
    cosquillas();
    return;
  }

  acariciar();
}

/* Lola reacciona cuando la tocas (es una compañera, no un mueble) */
function reaccionLola() {
  const nodo = decoracion.querySelector(".deco-lola");
  if (nodo) {
    nodo.classList.remove("saluda");
    void nodo.offsetWidth;
    nodo.classList.add("saluda");
  }

  if (estado.durmiendo) {
    decir("Shhh... Lola cuida el sueño 😴", 2600);
    return;
  }

  estado.felicidad = limitar(estado.felicidad + 3);
  decir(elegirDistinto(FRASES_LOLA), 2800);
  lanzarParticulas("🧸", 3, 76);

  render();
  guardar();
}

/* Despertarla con un toque cuando está dormida */
function despertarConUnToque() {
  if (!estado.durmiendo) return;

  estado.durmiendo = false;
  estado.energia = Math.max(estado.energia, 25);
  decir(elegir(["¿Mmm? ¡Holaaa! 😳", "Me quedé frita... ¿qué me perdí? 🥱"]), 2800);

  render();
  guardar();
}

/* Habla sola de vez en cuando, según lo que tiene en casa */
function charlaEspontanea() {
  if (panelAbierto || burbuja.classList.contains("visible")) return;

  const opciones = [...(CHARLAS[animoActual()] || CHARLAS.normal)];

  if (estado.habitacion.cama) opciones.push("Mi camita me llama... 🛏️");
  if (estado.habitacion.estanteria) opciones.push("Estaba leyendo un cuento de dragones 📚");
  if (estado.habitacion.planta) opciones.push("¿La plantita tendrá sed? 🪴");
  if (estado.habitacion.luz) opciones.push("Qué luz tan calentita 🏮");
  if (estado.habitacion.juguete) opciones.push("¿Jugamos con mi juguete? 🥺");
  if (estado.habitacion.lola) opciones.push("Lola y yo estamos jugando a las tiendas 🧸");
  if (estado.equipado.gafas) opciones.push("Nadie reconoce a una estrella con gafas 😎");
  if (estado.equipado.bufanda) opciones.push("Con esta bufanda no hay frío que valga 🧣");
  if (estado.equipado.corona) opciones.push("Hoy me siento realeza 👑");

  decir(elegirDistinto(opciones), 2800);
}

/* Parpadea cada pocos segundos */
function programarParpadeo() {
  const espera = 3200 + Math.random() * 4200;

  setTimeout(() => {
    if (!estado.durmiendo) {
      parpadeando = true;
      renderMascota();

      setTimeout(() => {
        parpadeando = false;
        renderMascota();
        programarParpadeo();
      }, 130);
    } else {
      programarParpadeo();
    }
  }, espera);
}

/* ------------------------------------------------------------
   9. NOMBRE PERSONALIZABLE
   ------------------------------------------------------------ */

function mostrarFormNombre(mostrar) {
  formNombre.classList.toggle("oculto", !mostrar);
  if (mostrar) {
    entradaNombre.value = estado.nombre;
    entradaNombre.focus();
    entradaNombre.select();
  }
}

function guardarNombre(evento) {
  if (evento) evento.preventDefault();

  const escrito = entradaNombre.value.trim().slice(0, 14);

  if (!escrito) {
    entradaNombre.value = estado.nombre;
    decir("Necesito un nombre 🥺", 2400);
    return;
  }

  estado.nombre = escrito.charAt(0).toUpperCase() + escrito.slice(1);
  mostrarFormNombre(false);

  render();
  guardar();

  decir("¡Me encanta llamarme " + estado.nombre + "! 💕", 3200);
  lanzarParticulas("💫", 5);
}

/* ------------------------------------------------------------
   10. TIENDA
   ------------------------------------------------------------ */

function estaPuesto(objeto) {
  if (objeto.categoria === "accesorios") {
    return estado.equipado[objeto.ranura] === objeto.id;
  }
  return estado.habitacion[objeto.ranura] === objeto.id;
}

function colocarOEquipar(objeto) {
  if (objeto.categoria === "accesorios") {
    estado.equipado[objeto.ranura] = objeto.id;
    return;
  }

  estado.habitacion[objeto.ranura] = objeto.id;

  if (objeto.categoria === "decoracion") {
    progresoMision("decorar");
  }
}

function comprar(id) {
  const objeto = objetoPorId(id);
  if (!objeto || estado.inventario.includes(id)) return;

  if (estado.monedas < objeto.precio) {
    decir(
      elegirDistinto([
        "No me alcanza... ¿seguimos jugando? 🥺",
        "Tendré que ahorrar un poquito más 🪙",
      ]),
      2800
    );
    animarMascota("no");
    avisar("Te faltan " + (objeto.precio - estado.monedas) + " monedas");
    return;
  }

  estado.monedas -= objeto.precio;
  estado.inventario.push(id);

  progresoMision("comprar");
  ganarXp(10);
  colocarOEquipar(objeto);

  decir(reaccionCompra(objeto));
  avisar("¡" + objeto.nombre + " es tuyo! 🎉");
  lanzarParticulas("✨", 7);

  render();
  renderPaneles();
  guardar();
}

function alternarObjeto(id) {
  const objeto = objetoPorId(id);
  if (!objeto || !estado.inventario.includes(id)) return;

  if (objeto.categoria === "accesorios") {
    const puesto = estado.equipado[objeto.ranura] === id;
    estado.equipado[objeto.ranura] = puesto ? null : id;

    decir(puesto ? "Me lo quito un ratito 🧺" : reaccionAccesorio(objeto), 2800);
    lanzarParticulas(puesto ? "🧺" : "✨", 5);
  } else {
    const puesto = estado.habitacion[objeto.ranura] === id;
    estado.habitacion[objeto.ranura] = puesto ? null : id;

    if (!puesto && objeto.categoria === "decoracion") {
      progresoMision("decorar");
    }

    decir(puesto ? "Mejor lo guardo, ¿no? 📦" : reaccionDecoracion(objeto), 2800);
    lanzarParticulas(puesto ? "📦" : "✨", 6);
  }

  render();
  renderPaneles();
  guardar();
}

function tarjetaTienda(objeto) {
  const esTuyo = estado.inventario.includes(objeto.id);
  const puesto = estaPuesto(objeto);

  const tarjeta = document.createElement("article");
  tarjeta.className = "objeto";
  tarjeta.innerHTML =
    '<div class="objeto-icono" aria-hidden="true">' +
    objeto.emoji +
    "</div>" +
    '<div class="objeto-cuerpo">' +
    '<h3></h3><p></p><p class="bonus"></p>' +
    "</div>" +
    '<div class="objeto-pie"></div>';

  tarjeta.querySelector("h3").textContent = objeto.nombre;
  tarjeta.querySelector("p").textContent = objeto.desc;
  tarjeta.querySelector(".bonus").textContent = objeto.bonus;

  const pie = tarjeta.querySelector(".objeto-pie");

  const etiqueta = document.createElement("span");
  etiqueta.className = "precio";

  const boton = document.createElement("button");
  boton.className = "btn-comprar";

  if (puesto) {
    etiqueta.textContent = "✓ En uso";
    boton.textContent = "Puesto";
    boton.disabled = true;
    boton.classList.add("comprado");
  } else if (esTuyo) {
    etiqueta.textContent = "Tuyo";
    boton.textContent = "Poner";
    boton.addEventListener("click", () => alternarObjeto(objeto.id));
  } else {
    etiqueta.textContent = "🪙 " + objeto.precio;
    boton.textContent = "Comprar";
    boton.disabled = estado.monedas < objeto.precio;
    boton.addEventListener("click", () => comprar(objeto.id));
  }

  pie.append(etiqueta, boton);
  return tarjeta;
}

function renderTienda() {
  saldoTienda.textContent = estado.monedas;
  listaTienda.replaceChildren();

  for (const objeto of objetosDeCategoria(categoriaTienda)) {
    listaTienda.appendChild(tarjetaTienda(objeto));
  }
}

/* ------------------------------------------------------------
   11. MISIONES
   ------------------------------------------------------------ */

function renderMisiones() {
  listaMisiones.replaceChildren();

  misionesDeHoy().forEach((mision, indice) => {
    const progreso = numeroSeguro(estado.misiones.progreso[mision.id], 0);
    const cumplida = progreso >= mision.meta;
    const reclamada = estado.misiones.reclamadas.includes(indice);

    const tarjeta = document.createElement("article");
    tarjeta.className = "mision" + (cumplida && !reclamada ? " lista" : "");

    const emoji = document.createElement("span");
    emoji.className = "mision-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = mision.emoji;

    const cuerpo = document.createElement("div");
    const titulo = document.createElement("h3");
    titulo.textContent = mision.texto;

    const barra = document.createElement("div");
    barra.className = "mision-barra";
    const pasos = 10;
    const encendidos = Math.round(Math.min(1, progreso / mision.meta) * pasos);
    for (let i = 0; i < pasos; i++) {
      const trozo = document.createElement("i");
      if (i < encendidos) trozo.className = "on";
      barra.appendChild(trozo);
    }

    const meta = document.createElement("span");
    meta.className = "mision-meta";
    meta.textContent =
      Math.min(progreso, mision.meta) +
      " de " +
      mision.meta +
      " · +" +
      mision.premio +
      " 🪙 · +" +
      mision.xp +
      " XP";

    cuerpo.append(titulo, barra, meta);

    const boton = document.createElement("button");
    boton.className = "btn-comprar";

    if (reclamada) {
      boton.textContent = "Cobrada";
      boton.disabled = true;
      boton.classList.add("comprado");
    } else if (!cumplida) {
      boton.textContent = "En curso";
      boton.disabled = true;
    } else {
      boton.textContent = "Reclamar";
      boton.addEventListener("click", () => reclamarMision(indice));
    }

    tarjeta.append(emoji, cuerpo, boton);
    listaMisiones.appendChild(tarjeta);
  });
}

function reclamarMision(indice) {
  const mision = misionesDeHoy()[indice];
  if (!mision) return;

  const progreso = numeroSeguro(estado.misiones.progreso[mision.id], 0);
  const yaCobrada = estado.misiones.reclamadas.includes(indice);

  if (progreso < mision.meta || yaCobrada) return;

  estado.misiones.reclamadas.push(indice);
  estado.monedas += mision.premio;
  ganarXp(mision.xp);

  mostrarSumaMonedas(mision.premio);
  avisar("¡Misión completada! +" + mision.premio + " 🪙 y +" + mision.xp + " XP");
  decir(elegirDistinto(["¡Lo logramos! 🎉", "¡Qué bien sienta cumplir misiones! 📜"]), 2800);
  lanzarParticulas("🪙", 6);

  render();
  renderPaneles();
  guardar();
}

/* ------------------------------------------------------------
   12. ARMARIO
   ------------------------------------------------------------ */

function renderArmario() {
  listaArmario.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "nota";
  intro.textContent =
    "Toca un objeto para ponerlo o quitarlo. Solo una cosa por sitio.";
  listaArmario.appendChild(intro);

  if (estado.inventario.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "vacio";
    vacio.textContent = "Todavía no tienes nada. Pásate por la tienda 🛍️";
    listaArmario.appendChild(vacio);
    return;
  }

  const secciones = [
    { titulo: "Accesorios", categoria: "accesorios" },
    { titulo: "Decoración", categoria: "decoracion" },
    { titulo: "Juguetes", categoria: "juguetes" },
    { titulo: "Compañía", categoria: "especial" },
  ];

  for (const seccion of secciones) {
    const objetos = estado.inventario
      .map((id) => objetoPorId(id))
      .filter((objeto) => objeto && objeto.categoria === seccion.categoria);

    const grupo = document.createElement("div");
    grupo.className = "grupo";

    const titulo = document.createElement("h3");
    titulo.textContent = seccion.titulo + " · " + objetos.length;

    const chips = document.createElement("div");
    chips.className = "chips";

    if (objetos.length === 0) {
      const vacio = document.createElement("p");
      vacio.className = "vacio";
      vacio.textContent = "Nada por aquí todavía.";
      chips.appendChild(vacio);
    }

    for (const objeto of objetos) {
      const puesto = estaPuesto(objeto);

      const chip = document.createElement("button");
      chip.className = "chip" + (puesto ? " activo" : "");
      chip.innerHTML =
        '<span aria-hidden="true">' +
        objeto.emoji +
        "</span><span></span><small></small>";
      chip.querySelectorAll("span")[1].textContent = objeto.nombre;
      chip.querySelector("small").textContent = puesto ? "✓ puesto" : "poner";
      chip.addEventListener("click", () => alternarObjeto(objeto.id));

      chips.appendChild(chip);
    }

    grupo.append(titulo, chips);
    listaArmario.appendChild(grupo);
  }
}

/* ------------------------------------------------------------
   13. ELEGIR MASCOTA
   ------------------------------------------------------------ */

function renderEspecies() {
  listaEspecies.replaceChildren();

  for (const especie of ESPECIES) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "especie" + (especie.id === estado.especie ? " activa" : "");
    boton.setAttribute("aria-label", "Elegir " + especie.nombre);
    boton.title = especie.desc;

    const dibujo = document.createElement("span");
    dibujo.className = "especie-dibujo";
    dibujo.appendChild(vistaMascota(especie.id, "feliz", 3));

    const nombre = document.createElement("strong");
    nombre.textContent = especie.emoji + " " + especie.nombre;

    const sugerido = document.createElement("small");
    sugerido.textContent = "Se llamará " + especie.nombreSugerido;

    boton.append(dibujo, nombre, sugerido);
    boton.addEventListener("click", () => adoptarEspecie(especie.id));
    listaEspecies.appendChild(boton);
  }
}

function adoptarEspecie(id) {
  const especie = especiePorId(id);
  if (!especie) return;

  const hayAlgo =
    hayProgreso ||
    estado.inventario.length > 0 ||
    estado.nivel > 1 ||
    estado.monedas !== MONEDAS_INICIALES;

  if (hayAlgo) {
    const confirmado = confirm(
      "¿Empezar una partida nueva con " + especie.nombre + "?\n\n" +
        "Se perderá el progreso de " + estado.nombre +
        " (monedas, nivel, misiones y objetos)."
    );
    if (!confirmado) return;
  }

  estado = estadoInicial();
  estado.especie = especie.id;
  estado.nombre = especie.nombreSugerido;
  hayProgreso = true;
  partidaLista = true;

  reiniciarCaches();
  ultimoTic = Date.now();
  entradaNombre.value = estado.nombre;

  cerrarPaneles();
  render();

  // Dejamos abierto el formulario para ponerle el nombre que quieras
  mostrarFormNombre(true);
  decir(
    "¡Hola! Me llamo " + estado.nombre + " 🐾",
    4200
  );
  avisar("Mascota elegida: " + especie.nombre + " " + especie.emoji);
  guardar();
}

/* ------------------------------------------------------------
   14. ABRIR Y CERRAR PANELES
   ------------------------------------------------------------ */

function renderPaneles() {
  if (panelAbierto === "tienda") renderTienda();
  else if (panelAbierto === "misiones") renderMisiones();
  else if (panelAbierto === "armario") renderArmario();
  else if (panelAbierto === "especie") renderEspecies();
}

function abrirPanel(nombre) {
  if (panelAbierto === nombre) {
    cerrarPaneles();
    return;
  }

  panelAbierto = nombre;

  for (const clave of Object.keys(hojas)) {
    const hoja = hojas[clave];
    const abierta = clave === nombre;
    hoja.classList.toggle("abierta", abierta);
    hoja.setAttribute("aria-hidden", String(!abierta));
  }

  telon.classList.add("visible");
  renderPaneles();

  const cerrar = hojas[nombre].querySelector(".cerrar");
  if (cerrar) cerrar.focus({ preventScroll: true });
}

function cerrarPaneles() {
  panelAbierto = null;

  for (const hoja of Object.values(hojas)) {
    hoja.classList.remove("abierta");
    hoja.setAttribute("aria-hidden", "true");
  }

  telon.classList.remove("visible");
}

/* ------------------------------------------------------------
   15. EL RELOJ DEL JUEGO
   ------------------------------------------------------------ */

function tic() {
  const ahora = Date.now();
  const segundos = Math.min((ahora - ultimoTic) / 1000, 300);
  ultimoTic = ahora;

  asegurarDia();

  if (estado.durmiendo) {
    const enCama = estado.habitacion.mueble === "cama";
    estado.energia = limitar(
      estado.energia + (enCama ? 0.9 : RITMO_DORMIDA.energia) * segundos
    );
    estado.hambre = limitar(estado.hambre + RITMO_DORMIDA.hambre * segundos);
    estado.felicidad = limitar(estado.felicidad - 0.01 * segundos);

    // De vez en cuando suelta un "Zzz"
    if (Math.random() < 0.06) lanzarParticulas("💤", 1);

    if (estado.energia >= 70) {
      estado.durmiendo = false;
      decir(elegir(["¡Ya descansé! ⭐", "¡Buenos días! He dormido genial ☀️"]), 3200);
      lanzarParticulas("✨", 4);
    }
  } else {
    // Cuanta más decoración, más despacio baja la felicidad.
    // Lola también ayuda: es una compañera tranquilita.
    const acogimiento = contarAcogimiento();
    const alivioBase = Math.max(0.6, 1 - acogimiento * 0.05);
    const alivio = alivioBase * (estado.habitacion.lola ? 0.9 : 1);

    estado.hambre = limitar(estado.hambre + RITMO.hambre * segundos);
    estado.felicidad = limitar(estado.felicidad - RITMO.felicidad * alivio * segundos);
    estado.energia = limitar(estado.energia - RITMO.energia * segundos);

    // El combo de variedad se enfría poco a poco si no haces nada
    ticsVariedad++;
    if (ticsVariedad >= 45) {
      ticsVariedad = 0;
      if (estado.variedad.combo > 0) estado.variedad.combo--;
    }

    // Si va en racha, suelta estrellitas de vez en cuando
    if (estado.variedad.combo >= 3 && Math.random() < 0.03) {
      lanzarParticulas("✨", 1);
    }

    if (estado.energia <= 10) {
      estado.durmiendo = true;
      avisar("Se ha quedado dormida 😴");
    }
  }

  render();

  ticsDesdeGuardado++;
  if (ticsDesdeGuardado >= 5) {
    guardar();
    ticsDesdeGuardado = 0;
  }
}

/* ------------------------------------------------------------
   16. EMPEZAR DE NUEVO
   ------------------------------------------------------------ */

function reiniciarCaches() {
  firmaDecoracion = "";
  caraPintada = "";
  cuerpoPintado = "";

  for (const clave of Object.keys(accesoriosPintados)) {
    delete accesoriosPintados[clave];
  }
}

function reiniciar() {
  const confirmado = confirm(
    "¿Seguro que quieres empezar de cero? Se perderá todo el progreso de " +
      estado.nombre +
      ", incluidos los objetos y las monedas."
  );
  if (!confirmado) return;

  // Mantenemos la especie elegida, pero todo lo demás vuelve a empezar
  const especie = estado.especie;
  estado = estadoInicial();
  estado.especie = especie;
  estado.nombre = especiePorId(especie).nombreSugerido;
  hayProgreso = true;
  partidaLista = true;

  reiniciarCaches();
  ultimoTic = Date.now();

  entradaNombre.value = estado.nombre;
  mostrarFormNombre(false);
  cerrarPaneles();
  render();

  decir("¡Hola de nuevo! ¿Me pones un nombre? 💕", 4000);
  guardar();
}

/* ------------------------------------------------------------
   17. ARRANCAR
   ------------------------------------------------------------ */

function crearSegmentos() {
  for (const clave of Object.keys(segmentos)) {
    segmentos[clave].replaceChildren();
    for (let i = 0; i < MAX_SEGMENTOS; i++) {
      segmentos[clave].appendChild(document.createElement("i"));
    }
  }
}

function iniciar() {
  // ¿Ya había una partida guardada? Se usa para el saludo y para
  // saber si hay que pedir confirmación al cambiar de mascota.
  hayProgreso = Boolean(localStorage.getItem(CLAVE_GUARDADO));
  partidaLista = hayProgreso;
  estado = cargar();

  const segundosFuera = (Date.now() - estado.ultimaVez) / 1000;

  crearSegmentos();
  entradaNombre.value = estado.nombre;

  render();
  renderPaneles();

  if (!hayProgreso) {
    // Primera vez: elegir mascota y luego ponerle nombre
    abrirPanel("especie");
    decir("¡Hola! ¿Quién quieres que sea tu mascota? 🐾", 5000);
  } else if (segundosFuera > 60) {
    decir("¡Volviste! Te extrañé 💕", 4000);
  } else {
    decir("¡Hola! Soy " + estado.nombre + " 🐾", 4000);
  }

  // --- Botones de cuidados ---
  elemento("btn-alimentar").addEventListener("click", alimentar);
  elemento("btn-acariciar").addEventListener("click", acariciar);
  elemento("btn-jugar").addEventListener("click", jugar);
  mascota.addEventListener("click", tocarMascota);

  // --- Paneles ---
  for (const boton of document.querySelectorAll("[data-panel]")) {
    boton.addEventListener("click", () => abrirPanel(boton.dataset.panel));
  }

  for (const boton of document.querySelectorAll("[data-cerrar]")) {
    boton.addEventListener("click", cerrarPaneles);
  }

  telon.addEventListener("click", cerrarPaneles);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && panelAbierto) cerrarPaneles();
  });

  // --- Pestañas de la tienda ---
  pestanasTienda.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-categoria]");
    if (!boton) return;

    categoriaTienda = boton.dataset.categoria;

    for (const otra of pestanasTienda.querySelectorAll("button")) {
      otra.classList.toggle("activa", otra === boton);
    }

    renderTienda();
  });

  // --- Nombre ---
  formNombre.addEventListener("submit", guardarNombre);
  botonEditarNombre.addEventListener("click", () => {
    const oculto = formNombre.classList.contains("oculto");
    mostrarFormNombre(oculto);
    if (oculto) decir("¿Cómo quieres llamarme? 🥺", 2600);
  });

  // --- Reiniciar y cambiar de mascota ---
  elemento("btn-reiniciar").addEventListener("click", reiniciar);
  elemento("btn-especie").addEventListener("click", () => abrirPanel("especie"));

  // --- Tocar los muebles, juguetes y a Lola ---
  decoracion.addEventListener("click", (evento) => {
    const nodo = evento.target.closest(".deco");
    if (!nodo) return;

    if (nodo.dataset.ranura === "lola") {
      reaccionLola();
      return;
    }

    if (estado.durmiendo) {
      decir("Zzz... 😴", 1600);
      return;
    }

    const objeto = objetoPorId(estado.habitacion[nodo.dataset.ranura]);
    if (!objeto) return;

    decir(reaccionDecoracion(objeto), 2800);
    lanzarParticulas(objeto.emoji, 3);
  });

  // --- Relojes ---
  ultimoTic = Date.now();
  setInterval(tic, 1000);
  setInterval(charlaEspontanea, 16000);
  setInterval(guardar, 5000);
  programarParpadeo();

  window.addEventListener("beforeunload", guardar);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tic();
  });
}

iniciar();




