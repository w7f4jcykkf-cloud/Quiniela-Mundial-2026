import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, collection,
  query, where, onSnapshot, updateDoc, serverTimestamp,
  getDocs, orderBy, arrayUnion, increment
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "firebase/auth";

// ─── CONFIGURACIÓN FIREBASE ───────────────────────────────────────────
// Reemplaza estos valores con los de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ─── DATOS MUNDIAL 2026 (48 equipos, 12 grupos) ──────────────────────
const GRUPOS = {
  A: ["Estados Unidos", "México", "Canadá", "Nueva Zelanda"],
  B: ["Argentina", "Chile", "Perú", "Australia"],
  C: ["Brasil", "Colombia", "Ecuador", "Japón"],
  D: ["Francia", "Bélgica", "Marruecos", "Arabia Saudita"],
  E: ["España", "Portugal", "Croacia", "Turquía"],
  F: ["Alemania", "Países Bajos", "Dinamarca", "Senegal"],
  G: ["Inglaterra", "Polonia", "Ucrania", "Irán"],
  H: ["Uruguay", "Costa Rica", "Panamá", "Camerún"],
  I: ["Suiza", "República Checa", "Escocia", "Guinea"],
  J: ["Italia", "Austria", "Hungría", "Argelia"],
  K: ["México (2)", "Venezuela", "Bolivia", "Nigeria"],
  L: ["Corea del Sur", "Japón (2)", "Costa de Marfil", "Serbia"]
};

