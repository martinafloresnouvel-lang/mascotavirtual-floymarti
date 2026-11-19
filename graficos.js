"use strict";

/* ============================================================
   GRÁFICOS PIXEL ART
   ------------------------------------------------------------
   Cada gráfico es una cuadrícula de letras:
     cada letra es un color de PALETA
     el punto "." es transparente
   Con eso dibujamos la mascota y sus accesorios sin imágenes.

   La especie (perro, gato, conejo...) cambia los colores y
   algunos rasgos: orejas, bigotes, pico, rayas, cola...
   Los datos de cada especie están en catalogo.js (ESPECIES).
   ============================================================ */

const PALETA = {
  o: "#6b4257", // contorno
  f: "#ffd3e3", // pelo
  s: "#f4b3cd", // sombra del pelo
  l: "#ffe7f1", // pelo muy claro (brillo y patitas)
  b: "#fff2f8", // barriga
  e: "#3d2a36", // ojos
  w: "#ffffff", // blanco
  p: "#ff9dc0", // mejillas / orejas
  m: "#b9678a", // boca
  n: "#ff8fb0", // rosa fuerte (lazo)
  r: "#ff6f8f", // rojo suave
  g: "#9ee6c9", // menta
  v: "#c9b6ff", // lila
  y: "#ffe08a", // amarillo
  d: "#4d3d6b", // oscuro (gafas)
  x: "#b9678a", // manchas y rayas
};

// Colores propios de Lola (la osita compañera)
const PALETA_LOLA = {
  o: "#6b4257",
  f: "#d9a066",
  s: "#c48a52",
  l: "#f0c9a0",
  b: "#fff2e2",
  p: "#f2a3b8",
  e: "#3d2a36",
  w: "#ffffff",
  m: "#8a5a3c",
  y: "#ffe08a",
};

// Tamaño de cada "píxel" de la mascota, en píxeles de pantalla
const PX = 7;

/* Paleta de una especie: parte de la paleta normal y cambia
   los colores del pelo por los de esa especie. */
function paletaDeEspecie(especieId) {
  const especie = especiePorId(especieId);
  return { ...PALETA, ...(especie.colores || {}) };
}

/* ------------------------------------------------------------
   Un lienzo pequeñito hecho de letras
   ------------------------------------------------------------ */
function crearLienzo(ancho, alto) {
  const filas = Array.from({ length: alto }, () => Array(ancho).fill("."));

  return {
    ancho,
    alto,
    filas,

    poner(x, y, color) {
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (xi >= 0 && yi >= 0 && xi < ancho && yi < alto) filas[yi][xi] = color;
    },

    caja(x, y, w, h, color) {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) this.poner(x + i, y + j, color);
      }
    },

    // Caja con contorno oscuro de 1 píxel
    cajaConBorde(x, y, w, h, color) {
      this.caja(x - 1, y - 1, w + 2, h + 2, "o");
      this.caja(x, y, w, h, color);
    },

    elipse(cx, cy, rx, ry, color) {
      for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.poner(x, y, color);
        }
      }
    },

    // Pone contorno oscuro alrededor de todo lo que no sea transparente
    contorno() {
      const copia = filas.map((fila) => fila.slice());
      for (let y = 0; y < alto; y++) {
        for (let x = 0; x < ancho; x++) {
          if (copia[y][x] === ".") continue;
          let enElBorde = false;
          for (let dy = -1; dy <= 1 && !enElBorde; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              const fuera = nx < 0 || ny < 0 || nx >= ancho || ny >= alto;
              if (fuera || copia[ny][nx] === ".") {
                enElBorde = true;
                break;
              }
            }
          }
          if (enElBorde) this.poner(x, y, "o");
        }
      }
    },

    mapa() {
      return filas.map((fila) => fila.join(""));
    },
  };
}

/* ------------------------------------------------------------
   Convierte la cuadrícula de letras en píxeles de verdad
   ------------------------------------------------------------ */
