"use strict";

/* ============================================================
   CATÁLOGO DEL JUEGO
   ------------------------------------------------------------
   Aquí solo hay DATOS: qué se puede comprar, cuánto cuesta y
   qué ranura ocupa. La lógica vive en script.js, así que para
   añadir un objeto nuevo casi solo tienes que copiar un bloque.

   Claves de cada objeto:
   - id:        nombre interno (no se repite)
   - nombre:    cómo se ve en la tienda
   - emoji:     icono de la tarjeta
   - precio:    monedas que cuesta
   - categoria: "juguetes" | "accesorios" | "decoracion" | "especial"
   - ranura:    dónde se coloca (una sola cosa por ranura)
   - desc:      texto de la tienda
   - bonus:     lo que aporta al juego

   Las ranuras posibles son:
   cabeza, cara, cuello (accesorios)
   alfombra, pared, planta, mueble, luz, juguete, lola (habitación)
   ============================================================ */

const CATALOGO = [
  /* ---------- JUGUETES (se colocan en la habitación) ---------- */
  {
    id: "pelota",
    nombre: "Pelota de lana",
    emoji: "🧶",
    precio: 30,
    categoria: "juguetes",
    ranura: "juguete",
    desc: "Rebota por toda la habitación.",
    bonus: "Jugar da +6 de felicidad",
  },
  {
    id: "raton",
    nombre: "Ratoncito de trapo",
    emoji: "🐭",
    precio: 55,
    categoria: "juguetes",
    ranura: "juguete",
    desc: "Su juguete favorito para perseguir.",
    bonus: "Jugar da +12 de felicidad",
  },
  {
    id: "cascabel",
    nombre: "Cascabel dorado",
    emoji: "🔔",
    precio: 80,
    categoria: "juguetes",
    ranura: "juguete",
    desc: "Suena cada vez que salta.",
    bonus: "Jugar gasta 6 de energía menos",
  },
  {
    id: "patito",
    nombre: "Patito de goma",
    emoji: "🦆",
    precio: 40,
    categoria: "juguetes",
    ranura: "juguete",
    desc: "Chillón, amarillo y muy valiente.",
    bonus: "Jugar da +4 de felicidad",
  },

  /* ---------- ACCESORIOS (se ponen sobre la mascota) ---------- */
  {
    id: "lazo",
    nombre: "Lazito de cuadros",
    emoji: "🎀",
    precio: 35,
    categoria: "accesorios",
    ranura: "cabeza",
    desc: "Un lazo diminuto sobre la oreja.",
    bonus: "La pone un poco presumida",
  },
  {
    id: "gorro",
    nombre: "Gorro de dormir",
    emoji: "🧢",
    precio: 50,
    categoria: "accesorios",
    ranura: "cabeza",
    desc: "Suave, calentito y con pompón.",
    bonus: "Duerme más a gustito",
  },
  {
    id: "corona",
    nombre: "Corona dorada",
    emoji: "👑",
    precio: 90,
    categoria: "accesorios",
    ranura: "cabeza",
    desc: "Para días de sentirse importante.",
    bonus: "Reina de la habitación",
  },
  {
    id: "gafas",
    nombre: "Gafas de sol",
    emoji: "🕶️",
    precio: 65,
    categoria: "accesorios",
    ranura: "cara",
    desc: "Para parecer interesante.",
    bonus: "Comenta cosas misteriosas",
  },
  {
    id: "bufanda",
    nombre: "Bufanda de menta",
    emoji: "🧣",
    precio: 45,
    categoria: "accesorios",
    ranura: "cuello",
    desc: "Tejida a mano, muy abrigada.",
    bonus: "Ideal para días frescos",
  },
  {
    id: "collar",
    nombre: "Collar de la suerte",
    emoji: "🍀",
    precio: 40,
    categoria: "accesorios",
    ranura: "cuello",
    desc: "Con una campanita que suena al andar.",
    bonus: "Atrae los días buenos",
  },

  /* ---------- DECORACIÓN (se coloca en la habitación) ---------- */
  {
    id: "alfombra",
    nombre: "Alfombra de nubes",
    emoji: "☁️",
    precio: 40,
    categoria: "decoracion",
    ranura: "alfombra",
    desc: "Esponjosa, como pisar una nube.",
    bonus: "La habitación es más acogedora",
  },
  {
    id: "corazon",
    nombre: "Alfombra de corazón",
    emoji: "💗",
    precio: 60,
    categoria: "decoracion",
    ranura: "alfombra",
    desc: "Para dar los buenos días con cariño.",
    bonus: "La habitación es más acogedora",
  },
  {
    id: "cuadro",
    nombre: "Cuadro de flores",
    emoji: "🌼",
    precio: 45,
    categoria: "decoracion",
    ranura: "pared",
    desc: "Pintado a mano con mucho cariño.",
    bonus: "Alegra cualquier pared",
  },
  {
    id: "guirnalda",
    nombre: "Guirnalda de banderines",
    emoji: "🎏",
    precio: 35,
    categoria: "decoracion",
    ranura: "pared",
    desc: "Banderines de colores para fiestas.",
    bonus: "Da un aire festivo",
  },
  {
    id: "poster",
    nombre: "Póster de luna",
    emoji: "🌙",
    precio: 55,
    categoria: "decoracion",
    ranura: "pared",
    desc: "Una noche entera en la pared.",
    bonus: "Ayuda a soñar despierta",
  },
  {
    id: "reloj",
    nombre: "Reloj de cuco",
    emoji: "🕰️",
    precio: 70,
    categoria: "decoracion",
    ranura: "pared",
    desc: "Hace tic-tac toda la tarde.",
    bonus: "Nunca se les escapa la hora",
  },
  {
    id: "planta",
    nombre: "Planta grande",
    emoji: "🪴",
    precio: 50,
    categoria: "decoracion",
    ranura: "planta",
    desc: "Necesita agua y buenas palabras.",
    bonus: "Aire fresco y hojas verdes",
  },
  {
    id: "cactus",
    nombre: "Cactus pequeñito",
    emoji: "🌵",
    precio: 45,
    categoria: "decoracion",
    ranura: "planta",
    desc: "Pincha un poquito, pero es un sol.",
    bonus: "Aire fresco sin esfuerzo",
  },
  {
    id: "estanteria",
    nombre: "Estantería de cuentos",
    emoji: "📚",
    precio: 75,
    categoria: "decoracion",
    ranura: "mueble",
    desc: "Llena de historias para leer juntas.",
    bonus: "Inventa cuentos por la noche",
  },
  {
    id: "cama",
    nombre: "Camita acogedora",
    emoji: "🛏️",
    precio: 95,
    categoria: "decoracion",
    ranura: "mueble",
    desc: "Manta, almohada y sueños bonitos.",
    bonus: "Recupera energía mucho más rápido",
  },
  {
    id: "sofa",
    nombre: "Sillón blandito",
    emoji: "🛋️",
    precio: 110,
    categoria: "decoracion",
    ranura: "mueble",
    desc: "Para mirar la ventana sin prisa.",
    bonus: "Invita a la siesta de tarde",
  },
  {
    id: "mesita",
    nombre: "Mesita de té",
    emoji: "🫖",
    precio: 80,
    categoria: "decoracion",
    ranura: "mueble",
    desc: "Con una tacita siempre lista.",
    bonus: "Meriendas tranquilas",
  },
  {
    id: "lampara",
    nombre: "Lámpara de papel",
    emoji: "🏮",
    precio: 60,
    categoria: "decoracion",
    ranura: "luz",
    desc: "Luz cálida para las tardes tranquilas.",
    bonus: "Da una luz de hogar",
  },
  {
    id: "farolillo",
    nombre: "Farolillo de colores",
    emoji: "🪔",
    precio: 65,
    categoria: "decoracion",
    ranura: "luz",
    desc: "Pequeño, brillante y muy alegre.",
    bonus: "Da una luz de hogar",
  },

  /* ---------- ESPECIAL (compañera) ---------- */
  {
    id: "lola",
    nombre: "Lola",
    emoji: "🧸",
    precio: 350,
    categoria: "especial",
    ranura: "lola",
    desc: "Una osita que viene a vivir contigo.",
    bonus: "Compañera de aventuras para siempre",
  },
];