// Partidos de la fase de grupos con fechas reales aproximadas del Mundial 2026
const PARTIDOS_GRUPOS = [
  // Grupo A
  { id: "A1", grupo: "A", local: "México", visitante: "Canadá", fecha: "2026-06-11T20:00:00-05:00", estadio: "Los Ángeles" },
  { id: "A2", grupo: "A", local: "Estados Unidos", visitante: "Nueva Zelanda", fecha: "2026-06-12T14:00:00-05:00", estadio: "Nueva York" },
  { id: "A3", grupo: "A", local: "México", visitante: "Nueva Zelanda", fecha: "2026-06-16T14:00:00-05:00", estadio: "Dallas" },
  { id: "A4", grupo: "A", local: "Canadá", visitante: "Estados Unidos", fecha: "2026-06-16T20:00:00-05:00", estadio: "Toronto" },
  { id: "A5", grupo: "A", local: "Canadá", visitante: "Nueva Zelanda", fecha: "2026-06-20T14:00:00-05:00", estadio: "Vancouver" },
  { id: "A6", grupo: "A", local: "Estados Unidos", visitante: "México", fecha: "2026-06-20T20:00:00-05:00", estadio: "Dallas" },
  // Grupo B
  { id: "B1", grupo: "B", local: "Argentina", visitante: "Chile", fecha: "2026-06-12T17:00:00-05:00", estadio: "Miami" },
  { id: "B2", grupo: "B", local: "Perú", visitante: "Australia", fecha: "2026-06-12T20:00:00-05:00", estadio: "Chicago" },
  { id: "B3", grupo: "B", local: "Argentina", visitante: "Australia", fecha: "2026-06-17T14:00:00-05:00", estadio: "Houston" },
  { id: "B4", grupo: "B", local: "Chile", visitante: "Perú", fecha: "2026-06-17T20:00:00-05:00", estadio: "Seattle" },
  { id: "B5", grupo: "B", local: "Chile", visitante: "Australia", fecha: "2026-06-21T14:00:00-05:00", estadio: "Seattle" },
  { id: "B6", grupo: "B", local: "Argentina", visitante: "Perú", fecha: "2026-06-21T20:00:00-05:00", estadio: "Miami" },
  // Grupo C
  { id: "C1", grupo: "C", local: "Brasil", visitante: "Colombia", fecha: "2026-06-13T14:00:00-05:00", estadio: "Nueva York" },
  { id: "C2", grupo: "C", local: "Ecuador", visitante: "Japón", fecha: "2026-06-13T20:00:00-05:00", estadio: "Los Ángeles" },
  { id: "C3", grupo: "C", local: "Brasil", visitante: "Japón", fecha: "2026-06-18T14:00:00-05:00", estadio: "Dallas" },
  { id: "C4", grupo: "C", local: "Colombia", visitante: "Ecuador", fecha: "2026-06-18T20:00:00-05:00", estadio: "Houston" },
  { id: "C5", grupo: "C", local: "Colombia", visitante: "Japón", fecha: "2026-06-22T14:00:00-05:00", estadio: "Chicago" },
  { id: "C6", grupo: "C", local: "Brasil", visitante: "Ecuador", fecha: "2026-06-22T20:00:00-05:00", estadio: "Nueva York" },
  // Grupo D
  { id: "D1", grupo: "D", local: "Francia", visitante: "Bélgica", fecha: "2026-06-13T17:00:00-05:00", estadio: "Los Ángeles" },
  { id: "D2", grupo: "D", local: "Marruecos", visitante: "Arabia Saudita", fecha: "2026-06-14T14:00:00-05:00", estadio: "Miami" },
  { id: "D3", grupo: "D", local: "Francia", visitante: "Arabia Saudita", fecha: "2026-06-19T14:00:00-05:00", estadio: "Seattle" },
  { id: "D4", grupo: "D", local: "Bélgica", visitante: "Marruecos", fecha: "2026-06-19T20:00:00-05:00", estadio: "Dallas" },
  { id: "D5", grupo: "D", local: "Bélgica", visitante: "Arabia Saudita", fecha: "2026-06-23T14:00:00-05:00", estadio: "Houston" },
  { id: "D6", grupo: "D", local: "Francia", visitante: "Marruecos", fecha: "2026-06-23T20:00:00-05:00", estadio: "Los Ángeles" },
  // Grupo E
  { id: "E1", grupo: "E", local: "España", visitante: "Portugal", fecha: "2026-06-14T17:00:00-05:00", estadio: "Nueva York" },
  { id: "E2", grupo: "E", local: "Croacia", visitante: "Turquía", fecha: "2026-06-14T20:00:00-05:00", estadio: "Seattle" },
  { id: "E3", grupo: "E", local: "España", visitante: "Turquía", fecha: "2026-06-20T14:00:00-05:00", estadio: "Miami" },
  { id: "E4", grupo: "E", local: "Portugal", visitante: "Croacia", fecha: "2026-06-20T20:00:00-05:00", estadio: "Chicago" },
  { id: "E5", grupo: "E", local: "Portugal", visitante: "Turquía", fecha: "2026-06-24T14:00:00-05:00", estadio: "Los Ángeles" },
  { id: "E6", grupo: "E", local: "España", visitante: "Croacia", fecha: "2026-06-24T20:00:00-05:00", estadio: "Nueva York" },
  // Grupo F
  { id: "F1", grupo: "F", local: "Alemania", visitante: "Países Bajos", fecha: "2026-06-15T14:00:00-05:00", estadio: "Dallas" },
  { id: "F2", grupo: "F", local: "Dinamarca", visitante: "Senegal", fecha: "2026-06-15T20:00:00-05:00", estadio: "Houston" },
  { id: "F3", grupo: "F", local: "Alemania", visitante: "Senegal", fecha: "2026-06-21T14:00:00-05:00", estadio: "Vancouver" },
  { id: "F4", grupo: "F", local: "Países Bajos", visitante: "Dinamarca", fecha: "2026-06-21T20:00:00-05:00", estadio: "Los Ángeles" },
  { id: "F5", grupo: "F", local: "Países Bajos", visitante: "Senegal", fecha: "2026-06-25T14:00:00-05:00", estadio: "Dallas" },
  { id: "F6", grupo: "F", local: "Alemania", visitante: "Dinamarca", fecha: "2026-06-25T20:00:00-05:00", estadio: "Chicago" },
  // Grupo G
  { id: "G1", grupo: "G", local: "Inglaterra", visitante: "Polonia", fecha: "2026-06-15T17:00:00-05:00", estadio: "Nueva York" },
  { id: "G2", grupo: "G", local: "Ucrania", visitante: "Irán", fecha: "2026-06-16T14:00:00-05:00", estadio: "Miami" },
  { id: "G3", grupo: "G", local: "Inglaterra", visitante: "Irán", fecha: "2026-06-22T14:00:00-05:00", estadio: "Houston" },
  { id: "G4", grupo: "G", local: "Polonia", visitante: "Ucrania", fecha: "2026-06-22T20:00:00-05:00", estadio: "Seattle" },
  { id: "G5", grupo: "G", local: "Polonia", visitante: "Irán", fecha: "2026-06-26T14:00:00-05:00", estadio: "Dallas" },
  { id: "G6", grupo: "G", local: "Inglaterra", visitante: "Ucrania", fecha: "2026-06-26T20:00:00-05:00", estadio: "Nueva York" },
  // Grupo H
  { id: "H1", grupo: "H", local: "Uruguay", visitante: "Costa Rica", fecha: "2026-06-16T17:00:00-05:00", estadio: "Los Ángeles" },
  { id: "H2", grupo: "H", local: "Panamá", visitante: "Camerún", fecha: "2026-06-17T14:00:00-05:00", estadio: "Chicago" },
  { id: "H3", grupo: "H", local: "Uruguay", visitante: "Camerún", fecha: "2026-06-23T14:00:00-05:00", estadio: "Miami" },
  { id: "H4", grupo: "H", local: "Costa Rica", visitante: "Panamá", fecha: "2026-06-23T20:00:00-05:00", estadio: "Houston" },
  { id: "H5", grupo: "H", local: "Costa Rica", visitante: "Camerún", fecha: "2026-06-27T14:00:00-05:00", estadio: "Seattle" },
  { id: "H6", grupo: "H", local: "Uruguay", visitante: "Panamá", fecha: "2026-06-27T20:00:00-05:00", estadio: "Nueva York" },
  // Grupo I
  { id: "I1", grupo: "I", local: "Suiza", visitante: "República Checa", fecha: "2026-06-18T14:00:00-05:00", estadio: "Los Ángeles" },
  { id: "I2", grupo: "I", local: "Escocia", visitante: "Guinea", fecha: "2026-06-18T20:00:00-05:00", estadio: "Dallas" },
  { id: "I3", grupo: "I", local: "Suiza", visitante: "Guinea", fecha: "2026-06-24T14:00:00-05:00", estadio: "Houston" },
  { id: "I4", grupo: "I", local: "República Checa", visitante: "Escocia", fecha: "2026-06-24T20:00:00-05:00", estadio: "Miami" },
  { id: "I5", grupo: "I", local: "República Checa", visitante: "Guinea", fecha: "2026-06-28T14:00:00-05:00", estadio: "Chicago" },
  { id: "I6", grupo: "I", local: "Suiza", visitante: "Escocia", fecha: "2026-06-28T20:00:00-05:00", estadio: "Nueva York" },
  // Grupo J
  { id: "J1", grupo: "J", local: "Italia", visitante: "Austria", fecha: "2026-06-19T14:00:00-05:00", estadio: "Chicago" },
  { id: "J2", grupo: "J", local: "Hungría", visitante: "Argelia", fecha: "2026-06-19T20:00:00-05:00", estadio: "Vancouver" },
  { id: "J3", grupo: "J", local: "Italia", visitante: "Argelia", fecha: "2026-06-25T14:00:00-05:00", estadio: "Seattle" },
  { id: "J4", grupo: "J", local: "Austria", visitante: "Hungría", fecha: "2026-06-25T20:00:00-05:00", estadio: "Los Ángeles" },
  { id: "J5", grupo: "J", local: "Austria", visitante: "Argelia", fecha: "2026-06-29T14:00:00-05:00", estadio: "Dallas" },
  { id: "J6", grupo: "J", local: "Italia", visitante: "Hungría", fecha: "2026-06-29T20:00:00-05:00", estadio: "Miami" },
  // Grupo K
  { id: "K1", grupo: "K", local: "Venezuela", visitante: "Bolivia", fecha: "2026-06-20T14:00:00-05:00", estadio: "Houston" },
  { id: "K2", grupo: "K", local: "Nigeria", visitante: "Venezuela", fecha: "2026-06-20T20:00:00-05:00", estadio: "Chicago" },
  { id: "K3", grupo: "K", local: "Bolivia", visitante: "Nigeria", fecha: "2026-06-26T14:00:00-05:00", estadio: "Miami" },
  { id: "K4", grupo: "K", local: "Venezuela", visitante: "Nigeria", fecha: "2026-06-26T20:00:00-05:00", estadio: "Dallas" },
  { id: "K5", grupo: "K", local: "Bolivia", visitante: "Venezuela", fecha: "2026-06-30T14:00:00-05:00", estadio: "Seattle" },
  { id: "K6", grupo: "K", local: "Nigeria", visitante: "Bolivia", fecha: "2026-06-30T20:00:00-05:00", estadio: "Houston" },
  // Grupo L
  { id: "L1", grupo: "L", local: "Corea del Sur", visitante: "Costa de Marfil", fecha: "2026-06-21T14:00:00-05:00", estadio: "Los Ángeles" },
  { id: "L2", grupo: "L", local: "Serbia", visitante: "Corea del Sur", fecha: "2026-06-21T20:00:00-05:00", estadio: "Nueva York" },
  { id: "L3", grupo: "L", local: "Costa de Marfil", visitante: "Serbia", fecha: "2026-06-27T14:00:00-05:00", estadio: "Miami" },
  { id: "L4", grupo: "L", local: "Corea del Sur", visitante: "Serbia", fecha: "2026-06-27T20:00:00-05:00", estadio: "Chicago" },
  { id: "L5", grupo: "L", local: "Costa de Marfil", visitante: "Serbia", fecha: "2026-07-01T14:00:00-05:00", estadio: "Dallas" },
  { id: "L6", grupo: "L", local: "Corea del Sur", visitante: "Costa de Marfil", fecha: "2026-07-01T20:00:00-05:00", estadio: "Seattle" },
];