function dibujarSprite(filas, tamano = PX, colores = null) {
  const paleta = colores || PALETA;
  const el = document.createElement("div");
  el.className = "sprite";
  el.style.width = filas[0].length * tamano + "px";
  el.style.height = filas.length * tamano + "px";
  el.style.gridTemplateColumns = "repeat(" + filas[0].length + ", " + tamano + "px)";
  el.style.gridTemplateRows = "repeat(" + filas.length + ", " + tamano + "px)";

  filas.forEach((fila, y) => {
    for (let x = 0; x < fila.length; x++) {
      const letra = fila[x];
      if (letra === ".") continue;

      const pixel = document.createElement("i");
      pixel.style.gridColumn = x + 1;
      pixel.style.gridRow = y + 1;
      pixel.style.background = paleta[letra] || letra;
      el.appendChild(pixel);
    }
  });

  return el;
}

/* ------------------------------------------------------------
   OREJAS
   ------------------------------------------------------------
   Cada tipo de oreja se dibuja con filas de píxeles.
   Se dibujan ANTES del cuerpo para que queden detrás de la
   cabeza (las orejas caídas son la excepción).
   ------------------------------------------------------------ */
function dibujarOrejas(l, tipo) {
  if (tipo === "cortas") {
    // Orejitas redondas y pegadas, como las del perro original
    const filas = [
      [6, 7],
      [5, 8],
      [4, 8],
      [3, 8],
    ];
    filas.forEach(([desde, hasta], i) => {
      for (let x = desde; x <= hasta; x++) {
        l.poner(x, 3 + i, "f");
        l.poner(23 - x, 3 + i, "f");
      }
    });
  } else if (tipo === "puntiagudas") {
    // Triángulos de gato
    const filas = [
      [4, 5],
      [3, 6],
      [3, 7],
      [3, 8],
      [4, 8],
      [5, 8],
      [6, 8],
    ];
    filas.forEach(([desde, hasta], i) => {
      for (let x = desde; x <= hasta; x++) {
        l.poner(x, 1 + i, "f");
        l.poner(23 - x, 1 + i, "f");
      }
    });
  } else if (tipo === "largas") {
    // Dos orejas altas de conejo
    for (let y = 0; y <= 7; y++) {
      const desde = y === 0 ? 5 : 4;
      const hasta = y === 0 ? 7 : 8;
      for (let x = desde; x <= hasta; x++) {
        l.poner(x, y, "f");
        l.poner(23 - x, y, "f");
      }
    }
  } else if (tipo === "redondas") {
    // Círculos grandes de ratón
    l.elipse(5.5, 5.5, 3.7, 3.7, "f");
    l.elipse(18.5, 5.5, 3.7, 3.7, "f");
  } else if (tipo === "caidas") {
    // Orejas largas y caídas del perro salchicha
    const filas = [
      [5, 4, 6],
      [6, 4, 7],
      [7, 3, 7],
      [8, 2, 6],
      [9, 1, 5],
      [10, 0, 4],
      [11, 0, 4],
      [12, 0, 4],
      [13, 0, 4],
      [14, 1, 4],
      [15, 1, 3],
    ];
    filas.forEach(([y, desde, hasta]) => {
      for (let x = desde; x <= hasta; x++) {
        l.poner(x, y, "s");
        l.poner(23 - x, y, "s");
      }
    });
  }
}

/* Pinta el interior rosa de las orejas, ya después del contorno */
function colorearOrejas(l, tipo) {
  const pintar = (x, y, color) => {
    if (l.filas[y] && (l.filas[y][x] === "f" || l.filas[y][x] === "s")) {
      l.poner(x, y, color);
    }
  };

  if (tipo === "cortas") {
    for (let y = 4; y <= 6; y++) {
      for (let x = 5; x <= 6; x++) {
        pintar(x, y, "p");
        pintar(23 - x, y, "p");
      }
    }
  } else if (tipo === "puntiagudas") {
    [[5, 4], [6, 4], [6, 5], [7, 5], [6, 6], [7, 6]].forEach(([x, y]) => {
      pintar(x, y, "p");
      pintar(23 - x, y, "p");
    });
  } else if (tipo === "largas") {
    for (let y = 2; y <= 6; y++) {
      for (let x = 5; x <= 6; x++) {
        pintar(x, y, "p");
        pintar(23 - x, y, "p");
      }
    }
  } else if (tipo === "redondas") {
    l.elipse(5.5, 5.5, 1.9, 1.9, "p");
    l.elipse(18.5, 5.5, 1.9, 1.9, "p");
  } else if (tipo === "caidas") {
    for (let y = 11; y <= 13; y++) {
      for (let x = 0; x <= 1; x++) {
        pintar(x, y, "p");
        pintar(23 - x, y, "p");
      }
    }
  }
}