/* ---------- MISIONES DIARIAS ----------
   Cada día el juego elige tres de esta lista.
   Cada misión da monedas y experiencia (xp). */
const MISIONES = [
  { id: "alimentar", texto: "Dale de comer", meta: 3, premio: 15, xp: 15, emoji: "🍓" },
  { id: "jugar", texto: "Juega con ella", meta: 2, premio: 20, xp: 20, emoji: "🎾" },
  { id: "mimar", texto: "Hazle mimos", meta: 5, premio: 15, xp: 15, emoji: "💗" },
  { id: "comprar", texto: "Compra algo en la tienda", meta: 1, premio: 25, xp: 25, emoji: "🛍️" },
  { id: "monedas", texto: "Gana monedas cuidándola", meta: 15, premio: 15, xp: 15, emoji: "🪙" },
  { id: "decorar", texto: "Coloca una decoración", meta: 1, premio: 20, xp: 20, emoji: "🪴" },
];

/* ---------- Funciones de búsqueda, usadas desde script.js ---------- */

function objetoPorId(id) {
  return CATALOGO.find((objeto) => objeto.id === id) || null;
}

function objetosDeCategoria(categoria) {
  return CATALOGO.filter((objeto) => objeto.categoria === categoria);
}

/* ============================================================
   ESPECIES DE MASCOTA
   ------------------------------------------------------------
   Cada especie cambia los colores y algunos rasgos del dibujo
   (orejas, bigotes, pico, rayas...). Todo se dibuja en
   graficos.js a partir de estos datos.

   - colores:   letras de la paleta que usa el dibujo
                f = pelo, s = sombra, l = luz, b = barriga,
                p = mejillas/orejas, x = manchas o rayas
   - rasgos:    lo que hace distinta a cada especie
   - nombreSugerido: nombre que propone el juego al adoptarla
   ============================================================ */