// ─── SISTEMA DE PUNTOS ────────────────────────────────────────────────
function calcularPuntos(prediccion, resultado) {
  const { local: pL, visitante: pV } = prediccion;
  const { local: rL, visitante: rV } = resultado;

  // Marcador exacto
  if (pL === rL && pV === rV) return 6;

  const ganadorReal = rL > rV ? "local" : rV > rL ? "visitante" : "empate";
  const ganadorPred = pL > pV ? "local" : pV > pL ? "visitante" : "empate";

  // Goles del ganador exactos (consolación, 2 pts)
  let golesGanadorExactos = false;
  if (ganadorReal === "local" && pL === rL) golesGanadorExactos = true;
  if (ganadorReal === "visitante" && pV === rV) golesGanadorExactos = true;
  if (ganadorReal === "empate" && (pL === rL || pV === rV)) golesGanadorExactos = true;
  if (golesGanadorExactos) return 2;

  // Ganador correcto
  if (ganadorPred === ganadorReal) return 3;

  return 0;
}

function esBloqueado(fechaPartido) {
  const limite = new Date(new Date(fechaPartido).getTime() - 60 * 60 * 1000);
  return new Date() >= limite;
}

function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── BANDERAS EMOJI ───────────────────────────────────────────────────
const BANDERAS = {
  "Estados Unidos": "🇺🇸", "México": "🇲🇽", "Canadá": "🇨🇦", "Nueva Zelanda": "🇳🇿",
  "Argentina": "🇦🇷", "Chile": "🇨🇱", "Perú": "🇵🇪", "Australia": "🇦🇺",
  "Brasil": "🇧🇷", "Colombia": "🇨🇴", "Ecuador": "🇪🇨", "Japón": "🇯🇵",
  "Francia": "🇫🇷", "Bélgica": "🇧🇪", "Marruecos": "🇲🇦", "Arabia Saudita": "🇸🇦",
  "España": "🇪🇸", "Portugal": "🇵🇹", "Croacia": "🇭🇷", "Turquía": "🇹🇷",
  "Alemania": "🇩🇪", "Países Bajos": "🇳🇱", "Dinamarca": "🇩🇰", "Senegal": "🇸🇳",
  "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Polonia": "🇵🇱", "Ucrania": "🇺🇦", "Irán": "🇮🇷",
  "Uruguay": "🇺🇾", "Costa Rica": "🇨🇷", "Panamá": "🇵🇦", "Camerún": "🇨🇲",
  "Suiza": "🇨🇭", "República Checa": "🇨🇿", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Guinea": "🇬🇳",
  "Italia": "🇮🇹", "Austria": "🇦🇹", "Hungría": "🇭🇺", "Argelia": "🇩🇿",
  "Venezuela": "🇻🇪", "Bolivia": "🇧🇴", "Nigeria": "🇳🇬",
  "Corea del Sur": "🇰🇷", "Costa de Marfil": "🇨🇮", "Serbia": "🇷🇸"
};

const flag = (equipo) => BANDERAS[equipo] || "🏳️";