/* ------------------------------------------------------------
   CUERPO DE LA MASCOTA (24 x 26 píxeles)
   ------------------------------------------------------------ */
function mapaCuerpo(especieId) {
  const especie = especiePorId(especieId);
  const rasgos = especie.rasgos || {};
  const l = crearLienzo(24, 26);

  const largo = rasgos.cuerpo === "largo";
  const cx = 11.5;
  const cy = largo ? 15.3 : 14;
  const rx = largo ? 10.2 : 9.6;
  const ry = largo ? 7.6 : 8.9;

  // Orejas (detrás de la cabeza)
  dibujarOrejas(l, rasgos.orejas);

  // Cola del ratón, dibujada antes del cuerpo para que se una a él
  if (rasgos.cola) {
    l.caja(18, 21, 2, 2, "p");
    l.caja(20, 22, 2, 1, "p");
    l.caja(21, 20, 2, 2, "p");
    l.caja(20, 18, 2, 1, "p");
  }

  // Cuerpo redondito
  l.elipse(cx, cy, rx, ry, "f");

  // Alas del loro (más oscuras, dentro del cuerpo)
  if (rasgos.pico) {
    l.elipse(4.6, 16, 2.7, 5.4, "s");
    l.elipse(18.4, 16, 2.7, 5.4, "s");
  }

  // Mancha del perro salchicha alrededor de un ojo
  if (rasgos.mancha) {
    l.elipse(15, 11.8, 4.2, 3.2, "x");
  }

  // Patitas que asoman por abajo
  l.elipse(largo ? 6.8 : 7, 23.2, 3.4, 2.6, "b");
  l.elipse(largo ? 16.2 : 16, 23.2, 3.4, 2.6, "b");

  // Sombra suave en la esquina de abajo a la derecha
  for (let y = 0; y < 26; y++) {
    for (let x = 0; x < 24; x++) {
      if (l.filas[y][x] === "f" && y > 17 && x > 13 && x + y > 34) {
        l.poner(x, y, "s");
      }
    }
  }

  // Barriguita clara
  l.elipse(cx, 20.4, largo ? 5.2 : 4.3, 3.1, "l");

  // Rayas del tigre
  if (rasgos.rayas) {
    const rayas = [
      [4, 11, 3],
      [3, 14, 2],
      [4, 17, 3],
      [17, 11, 3],
      [19, 14, 2],
      [17, 17, 3],
    ];
    rayas.forEach(([x, y, ancho]) => l.caja(x, y, ancho, 1, "x"));
  }

  // Cresta del loro (plumas sobre la cabeza)
  if (rasgos.cresta) {
    l.caja(10, 0, 2, 7, "y");
    l.caja(12, 2, 2, 5, "x");
    l.caja(8, 3, 2, 4, "x");
  }

  // Contorno final (le da el aire de pixel art)
  l.contorno();

  // Detalles que van por dentro, después del contorno
  colorearOrejas(l, rasgos.orejas);

  return l.mapa();
}

/* ------------------------------------------------------------
   CARAS: ojos, mejillas y boca según cómo se siente
   ------------------------------------------------------------ */