const ESPECIES = [
  {
    id: "perro",
    nombre: "Perro",
    emoji: "🐶",
    nombreSugerido: "Mochi",
    desc: "Alegre, leal y siempre con ganas de jugar.",
    colores: {
      f: "#ffd3e3", s: "#f4b3cd", l: "#ffe7f1",
      b: "#fff2f8", p: "#ff9dc0", x: "#f7a8c4",
    },
    rasgos: { orejas: "cortas", bigotes: false, rayas: false },
  },
  {
    id: "gato",
    nombre: "Gato",
    emoji: "🐱",
    nombreSugerido: "Misha",
    desc: "Dormilón, curioso y con bigotes elegantes.",
    colores: {
      f: "#e3d4ff", s: "#c9b6ff", l: "#f4edff",
      b: "#fff8ff", p: "#c39cff", x: "#b99cff",
    },
    rasgos: { orejas: "puntiagudas", bigotes: true, rayas: false },
  },
  {
    id: "conejo",
    nombre: "Conejo",
    emoji: "🐰",
    nombreSugerido: "Nube",
    desc: "Orejas largas y unos dientes muy simpáticos.",
    colores: {
      f: "#fff4f6", s: "#f0dbe2", l: "#ffffff",
      b: "#ffffff", p: "#ffc2d1", x: "#f7d6de",
    },
    rasgos: { orejas: "largas", bigotes: false, dientes: true },
  },
  {
    id: "raton",
    nombre: "Ratón",
    emoji: "🐭",
    nombreSugerido: "Pizca",
    desc: "Pequeñín, orejón y con una colita curiosa.",
    colores: {
      f: "#dcd6e6", s: "#c3bcd3", l: "#f0edf5",
      b: "#fffafd", p: "#f4a7c0", x: "#cfc6dd",
    },
    rasgos: { orejas: "redondas", bigotes: true, cola: true },
  },
  {
    id: "tigre",
    nombre: "Tigre",
    emoji: "🐯",
    nombreSugerido: "Mango",
    desc: "Rayas valientes y un corazón blandito.",
    colores: {
      f: "#ffc98a", s: "#f2a95e", l: "#ffe3bd",
      b: "#fff4e2", p: "#ff9d6e", x: "#d98a45",
    },
    rasgos: { orejas: "cortas", bigotes: true, rayas: true },
  },
  {
    id: "loro",
    nombre: "Loro",
    emoji: "🦜",
    nombreSugerido: "Kiwi",
    desc: "Plumas de colores, pico curioso y mucha charla.",
    colores: {
      f: "#a9e5b8", s: "#7fd39a", l: "#d6f7de",
      b: "#eafff0", p: "#ffc2d1", x: "#5fbf85",
    },
    rasgos: { orejas: "ninguna", pico: true, cresta: true },
  },
  {
    id: "salchicha",
    nombre: "Perro salchicha",
    emoji: "🌭",
    nombreSugerido: "Tofu",
    desc: "Cuerpo largo, orejas caídas y paso tranquilo.",
    colores: {
      f: "#e0b088", s: "#c99566", l: "#f4d6b8",
      b: "#fff2e4", p: "#e8a87c", x: "#b97a4e",
    },
    rasgos: { orejas: "caidas", bigotes: true, mancha: true, cuerpo: "largo" },
  },
];

function especiePorId(id) {
  return ESPECIES.find((especie) => especie.id === id) || ESPECIES[0];
}