// ─── ESTILOS CSS ──────────────────────────────────────────────────────
const estilos = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --verde: #00C853;
    --verde-oscuro: #007E33;
    --dorado: #FFD700;
    --rojo: #D32F2F;
    --azul: #1565C0;
    --fondo: #0a0a0a;
    --fondo2: #111111;
    --fondo3: #1a1a1a;
    --texto: #f0f0f0;
    --texto2: #aaaaaa;
    --borde: #2a2a2a;
    --radio: 16px;
  }

  body {
    font-family: 'Nunito', sans-serif;
    background: var(--fondo);
    color: var(--texto);
    min-height: 100vh;
    overscroll-behavior: none;
  }

  h1, h2 { font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px; }

  .app { max-width: 480px; margin: 0 auto; padding: 0 0 100px; min-height: 100vh; }

  /* HEADER */
  .header {
    background: linear-gradient(135deg, #004D00 0%, #006400 50%, #004D00 100%);
    padding: 20px 16px 16px;
    position: sticky; top: 0; z-index: 100;
    border-bottom: 3px solid var(--dorado);
  }
  .header-top { display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 28px; color: var(--dorado); line-height: 1; }
  .header p { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
  .avatar { width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--dorado); object-fit: cover; }

  /* NAVEGACIÓN */
  .nav-bottom {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: 480px;
    background: #111; border-top: 1px solid var(--borde);
    display: flex; padding: 8px 0 20px;
    z-index: 100;
  }
  .nav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
    background: none; border: none; color: var(--texto2); cursor: pointer;
    font-family: 'Nunito', sans-serif; font-size: 10px; font-weight: 700; padding: 6px 0;
    transition: color 0.2s;
  }
  .nav-btn.activo { color: var(--verde); }
  .nav-btn span:first-child { font-size: 22px; }

  /* PANTALLA LOGIN */
  .login-screen {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 32px 24px; gap: 24px;
    background: radial-gradient(ellipse at top, #003300 0%, var(--fondo) 70%);
  }
  .login-logo { font-family: 'Bebas Neue'; font-size: 72px; color: var(--dorado); text-align: center; line-height: 0.9; }
  .login-sub { font-size: 16px; color: rgba(255,255,255,0.6); text-align: center; }
  .login-card {
    background: var(--fondo2); border: 1px solid var(--borde); border-radius: 24px;
    padding: 32px 24px; text-align: center; width: 100%; max-width: 360px;
  }
  .login-card h2 { font-size: 28px; color: var(--verde); margin-bottom: 8px; }
  .login-card p { color: var(--texto2); font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
  .btn-google {
    width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
    background: white; color: #333; font-family: 'Nunito', sans-serif;
    font-size: 16px; font-weight: 800; display: flex; align-items: center;
    justify-content: center; gap: 12px; transition: transform 0.1s, box-shadow 0.2s;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  }
  .btn-google:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.5); }
  .btn-google:active { transform: translateY(0); }
  .btn-google img { width: 24px; }

  /* BOTONES */
  .btn {
    padding: 14px 24px; border-radius: 14px; border: none; cursor: pointer;
    font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 800;
    transition: transform 0.1s, filter 0.2s; display: inline-flex; align-items: center; gap: 8px;
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--verde); color: #000; }
  .btn-primary:hover { filter: brightness(1.1); }
  .btn-secundario { background: var(--fondo3); color: var(--texto); border: 1px solid var(--borde); }
  .btn-dorado { background: var(--dorado); color: #000; }
  .btn-rojo { background: var(--rojo); color: white; }
  .btn-bloque { width: 100%; justify-content: center; }

  /* CARDS */
  .card {
    background: var(--fondo2); border: 1px solid var(--borde); border-radius: var(--radio);
    padding: 16px; margin: 12px 16px;
  }
  .card-titulo { font-size: 13px; font-weight: 700; color: var(--texto2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }

  /* SECCIÓN LIGAS */
  .seccion { padding: 16px; }
  .seccion-titulo { font-family: 'Bebas Neue'; font-size: 24px; color: var(--dorado); margin-bottom: 4px; }
  .seccion-sub { font-size: 13px; color: var(--texto2); margin-bottom: 16px; }

  .liga-item {
    background: var(--fondo2); border: 1px solid var(--borde); border-radius: var(--radio);
    padding: 16px; margin-bottom: 12px; cursor: pointer;
    transition: border-color 0.2s, transform 0.1s;
  }
  .liga-item:hover { border-color: var(--verde); transform: translateY(-1px); }
  .liga-item.activa { border-color: var(--verde); background: #0a1f0a; }
  .liga-nombre { font-size: 18px; font-weight: 800; }
  .liga-codigo { font-size: 12px; color: var(--texto2); margin-top: 4px; font-family: monospace; letter-spacing: 2px; }
  .liga-miembros { font-size: 13px; color: var(--verde); margin-top: 4px; font-weight: 700; }

  /* FORMULARIOS */
  .form-grupo { margin-bottom: 16px; }
  .form-label { font-size: 13px; font-weight: 700; color: var(--texto2); margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
  .form-input {
    width: 100%; padding: 14px 16px; border-radius: 12px;
    background: var(--fondo3); border: 1px solid var(--borde); color: var(--texto);
    font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 700;
    outline: none; transition: border-color 0.2s;
  }
  .form-input:focus { border-color: var(--verde); }
  .form-input.codigo { letter-spacing: 4px; text-transform: uppercase; font-size: 20px; text-align: center; }

  /* PARTIDOS */
  .partido-card {
    background: var(--fondo2); border: 1px solid var(--borde); border-radius: var(--radio);
    padding: 16px; margin-bottom: 12px; position: relative; overflow: hidden;
  }
  .partido-card.bloqueado { opacity: 0.7; }
  .partido-card.con-resultado { border-color: #1a3a1a; }
  .partido-grupo-badge {
    position: absolute; top: 12px; right: 12px;
    background: var(--verde-oscuro); color: var(--dorado);
    font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 20px;
    letter-spacing: 1px;
  }
  .partido-equipos {
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
    gap: 8px; margin-bottom: 12px;
  }
  .equipo { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .equipo-bandera { font-size: 36px; }
  .equipo-nombre { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.2; }
  .vs { font-family: 'Bebas Neue'; font-size: 22px; color: var(--texto2); }

  .resultado-real {
    text-align: center; margin-bottom: 12px;
    font-family: 'Bebas Neue'; font-size: 36px; color: var(--dorado); letter-spacing: 4px;
  }

  .pred-inputs {
    display: grid; grid-template-columns: 1fr 32px 1fr; gap: 8px; align-items: center;
    margin-bottom: 8px;
  }
  .pred-input {
    background: var(--fondo3); border: 2px solid var(--borde); border-radius: 12px;
    color: var(--texto); font-family: 'Bebas Neue'; font-size: 32px; text-align: center;
    padding: 8px 4px; width: 100%; outline: none; transition: border-color 0.2s;
  }
  .pred-input:focus { border-color: var(--verde); }
  .pred-input:disabled { opacity: 0.4; }
  .pred-guion { font-family: 'Bebas Neue'; font-size: 28px; color: var(--texto2); text-align: center; }

  .mis-puntos-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #1a3a1a; border: 1px solid var(--verde); border-radius: 20px;
    padding: 4px 12px; font-size: 13px; font-weight: 700; color: var(--verde);
  }

  .lock-aviso {
    font-size: 12px; color: var(--rojo); text-align: center; font-weight: 700;
    display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 6px;
  }
  .fecha-partido { font-size: 12px; color: var(--texto2); text-align: center; margin-bottom: 8px; }

  /* TABLA */
  .tabla-posiciones { border-radius: var(--radio); overflow: hidden; margin: 0 16px; }
  .tabla-header {
    display: grid; grid-template-columns: 40px 1fr 60px 60px;
    padding: 10px 16px; background: var(--verde-oscuro);
    font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
  }
  .tabla-fila {
    display: grid; grid-template-columns: 40px 1fr 60px 60px;
    padding: 14px 16px; border-bottom: 1px solid var(--borde);
    background: var(--fondo2); align-items: center;
    transition: background 0.2s;
  }
  .tabla-fila:hover { background: var(--fondo3); }
  .tabla-fila.yo { background: #0a1f0a; border-color: var(--verde); }
  .tabla-pos { font-family: 'Bebas Neue'; font-size: 22px; color: var(--texto2); }
  .tabla-pos.top1 { color: var(--dorado); }
  .tabla-pos.top2 { color: #aaa; }
  .tabla-pos.top3 { color: #cd7f32; }
  .tabla-usuario { font-weight: 800; font-size: 15px; }
  .tabla-partidos { text-align: center; color: var(--texto2); font-size: 13px; }
  .tabla-puntos { text-align: right; font-family: 'Bebas Neue'; font-size: 26px; color: var(--verde); }

  /* TABS */
  .tabs { display: flex; gap: 8px; padding: 0 16px; margin-bottom: 16px; overflow-x: auto; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 8px 16px; border-radius: 20px; border: 1px solid var(--borde);
    background: var(--fondo2); color: var(--texto2); cursor: pointer; white-space: nowrap;
    font-family: 'Nunito'; font-size: 13px; font-weight: 700; transition: all 0.2s;
  }
  .tab.activo { background: var(--verde); color: #000; border-color: var(--verde); }

  /* ADMIN */
  .admin-panel { padding: 16px; }
  .resultado-form { display: grid; grid-template-columns: 1fr 32px 1fr; gap: 8px; align-items: center; margin: 12px 0; }
  .resultado-form input {
    background: var(--fondo3); border: 2px solid var(--borde); border-radius: 12px;
    color: var(--texto); font-family: 'Bebas Neue'; font-size: 32px; text-align: center;
    padding: 8px; outline: none; transition: border-color 0.2s;
  }
  .resultado-form input:focus { border-color: var(--dorado); }
  .resultado-guion { font-family: 'Bebas Neue'; font-size: 28px; color: var(--texto2); text-align: center; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    display: flex; align-items: flex-end; justify-content: center;
    z-index: 200; padding: 0;
  }
  .modal {
    background: var(--fondo2); border-top-left-radius: 28px; border-top-right-radius: 28px;
    padding: 24px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto;
    border-top: 3px solid var(--verde);
  }
  .modal-titulo { font-size: 24px; font-weight: 900; margin-bottom: 8px; }
  .modal-sub { font-size: 14px; color: var(--texto2); margin-bottom: 24px; }

  /* INVITACIÓN */
  .codigo-grande {
    background: var(--fondo3); border: 2px dashed var(--dorado); border-radius: 16px;
    padding: 20px; text-align: center; margin: 16px 0;
  }
  .codigo-grande-texto { font-family: 'Bebas Neue'; font-size: 48px; color: var(--dorado); letter-spacing: 8px; }

  /* ESTADOS */
  .empty-state { text-align: center; padding: 48px 24px; }
  .empty-estado-icono { font-size: 56px; margin-bottom: 16px; }
  .empty-estado-titulo { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
  .empty-estado-texto { color: var(--texto2); font-size: 14px; line-height: 1.6; }

  .loader { text-align: center; padding: 48px; color: var(--texto2); font-size: 14px; }
  .spinner { width: 40px; height: 40px; border: 3px solid var(--borde); border-top-color: var(--verde); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .toast {
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    background: var(--verde-oscuro); border: 1px solid var(--verde); border-radius: 12px;
    padding: 12px 24px; color: white; font-weight: 700; font-size: 14px;
    z-index: 300; animation: toastIn 0.3s ease; white-space: nowrap;
  }
  .toast.error { background: #7f1d1d; border-color: var(--rojo); }
  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* RONDAS ELIMINATORIAS */
  .ronda-badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px;
    font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
    background: #1a1a4a; color: #7b7bff; border: 1px solid #3a3a8a;
    margin-bottom: 8px;
  }
  .activar-ronda-btn {
    width: 100%; padding: 14px; border-radius: 14px; border: 2px solid var(--dorado);
    background: transparent; color: var(--dorado); font-family: 'Nunito'; font-size: 15px;
    font-weight: 800; cursor: pointer; transition: all 0.2s; margin-bottom: 8px;
  }
  .activar-ronda-btn:hover { background: var(--dorado); color: #000; }
  .activar-ronda-btn.activa { background: var(--dorado); color: #000; }

  /* RESPONSIVE */
  @media (max-width: 360px) {
    .equipo-bandera { font-size: 28px; }
    .pred-input { font-size: 26px; }
    .login-logo { font-size: 56px; }
  }

  .separador { height: 1px; background: var(--borde); margin: 16px 0; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .chip-verde { background: #0a2a0a; color: var(--verde); border: 1px solid #1a4a1a; }
  .chip-dorado { background: #2a2000; color: var(--dorado); border: 1px solid #4a3a00; }
  .chip-rojo { background: #2a0000; color: #ff6b6b; border: 1px solid #4a1a1a; }
`;

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState("ligas");
  const [ligaActual, setLigaActual] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const mostrarToast = useCallback((msg, tipo = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const ref = doc(db, "usuarios", user.uid);
        await setDoc(ref, {
          nombre: user.displayName,
          foto: user.photoURL,
          email: user.email,
          ultimoAcceso: serverTimestamp()
        }, { merge: true });
        setUsuario(user);
      } else {
        setUsuario(null);
        setLigaActual(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { mostrarToast("No se pudo iniciar sesión", "error"); }
  };

  const logout = async () => {
    await signOut(auth);
    setLigaActual(null);
    setPagina("ligas");
    mostrarToast("Sesión cerrada");
  };

  if (cargando) return (
    <>
      <style>{estilos}</style>
      <div className="loader"><div className="spinner"></div>Cargando...</div>
    </>
  );

  if (!usuario) return (
    <>
      <style>{estilos}</style>
      <PantallaLogin onLogin={login} />
    </>
  );

  return (
    <>
      <style>{estilos}</style>
      <div className="app">
        <Header usuario={usuario} onLogout={logout} ligaActual={ligaActual} />
        {toast && <div className={`toast ${toast.tipo === "error" ? "error" : ""}`}>{toast.msg}</div>}
        {modal === "crear_liga" && (
          <ModalCrearLiga usuario={usuario} onClose={() => setModal(null)} onCreada={(liga) => { setLigaActual(liga); setModal(null); setPagina("partidos"); mostrarToast("¡Liga creada! 🎉"); }} />
        )}
        {modal === "unirse_liga" && (
          <ModalUnirseliga usuario={usuario} onClose={() => setModal(null)} onUnido={(liga) => { setLigaActual(liga); setModal(null); setPagina("partidos"); mostrarToast("¡Te uniste a la liga! 🙌"); }} mostrarToast={mostrarToast} />
        )}

        {pagina === "ligas" && <PaginaLigas usuario={usuario} onSelect={setLigaActual} ligaActual={ligaActual} onCrear={() => setModal("crear_liga")} onUnirse={() => setModal("unirse_liga")} onIrPartidos={() => setPagina("partidos")} />}
        {pagina === "partidos" && <PaginaPartidos usuario={usuario} ligaActual={ligaActual} mostrarToast={mostrarToast} />}
        {pagina === "tabla" && <PaginaTabla usuario={usuario} ligaActual={ligaActual} mostrarToast={mostrarToast} />}
        {pagina === "admin" && <PaginaAdmin usuario={usuario} ligaActual={ligaActual} mostrarToast={mostrarToast} />}

        <nav className="nav-bottom">
          <button className={`nav-btn ${pagina === "ligas" ? "activo" : ""}`} onClick={() => setPagina("ligas")}>
            <span>🏆</span><span>Ligas</span>
          </button>
          <button className={`nav-btn ${pagina === "partidos" ? "activo" : ""}`} onClick={() => { if (!ligaActual) { mostrarToast("Primero selecciona una liga", "error"); return; } setPagina("partidos"); }}>
            <span>⚽</span><span>Partidos</span>
          </button>
          <button className={`nav-btn ${pagina === "tabla" ? "activo" : ""}`} onClick={() => { if (!ligaActual) { mostrarToast("Primero selecciona una liga", "error"); return; } setPagina("tabla"); }}>
            <span>📊</span><span>Tabla</span>
          </button>
          {ligaActual?.adminId === usuario.uid && (
            <button className={`nav-btn ${pagina === "admin" ? "activo" : ""}`} onClick={() => setPagina("admin")}>
              <span>⚙️</span><span>Admin</span>
            </button>
          )}
        </nav>
      </div>
    </>
  );
}

// ─── PANTALLA LOGIN ───────────────────────────────────────────────────
function PantallaLogin({ onLogin }) {
  return (
    <div className="login-screen">
      <div>
        <div className="login-logo">MUNDIAL<br />2026 🏆</div>
        <p className="login-sub">La quiniela de tus amigos y familia</p>
      </div>
      <div className="login-card">
        <h2>¡Bienvenido!</h2>
        <p>Entra con tu cuenta de Google, crea o únete a una liga y empieza a predecir los partidos del Mundial 2026.</p>
        <button className="btn-google" onClick={onLogin}>
          <img src="https://www.google.com/favicon.ico" alt="Google" />
          Entrar con Google
        </button>
      </div>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center" }}>
        Gratis · Sin contraseñas · Para todas las edades
      </p>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────
function Header({ usuario, onLogout, ligaActual }) {
  return (
    <div className="header">
      <div className="header-top">
        <div>
          <h1>⚽ QUINIELA 2026</h1>
          {ligaActual && <p>📍 {ligaActual.nombre}</p>}
        </div>
        <img className="avatar" src={usuario.photoURL} alt={usuario.displayName} onClick={onLogout} title="Toca para cerrar sesión" />
      </div>
    </div>
  );
}

// ─── PÁGINA LIGAS ─────────────────────────────────────────────────────
function PaginaLigas({ usuario, onSelect, ligaActual, onCrear, onUnirse, onIrPartidos }) {
  const [ligas, setLigas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarInvitacion, setMostrarInvitacion] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "ligas"), where("miembros", "array-contains", usuario.uid));
    const unsub = onSnapshot(q, (snap) => {
      setLigas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    return unsub;
  }, [usuario.uid]);

  const seleccionarLiga = (liga) => {
    onSelect(liga);
    onIrPartidos();
  };

  const textoInvitacion = (liga) => `🏆 ¡Únete a nuestra quiniela del Mundial 2026!\n\nLiga: *${liga.nombre}*\n🔑 Código: *${liga.codigo}*\n\n1. Descarga la app o entra al link\n2. Entra con Google\n3. Toca "Unirse a liga"\n4. Escribe el código: *${liga.codigo}*\n\n¡A competir! ⚽`;

  if (cargando) return <div className="loader"><div className="spinner"></div>Cargando tus ligas...</div>;

  return (
    <div className="seccion">
      <div className="seccion-titulo">🏆 Mis Ligas</div>
      <div className="seccion-sub">Selecciona una liga para ver partidos y tabla</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onCrear}>+ Crear liga</button>
        <button className="btn btn-secundario" style={{ flex: 1 }} onClick={onUnirse}>🔑 Unirme</button>
      </div>

      {ligas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-estado-icono">⚽</div>
          <div className="empty-estado-titulo">¡Aún no tienes ligas!</div>
          <div className="empty-estado-texto">Crea una liga nueva o pídele el código a alguien para unirte a la diversión.</div>
        </div>
      ) : (
        ligas.map(liga => (
          <div key={liga.id} className={`liga-item ${ligaActual?.id === liga.id ? "activa" : ""}`} onClick={() => seleccionarLiga(liga)}>
            <div className="liga-nombre">{liga.nombre}</div>
            <div className="liga-codigo">Código: {liga.codigo}</div>
            <div className="liga-miembros">👥 {liga.miembros?.length || 0} participantes</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-secundario" style={{ fontSize: 12, padding: "8px 12px" }}
                onClick={(e) => { e.stopPropagation(); seleccionarLiga(liga); }}>
                Ver partidos
              </button>
              <button className="btn btn-dorado" style={{ fontSize: 12, padding: "8px 12px" }}
                onClick={(e) => { e.stopPropagation(); setMostrarInvitacion(liga); }}>
                📲 Invitar
              </button>
            </div>
          </div>
        ))
      )}

      {mostrarInvitacion && (
        <div className="modal-overlay" onClick={() => setMostrarInvitacion(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-titulo">📲 Invitar amigos</div>
            <div className="modal-sub">Comparte el código o manda el mensaje por WhatsApp</div>
            <div className="codigo-grande">
              <div style={{ fontSize: 12, color: "var(--texto2)", marginBottom: 4 }}>CÓDIGO DE LIGA</div>
              <div className="codigo-grande-texto">{mostrarInvitacion.codigo}</div>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(textoInvitacion(mostrarInvitacion))}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-primary btn-bloque"
              style={{ textDecoration: "none", justifyContent: "center", display: "flex", marginBottom: 8 }}
            >
              💬 Compartir por WhatsApp
            </a>
            <button className="btn btn-secundario btn-bloque" onClick={() => setMostrarInvitacion(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODAL CREAR LIGA ─────────────────────────────────────────────────
function ModalCrearLiga({ usuario, onClose, onCreada }) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const codigo = generarCodigo();
      const ligaRef = doc(collection(db, "ligas"));
      await setDoc(ligaRef, {
        nombre: nombre.trim(),
        codigo,
        adminId: usuario.uid,
        adminNombre: usuario.displayName,
        miembros: [usuario.uid],
        miembrosInfo: { [usuario.uid]: { nombre: usuario.displayName, foto: usuario.photoURL } },
        creada: serverTimestamp(),
        rondasActivas: [],
        fase: "grupos"
      });
      onCreada({ id: ligaRef.id, nombre: nombre.trim(), codigo, adminId: usuario.uid, miembros: [usuario.uid] });
    } catch (e) { console.error(e); }
    setGuardando(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-titulo">🏆 Crear nueva liga</div>
        <div className="modal-sub">Dale un nombre a tu liga. Se generará un código para invitar a tus amigos.</div>
        <div className="form-grupo">
          <label className="form-label">Nombre de tu liga</label>
          <input className="form-input" placeholder="Ej: Los Compadres" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === "Enter" && crear()} autoFocus maxLength={40} />
        </div>
        <button className="btn btn-primary btn-bloque" onClick={crear} disabled={!nombre.trim() || guardando}>
          {guardando ? "Creando..." : "✅ Crear liga"}
        </button>
        <div style={{ height: 8 }}></div>
        <button className="btn btn-secundario btn-bloque" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── MODAL UNIRSE A LIGA ──────────────────────────────────────────────
function ModalUnirseliga({ usuario, onClose, onUnido, mostrarToast }) {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);

  const unirse = async () => {
    const cod = codigo.trim().toUpperCase();
    if (cod.length !== 6) return;
    setBuscando(true);
    try {
      const q = query(collection(db, "ligas"), where("codigo", "==", cod));
      const snap = await getDocs(q);
      if (snap.empty) { mostrarToast("Código no encontrado", "error"); setBuscando(false); return; }
      const ligaDoc = snap.docs[0];
      const liga = { id: ligaDoc.id, ...ligaDoc.data() };
      if (liga.miembros?.includes(usuario.uid)) { mostrarToast("Ya estás en esta liga"); onUnido(liga); return; }
      await updateDoc(doc(db, "ligas", ligaDoc.id), {
        miembros: arrayUnion(usuario.uid),
        [`miembrosInfo.${usuario.uid}`]: { nombre: usuario.displayName, foto: usuario.photoURL }
      });
      onUnido({ ...liga, miembros: [...(liga.miembros || []), usuario.uid] });
    } catch (e) { mostrarToast("Error al unirse", "error"); }
    setBuscando(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-titulo">🔑 Unirme a una liga</div>
        <div className="modal-sub">Escribe el código de 6 letras que te compartió el organizador</div>
        <div className="form-grupo">
          <label className="form-label">Código de liga</label>
          <input
            className="form-input codigo"
            placeholder="XXXXXX"
            value={codigo}
            onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            autoFocus
          />
        </div>
        <button className="btn btn-primary btn-bloque" onClick={unirse} disabled={codigo.length !== 6 || buscando}>
          {buscando ? "Buscando..." : "✅ Unirme a la liga"}
        </button>
        <div style={{ height: 8 }}></div>
        <button className="btn btn-secundario btn-bloque" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── PÁGINA PARTIDOS ──────────────────────────────────────────────────
function PaginaPartidos({ usuario, ligaActual, mostrarToast }) {
  const [grupoActivo, setGrupoActivo] = useState("A");
  const [predicciones, setPredicciones] = useState({});
  const [resultados, setResultados] = useState({});
  const [guardando, setGuardando] = useState({});

  useEffect(() => {
    if (!ligaActual) return;
    const unsub = onSnapshot(doc(db, "predicciones", `${ligaActual.id}_${usuario.uid}`), (snap) => {
      if (snap.exists()) setPredicciones(snap.data());
    });
    return unsub;
  }, [ligaActual, usuario.uid]);

  useEffect(() => {
    if (!ligaActual) return;
    const unsub = onSnapshot(doc(db, "resultados", ligaActual.id), (snap) => {
      if (snap.exists()) setResultados(snap.data());
    });
    return unsub;
  }, [ligaActual]);

  if (!ligaActual) return (
    <div className="empty-state">
      <div className="empty-estado-icono">🏆</div>
      <div className="empty-estado-titulo">Selecciona una liga</div>
      <div className="empty-estado-texto">Ve a la sección Ligas y selecciona una para ver los partidos.</div>
    </div>
  );

  const partidosGrupo = PARTIDOS_GRUPOS.filter(p => p.grupo === grupoActivo);

  const guardarPrediccion = async (partidoId, local, visitante) => {
    const partido = PARTIDOS_GRUPOS.find(p => p.id === partidoId);
    if (esBloqueado(partido.fecha)) { mostrarToast("⛔ ¡Predicción bloqueada! El partido empieza pronto", "error"); return; }
    if (local === "" || visitante === "" || isNaN(local) || isNaN(visitante)) return;

    setGuardando(g => ({ ...g, [partidoId]: true }));
    try {
      const ref = doc(db, "predicciones", `${ligaActual.id}_${usuario.uid}`);
      await setDoc(ref, {
        [`${partidoId}_local`]: parseInt(local),
        [`${partidoId}_visitante`]: parseInt(visitante),
        [`${partidoId}_ts`]: new Date().toISOString(),
        usuarioId: usuario.uid,
        ligaId: ligaActual.id,
        nombre: usuario.displayName,
        foto: usuario.photoURL
      }, { merge: true });
      mostrarToast("✅ Predicción guardada");
    } catch (e) { mostrarToast("Error al guardar", "error"); }
    setGuardando(g => ({ ...g, [partidoId]: false }));
  };

  const calcPuntosPartido = (partidoId) => {
    const rL = resultados[`${partidoId}_local`];
    const rV = resultados[`${partidoId}_visitante`];
    const pL = predicciones[`${partidoId}_local`];
    const pV = predicciones[`${partidoId}_visitante`];
    if (rL === undefined || pL === undefined) return null;
    return calcularPuntos({ local: pL, visitante: pV }, { local: rL, visitante: rV });
  };

  return (
    <div>
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>⚽ Fase de Grupos</div>
        <div style={{ fontSize: 13, color: "var(--texto2)", marginBottom: 12 }}>Toca un partido para ingresar tu predicción</div>
      </div>

      <div className="tabs">
        {Object.keys(GRUPOS).map(g => (
          <button key={g} className={`tab ${grupoActivo === g ? "activo" : ""}`} onClick={() => setGrupoActivo(g)}>
            Grupo {g}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        <div style={{ fontSize: 12, color: "var(--texto2)", marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {GRUPOS[grupoActivo].map(eq => <span key={eq}>{flag(eq)} {eq}</span>)}
        </div>

        {partidosGrupo.map(partido => {
          const bloqueado = esBloqueado(partido.fecha);
          const rLocal = resultados[`${partido.id}_local`];
          const rVisitante = resultados[`${partido.id}_visitante`];
          const tieneResultado = rLocal !== undefined;
          const puntosObtenidos = calcPuntosPartido(partido.id);
          const miPredL = predicciones[`${partido.id}_local`];
          const miPredV = predicciones[`${partido.id}_visitante`];
          const [predLocal, setPredLocal] = useState(miPredL !== undefined ? String(miPredL) : "");
          const [predVisitante, setPredVisitante] = useState(miPredV !== undefined ? String(miPredV) : "");

          return (
            <PartidoCard
              key={partido.id}
              partido={partido}
              bloqueado={bloqueado}
              rLocal={rLocal}
              rVisitante={rVisitante}
              tieneResultado={tieneResultado}
              puntosObtenidos={puntosObtenidos}
              miPredL={miPredL}
              miPredV={miPredV}
              guardando={guardando[partido.id]}
              onGuardar={(l, v) => guardarPrediccion(partido.id, l, v)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PartidoCard({ partido, bloqueado, rLocal, rVisitante, tieneResultado, puntosObtenidos, miPredL, miPredV, guardando, onGuardar }) {
  const [l, setL] = useState(miPredL !== undefined ? String(miPredL) : "");
  const [v, setV] = useState(miPredV !== undefined ? String(miPredV) : "");

  const fecha = new Date(partido.fecha);
  const fechaTexto = fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`partido-card ${bloqueado ? "bloqueado" : ""} ${tieneResultado ? "con-resultado" : ""}`}>
      <div className="partido-grupo-badge">GRP {partido.grupo}</div>
      <div className="fecha-partido">📅 {fechaTexto} · {partido.estadio}</div>

      <div className="partido-equipos">
        <div className="equipo">
          <div className="equipo-bandera">{flag(partido.local)}</div>
          <div className="equipo-nombre">{partido.local}</div>
        </div>
        <div className="vs">VS</div>
        <div className="equipo">
          <div className="equipo-bandera">{flag(partido.visitante)}</div>
          <div className="equipo-nombre">{partido.visitante}</div>
        </div>
      </div>

      {tieneResultado && (
        <div className="resultado-real">{rLocal} — {rVisitante}</div>
      )}

      {!bloqueado && (
        <div>
          <div style={{ fontSize: 12, color: "var(--texto2)", textAlign: "center", marginBottom: 6 }}>
            {miPredL !== undefined ? "Tu predicción actual:" : "Ingresa tu predicción:"}
          </div>
          <div className="pred-inputs">
            <input
              className="pred-input"
              type="number" min="0" max="99"
              placeholder="0" value={l}
              onChange={e => setL(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            />
            <div className="pred-guion">-</div>
            <input
              className="pred-input"
              type="number" min="0" max="99"
              placeholder="0" value={v}
              onChange={e => setV(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
            />
          </div>
          <button
            className="btn btn-primary btn-bloque"
            onClick={() => onGuardar(l, v)}
            disabled={l === "" || v === "" || guardando}
            style={{ fontSize: 14, padding: "12px" }}
          >
            {guardando ? "Guardando..." : miPredL !== undefined ? "✏️ Actualizar predicción" : "✅ Guardar predicción"}
          </button>
        </div>
      )}

      {bloqueado && (
        <div>
          {miPredL !== undefined ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "var(--texto2)", marginBottom: 4 }}>Tu predicción:</div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: puntosObtenidos !== null ? "var(--dorado)" : "white" }}>
                {miPredL} — {miPredV}
              </div>
            </div>
          ) : (
            <div className="lock-aviso">🔒 Predicciones cerradas para este partido</div>
          )}
        </div>
      )}

      {puntosObtenidos !== null && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span className="mis-puntos-badge">⭐ {puntosObtenidos} puntos</span>
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA TABLA ─────────────────────────────────────────────────────
function PaginaTabla({ usuario, ligaActual, mostrarToast }) {
  const [tabla, setTabla] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!ligaActual) return;
    setCargando(true);

    const unsub = onSnapshot(doc(db, "resultados", ligaActual.id), async (resSnap) => {
      const resultados = resSnap.exists() ? resSnap.data() : {};
      const ligaDoc = await getDoc(doc(db, "ligas", ligaActual.id));
      const ligaData = ligaDoc.data();
      const miembros = ligaData?.miembros || [];
      const miembrosInfo = ligaData?.miembrosInfo || {};

      const tablaData = await Promise.all(miembros.map(async (uid) => {
        const predSnap = await getDoc(doc(db, "predicciones", `${ligaActual.id}_${uid}`));
        const pred = predSnap.exists() ? predSnap.data() : {};

        let totalPuntos = 0;
        let partidosJugados = 0;

        PARTIDOS_GRUPOS.forEach(partido => {
          const rL = resultados[`${partido.id}_local`];
          const rV = resultados[`${partido.id}_visitante`];
          const pL = pred[`${partido.id}_local`];
          const pV = pred[`${partido.id}_visitante`];
          if (rL !== undefined && pL !== undefined) {
            totalPuntos += calcularPuntos({ local: pL, visitante: pV }, { local: rL, visitante: rV });
            partidosJugados++;
          }
        });

        // Bonus: clasificaciones
        const clasificaciones = resultados.clasificaciones || {};
        Object.entries(clasificaciones).forEach(([clave, clasificado]) => {
          const predClasificado = pred[`clasificacion_${clave}`];
          if (predClasificado && predClasificado === clasificado) totalPuntos += 4;
        });

        return {
          uid,
          nombre: miembrosInfo[uid]?.nombre || "Jugador",
          foto: miembrosInfo[uid]?.foto,
          puntos: totalPuntos,
          partidosJugados,
          esYo: uid === usuario.uid
        };
      }));

      tablaData.sort((a, b) => b.puntos - a.puntos || b.partidosJugados - a.partidosJugados);
      setTabla(tablaData);
      setCargando(false);
    });

    return unsub;
  }, [ligaActual, usuario.uid]);

  if (!ligaActual) return (
    <div className="empty-state">
      <div className="empty-estado-icono">📊</div>
      <div className="empty-estado-titulo">Selecciona una liga</div>
      <div className="empty-estado-texto">Ve a la sección Ligas y elige una para ver la tabla de posiciones.</div>
    </div>
  );

  if (cargando) return <div className="loader"><div className="spinner"></div>Calculando posiciones...</div>;

  const clasePos = (i) => i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : "";
  const medallaPos = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";

  return (
    <div>
      <div style={{ padding: "12px 16px 12px" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>📊 Tabla de Posiciones</div>
        <div style={{ fontSize: 13, color: "var(--texto2)" }}>{ligaActual.nombre} · {tabla.length} participantes</div>
      </div>

      <div className="tabla-posiciones">
        <div className="tabla-header">
          <div>#</div><div>Jugador</div><div style={{ textAlign: "center" }}>Partidos</div><div style={{ textAlign: "right" }}>Pts</div>
        </div>
        {tabla.map((jugador, i) => (
          <div key={jugador.uid} className={`tabla-fila ${jugador.esYo ? "yo" : ""}`}>
            <div className={`tabla-pos ${clasePos(i)}`}>{medallaPos(i) || i + 1}</div>
            <div className="tabla-usuario">
              {jugador.esYo ? <span style={{ color: "var(--verde)" }}>👤 Tú</span> : jugador.nombre}
            </div>
            <div className="tabla-partidos">{jugador.partidosJugados}</div>
            <div className="tabla-puntos">{jugador.puntos}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div className="card">
          <div className="card-titulo">📋 Sistema de puntos</div>
          <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["🎯 Marcador exacto", "6 pts"],
              ["✅ Ganador correcto", "3 pts"],
              ["⚽ Goles del ganador exactos", "2 pts"],
              ["🏅 Clasificado a siguiente ronda", "4 pts"],
              ["🏆 Campeón del Mundial", "10 pts"],
            ].map(([desc, pts]) => (
              <div key={desc} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--texto2)" }}>{desc}</span>
                <span style={{ fontWeight: 800, color: "var(--dorado)" }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA ADMIN ─────────────────────────────────────────────────────
function PaginaAdmin({ usuario, ligaActual, mostrarToast }) {
  const [grupoActivo, setGrupoActivo] = useState("A");
  const [resultados, setResultados] = useState({});
  const [guardando, setGuardando] = useState({});

  useEffect(() => {
    if (!ligaActual) return;
    const unsub = onSnapshot(doc(db, "resultados", ligaActual.id), (snap) => {
      if (snap.exists()) setResultados(snap.data());
    });
    return unsub;
  }, [ligaActual]);

  if (!ligaActual || ligaActual.adminId !== usuario.uid) return (
    <div className="empty-state">
      <div className="empty-estado-icono">🔒</div>
      <div className="empty-estado-titulo">Acceso restringido</div>
      <div className="empty-estado-texto">Solo el administrador de la liga puede acceder a este panel.</div>
    </div>
  );

  const guardarResultado = async (partidoId, local, visitante) => {
    if (local === "" || visitante === "") return;
    setGuardando(g => ({ ...g, [partidoId]: true }));
    try {
      await setDoc(doc(db, "resultados", ligaActual.id), {
        [`${partidoId}_local`]: parseInt(local),
        [`${partidoId}_visitante`]: parseInt(visitante),
        [`${partidoId}_ts`]: new Date().toISOString()
      }, { merge: true });
      mostrarToast("✅ Resultado guardado");
    } catch (e) { mostrarToast("Error al guardar", "error"); }
    setGuardando(g => ({ ...g, [partidoId]: false }));
  };

  const partidosGrupo = PARTIDOS_GRUPOS.filter(p => p.grupo === grupoActivo);

  return (
    <div className="admin-panel">
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>⚙️ Panel de Administrador</div>
      <div style={{ fontSize: 13, color: "var(--texto2)", marginBottom: 16 }}>Ingresa los resultados de cada partido</div>

      <div className="tabs">
        {Object.keys(GRUPOS).map(g => (
          <button key={g} className={`tab ${grupoActivo === g ? "activo" : ""}`} onClick={() => setGrupoActivo(g)}>
            Grupo {g}
          </button>
        ))}
      </div>

      {partidosGrupo.map(partido => {
        const [l, setL] = useState(resultados[`${partido.id}_local`] !== undefined ? String(resultados[`${partido.id}_local`]) : "");
        const [v, setV] = useState(resultados[`${partido.id}_visitante`] !== undefined ? String(resultados[`${partido.id}_visitante`]) : "");
        const tieneRes = resultados[`${partido.id}_local`] !== undefined;

        return (
          <div key={partido.id} className="card" style={{ marginLeft: 0, marginRight: 0 }}>
            <div style={{ fontSize: 12, color: "var(--texto2)", marginBottom: 8 }}>
              📅 {new Date(partido.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{flag(partido.local)} {partido.local}</div>
              <div style={{ fontWeight: 800, color: "var(--texto2)" }}>vs</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{partido.visitante} {flag(partido.visitante)}</div>
            </div>
            <div className="resultado-form">
              <input type="number" min="0" max="99" placeholder="0" value={l} onChange={e => setL(e.target.value.slice(0, 2))} />
              <div className="resultado-guion">-</div>
              <input type="number" min="0" max="99" placeholder="0" value={v} onChange={e => setV(e.target.value.slice(0, 2))} />
            </div>
            <button
              className={`btn ${tieneRes ? "btn-secundario" : "btn-primary"} btn-bloque`}
              onClick={() => guardarResultado(partido.id, l, v)}
              disabled={l === "" || v === "" || guardando[partido.id]}
              style={{ fontSize: 14 }}
            >
              {guardando[partido.id] ? "Guardando..." : tieneRes ? "✏️ Actualizar resultado" : "✅ Guardar resultado"}
            </button>
            {tieneRes && (
              <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: "var(--verde)" }}>
                Resultado actual: {resultados[`${partido.id}_local`]} - {resultados[`${partido.id}_visitante`]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