function mapaCara(animo, especieId) {
  const especie = especiePorId(especieId);
  const rasgos = especie.rasgos || {};
  const l = crearLienzo(24, 26);

  function ojosRedondos() {
    l.caja(8, 11, 2, 3, "e");
    l.caja(14, 11, 2, 3, "e");
    l.poner(8, 11, "w");
    l.poner(14, 11, "w");
  }

  function ojosFelices() {
    [[8, 13], [9, 12], [10, 13]].forEach(([x, y]) => l.poner(x, y, "e"));
    [[13, 13], [14, 12], [15, 13]].forEach(([x, y]) => l.poner(x, y, "e"));
  }

  function ojosCerrados() {
    l.caja(8, 13, 2, 1, "m");
    l.caja(14, 13, 2, 1, "m");
  }

  function mejillas() {
    l.caja(4, 15, 3, 2, "p");
    l.caja(17, 15, 3, 2, "p");
  }

  function nariz() {
    l.caja(11, 15, 2, 1, "p");
  }

  function sonrisa() {
    l.poner(10, 17, "m");
    l.poner(13, 17, "m");
    l.poner(11, 18, "m");
    l.poner(12, 18, "m");
  }

  function bocaAbierta() {
    l.caja(10, 17, 4, 1, "m");
    l.caja(11, 18, 2, 1, "r");
    l.poner(10, 18, "m");
    l.poner(13, 18, "m");
  }

  function bocaTriste() {
    l.poner(11, 17, "m");
    l.poner(12, 17, "m");
    l.poner(10, 18, "m");
    l.poner(13, 18, "m");
  }

  function bocaComiendo() {
    l.caja(10, 17, 4, 1, "m");
    l.caja(11, 18, 2, 1, "r");
  }

  function boca() {
    if (animo === "triste") bocaTriste();
    else if (animo === "comiendo") bocaComiendo();
    else if (animo === "feliz" || animo === "hambrienta" || animo === "mimo") {
      bocaAbierta();
    } else sonrisa();
  }

  function pico() {
    // Pico amarillo con punta hacia abajo
    l.caja(10, 14, 4, 1, "o");
    l.caja(10, 15, 4, 2, "y");
    l.caja(11, 17, 2, 1, "y");
    l.caja(10, 17, 1, 1, "o");
    l.caja(13, 17, 1, 1, "o");
    l.caja(11, 18, 2, 1, "o");
  }

  function dientes() {
    l.caja(10, 19, 1, 2, "w");
    l.caja(12, 19, 1, 2, "w");
  }

  function rayasFrente() {
    l.caja(8, 8, 2, 1, "x");
    l.caja(14, 8, 2, 1, "x");
    l.caja(11, 7, 2, 1, "x");
  }

  function bigotes() {
    [[1, 14], [1, 16], [1, 18]].forEach(([x, y]) => {
      l.caja(x, y, 2, 1, "s");
      l.caja(21, y, 2, 1, "s");
    });
  }

  function corazones() {
    const forma = ["01101", "11111", "01110", "00100"];
    const corazon = (ox, oy) => {
      forma.forEach((fila, dy) => {
        for (let dx = 0; dx < fila.length; dx++) {
          if (fila[dx] === "1") l.poner(ox + dx, oy + dy, "r");
        }
      });
    };
    corazon(6, 9);
    corazon(13, 9);
  }

  // --- Ojos y detalles según el ánimo ---
  if (animo === "feliz" || animo === "comiendo") ojosFelices();
  else if (animo === "durmiendo" || animo === "parpadeo") ojosCerrados();
  else ojosRedondos();

  if (animo === "mimo") corazones();

  if (animo === "triste") {
    [[7, 9], [8, 9], [9, 10]].forEach(([x, y]) => l.poner(x, y, "m"));
    [[16, 9], [15, 9], [14, 10]].forEach(([x, y]) => l.poner(x, y, "m"));
  }

  // Los loros no tienen mejillas rosas: tienen pico
  if (!rasgos.pico) mejillas();

  if (rasgos.pico) {
    pico();
  } else {
    nariz();
    boca();
  }

  // Rasgos propios de cada especie
  if (rasgos.dientes) dientes();
  if (rasgos.rayas) rayasFrente();
  if (rasgos.bigotes) bigotes();

  return l.mapa();
}

/* ------------------------------------------------------------
   ACCESORIOS: capas transparentes que se ponen encima
   ------------------------------------------------------------ */
function mapaAccesorio(id) {
  const l = crearLienzo(24, 26);

  if (id === "lazo") {
    // Dos lazadas y el nudo, sobre la oreja derecha
    l.caja(13, 2, 3, 3, "n");
    l.caja(17, 2, 3, 3, "n");
    l.caja(15, 3, 2, 2, "r");
    l.contorno();
  } else if (id === "gorro") {
    // Gorro redondo con pompón
    l.elipse(11.5, 4.8, 9, 4.4, "v");
    l.caja(3, 7, 18, 2, "n");
    l.elipse(11.5, 0.6, 1.8, 1.6, "w");
    l.contorno();
  } else if (id === "corona") {
    // Corona dorada con tres picos y dos joyas
    l.caja(6, 6, 12, 3, "y");
    l.caja(6, 3, 2, 3, "y");
    l.caja(11, 1, 2, 5, "y");
    l.caja(16, 3, 2, 3, "y");
    l.poner(10, 7, "r");
    l.poner(13, 7, "r");
    l.contorno();
  } else if (id === "gafas") {
    // Dos cristales oscuros con brillo y puente
    l.caja(5, 11, 4, 3, "d");
    l.caja(15, 11, 4, 3, "d");
    l.caja(5, 11, 1, 1, "w");
    l.caja(15, 11, 1, 1, "w");
    l.caja(9, 12, 6, 1, "d");
    l.caja(3, 12, 2, 1, "d");
    l.caja(19, 12, 2, 1, "d");
  } else if (id === "bufanda") {
    // Banda alrededor del cuello y una punta colgando
    l.caja(4, 19, 16, 2, "g");
    l.caja(16, 21, 4, 3, "g");
    l.contorno();
  } else if (id === "collar") {
    // Collar con una campanita dorada
    l.caja(5, 19, 14, 2, "n");
    l.caja(11, 21, 2, 2, "y");
    l.contorno();
  } else {
    return null;
  }

  return l.mapa();
}

/* ------------------------------------------------------------
   LOLA, LA OSITA COMPAÑERA (20 x 24 píxeles)
   ------------------------------------------------------------ */
function mapaLola() {
  const l = crearLienzo(20, 24);

  // Orejas redondas
  l.elipse(4.5, 5.5, 3.2, 3.2, "f");
  l.elipse(15.5, 5.5, 3.2, 3.2, "f");

  // Cuerpo y patitas
  l.elipse(10, 15, 7.4, 7.2, "f");
  l.elipse(6.5, 21.3, 2.9, 2.3, "b");
  l.elipse(13.5, 21.3, 2.9, 2.3, "b");

  // Brazos
  l.elipse(2.4, 14.5, 1.8, 3.2, "s");
  l.elipse(17.6, 14.5, 1.8, 3.2, "s");

  // Barriga y hocico
  l.elipse(10, 18.2, 3.8, 3, "l");
  l.elipse(10, 13.4, 3.2, 2.4, "l");

  // Contorno
  l.contorno();

  // Cara
  l.caja(6, 10, 2, 2, "e");
  l.caja(12, 10, 2, 2, "e");
  l.poner(6, 10, "w");
  l.poner(12, 10, "w");
  l.caja(9, 12, 2, 1, "m");
  l.poner(8, 14, "m");
  l.poner(11, 14, "m");
  l.poner(9, 15, "m");
  l.poner(10, 15, "m");

  // Mejillas e interior de las orejas
  l.caja(4, 13, 2, 1, "p");
  l.caja(14, 13, 2, 1, "p");
  l.elipse(4.5, 5.5, 1.4, 1.4, "p");
  l.elipse(15.5, 5.5, 1.4, 1.4, "p");

  return l.mapa();
}

/* ------------------------------------------------------------
   VISTA PEQUEÑA: cuerpo + cara juntos
   Sirve para las tarjetas de selección de mascota.
   ------------------------------------------------------------ */
function vistaMascota(especieId, animo = "feliz", tamano = 3) {
  const caja = document.createElement("div");
  caja.className = "vista-mascota";
  caja.style.width = 24 * tamano + "px";
  caja.style.height = 26 * tamano + "px";

  const paleta = paletaDeEspecie(especieId);
  caja.appendChild(dibujarSprite(mapaCuerpo(especieId), tamano, paleta));
  caja.appendChild(dibujarSprite(mapaCara(animo, especieId), tamano, paleta));

  return caja;
}
