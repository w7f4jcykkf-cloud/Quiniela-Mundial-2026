import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, doc, setDoc, getDoc, collection,
  query, where, onSnapshot, serverTimestamp, getDocs, arrayUnion
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail
} from "firebase/auth";

// ════════════════════════════════════════════════════════
// CONFIGURACIÓN FIREBASE — reemplaza con los de tu proyecto
// ════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDjhWz5x74kjOf3EKyf_MHX66Tc7UCd_PM",
  authDomain: "quiniela-mundial-2026-eb9a4.firebaseapp.com",
  projectId: "quiniela-mundial-2026-eb9a4",
  storageBucket: "quiniela-mundial-2026-eb9a4.firebasestorage.app",
  messagingSenderId: "641374842959",
  appId: "1:641374842959:web:f56dc93021e6b0bb9fba3a"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);
const gp   = new GoogleAuthProvider();

// ════════════════════════════════════════════════════════
// SUPER ADMIN — único que puede crear ligas
// Reemplaza con tu UID de Firebase Authentication
// ════════════════════════════════════════════════════════
const SUPER_ADMIN_UID = "TU_UID_AQUI";

// ════════════════════════════════════════════════════════
// GRUPOS OFICIALES MUNDIAL 2026
// ════════════════════════════════════════════════════════
const GRUPOS = {
  A: ["México","Sudáfrica","Corea del Sur","Chequia"],
  B: ["Canadá","Bosnia y Herzegovina","Qatar","Suiza"],
  C: ["Brasil","Marruecos","Haití","Escocia"],
  D: ["Estados Unidos","Paraguay","Australia","Turquía"],
  E: ["Alemania","Curazao","Costa de Marfil","Ecuador"],
  F: ["Países Bajos","Japón","Túnez","Suecia"],
  G: ["Bélgica","Egipto","Irán","Nueva Zelanda"],
  H: ["España","Cabo Verde","Arabia Saudita","Uruguay"],
  I: ["Francia","Senegal","Noruega","Iraq"],
  J: ["Argentina","Argelia","Austria","Jordania"],
  K: ["Portugal","DR Congo","Uzbekistán","Colombia"],
  L: ["Inglaterra","Croacia","Ghana","Panamá"],
};

const TODOS = Object.values(GRUPOS).flat().sort();

// Rondas eliminatorias (R32 = Dieciseisavos)
const RONDAS = [
  {id:"r32",nombre:"Ronda de 32",    partidos:16,pts:4 },
  {id:"r16",nombre:"Octavos de Final",partidos:8, pts:4 },
  {id:"qf", nombre:"Cuartos de Final",partidos:4, pts:4 },
  {id:"sf", nombre:"Semifinales",     partidos:2, pts:4 },
  {id:"fin",nombre:"Gran Final",      partidos:1, pts:10},
];

// ════════════════════════════════════════════════════════
// PARTIDOS FASE DE GRUPOS — Calendario oficial FIFA 2026
// Horarios en hora de México (CDT = ET-1h)
// ════════════════════════════════════════════════════════
const PG = [
  // 11 junio
  {id:"A1",g:"A",l:"México",          v:"Sudáfrica",         f:"2026-06-11T14:00:00-06:00",e:"Estadio Azteca, Cdad. México"},
  {id:"A2",g:"A",l:"Corea del Sur",   v:"Chequia",           f:"2026-06-11T21:00:00-06:00",e:"Estadio Akron, Guadalajara"},
  // 12 junio
  {id:"B1",g:"B",l:"Canadá",          v:"Bosnia y Herzegovina",f:"2026-06-12T14:00:00-06:00",e:"BMO Field, Toronto"},
  {id:"D1",g:"D",l:"Estados Unidos",  v:"Paraguay",          f:"2026-06-12T20:00:00-06:00",e:"SoFi Stadium, Los Ángeles"},
  // 13 junio
  {id:"C1",g:"C",l:"Brasil",          v:"Marruecos",         f:"2026-06-13T17:00:00-06:00",e:"MetLife Stadium, Nueva York"},
  {id:"C2",g:"C",l:"Haití",           v:"Escocia",           f:"2026-06-13T20:00:00-06:00",e:"Gillette Stadium, Boston"},
  {id:"B2",g:"B",l:"Qatar",           v:"Suiza",             f:"2026-06-13T14:00:00-06:00",e:"Levi's Stadium, San Francisco"},
  // 14 junio
  {id:"D2",g:"D",l:"Australia",       v:"Turquía",           f:"2026-06-13T23:00:00-06:00",e:"BC Place, Vancouver"},
  {id:"E1",g:"E",l:"Alemania",        v:"Curazao",           f:"2026-06-14T12:00:00-06:00",e:"NRG Stadium, Houston"},
  {id:"F1",g:"F",l:"Países Bajos",    v:"Japón",             f:"2026-06-14T15:00:00-06:00",e:"AT&T Stadium, Dallas"},
  {id:"E2",g:"E",l:"Costa de Marfil", v:"Ecuador",           f:"2026-06-14T18:00:00-06:00",e:"Lincoln Financial Field, Filadelfia"},
  {id:"F2",g:"F",l:"Suecia",          v:"Túnez",             f:"2026-06-14T21:00:00-06:00",e:"Estadio BBVA, Monterrey"},
  // 15 junio
  {id:"H1",g:"H",l:"España",          v:"Cabo Verde",        f:"2026-06-15T11:00:00-06:00",e:"Mercedes-Benz Stadium, Atlanta"},
  {id:"G1",g:"G",l:"Bélgica",         v:"Egipto",            f:"2026-06-15T14:00:00-06:00",e:"Lumen Field, Seattle"},
  {id:"H2",g:"H",l:"Arabia Saudita",  v:"Uruguay",           f:"2026-06-15T17:00:00-06:00",e:"Hard Rock Stadium, Miami"},
  {id:"G2",g:"G",l:"Irán",            v:"Nueva Zelanda",     f:"2026-06-15T20:00:00-06:00",e:"SoFi Stadium, Los Ángeles"},
  // 16 junio
  {id:"I1",g:"I",l:"Francia",         v:"Senegal",           f:"2026-06-16T14:00:00-06:00",e:"MetLife Stadium, Nueva York"},
  {id:"I2",g:"I",l:"Iraq",            v:"Noruega",           f:"2026-06-16T17:00:00-06:00",e:"Gillette Stadium, Boston"},
  {id:"J1",g:"J",l:"Argentina",       v:"Argelia",           f:"2026-06-16T20:00:00-06:00",e:"Arrowhead Stadium, Kansas City"},
  // 17 junio
  {id:"J2",g:"J",l:"Austria",         v:"Jordania",          f:"2026-06-16T23:00:00-06:00",e:"Levi's Stadium, San Francisco"},
  {id:"L1",g:"L",l:"Ghana",           v:"Panamá",            f:"2026-06-17T18:00:00-06:00",e:"BMO Field, Toronto"},
  {id:"L2",g:"L",l:"Inglaterra",      v:"Croacia",           f:"2026-06-17T15:00:00-06:00",e:"AT&T Stadium, Dallas"},
  {id:"K1",g:"K",l:"Portugal",        v:"DR Congo",          f:"2026-06-17T12:00:00-06:00",e:"NRG Stadium, Houston"},
  {id:"K2",g:"K",l:"Uzbekistán",      v:"Colombia",          f:"2026-06-17T21:00:00-06:00",e:"Estadio Azteca, Cdad. México"},
  // 18 junio
  {id:"A3",g:"A",l:"Chequia",         v:"Sudáfrica",         f:"2026-06-18T11:00:00-06:00",e:"Mercedes-Benz Stadium, Atlanta"},
  {id:"B3",g:"B",l:"Suiza",           v:"Bosnia y Herzegovina",f:"2026-06-18T14:00:00-06:00",e:"SoFi Stadium, Los Ángeles"},
  {id:"B4",g:"B",l:"Canadá",          v:"Qatar",             f:"2026-06-18T17:00:00-06:00",e:"BC Place, Vancouver"},
  {id:"A4",g:"A",l:"México",          v:"Corea del Sur",     f:"2026-06-18T20:00:00-06:00",e:"Estadio Akron, Guadalajara"},
  // 19 junio
  {id:"C3",g:"C",l:"Brasil",          v:"Haití",             f:"2026-06-19T19:30:00-06:00",e:"Lincoln Financial Field, Filadelfia"},
  {id:"C4",g:"C",l:"Escocia",         v:"Marruecos",         f:"2026-06-19T17:00:00-06:00",e:"Gillette Stadium, Boston"},
  {id:"D3",g:"D",l:"Turquía",         v:"Paraguay",          f:"2026-06-19T22:00:00-06:00",e:"Levi's Stadium, San Francisco"},
  {id:"D4",g:"D",l:"Estados Unidos",  v:"Australia",         f:"2026-06-19T14:00:00-06:00",e:"Lumen Field, Seattle"},
  // 20 junio
  {id:"E3",g:"E",l:"Alemania",        v:"Costa de Marfil",   f:"2026-06-20T15:00:00-06:00",e:"BMO Field, Toronto"},
  {id:"E4",g:"E",l:"Ecuador",         v:"Curazao",           f:"2026-06-20T19:00:00-06:00",e:"Arrowhead Stadium, Kansas City"},
  {id:"F3",g:"F",l:"Países Bajos",    v:"Suecia",            f:"2026-06-20T12:00:00-06:00",e:"NRG Stadium, Houston"},
  // 21 junio
  {id:"F4",g:"F",l:"Túnez",           v:"Japón",             f:"2026-06-20T23:00:00-06:00",e:"Estadio BBVA, Monterrey"},
  {id:"H3",g:"H",l:"Uruguay",         v:"Cabo Verde",        f:"2026-06-21T17:00:00-06:00",e:"Hard Rock Stadium, Miami"},
  {id:"H4",g:"H",l:"España",          v:"Arabia Saudita",    f:"2026-06-21T11:00:00-06:00",e:"Mercedes-Benz Stadium, Atlanta"},
  {id:"G3",g:"G",l:"Bélgica",         v:"Irán",              f:"2026-06-21T14:00:00-06:00",e:"SoFi Stadium, Los Ángeles"},
  {id:"G4",g:"G",l:"Nueva Zelanda",   v:"Egipto",            f:"2026-06-21T20:00:00-06:00",e:"BC Place, Vancouver"},
  // 22 junio
  {id:"I3",g:"I",l:"Noruega",         v:"Senegal",           f:"2026-06-22T19:00:00-06:00",e:"MetLife Stadium, Nueva York"},
  {id:"I4",g:"I",l:"Francia",         v:"Iraq",              f:"2026-06-22T16:00:00-06:00",e:"Lincoln Financial Field, Filadelfia"},
  {id:"J3",g:"J",l:"Argentina",       v:"Austria",           f:"2026-06-22T12:00:00-06:00",e:"AT&T Stadium, Dallas"},
  {id:"J4",g:"J",l:"Jordania",        v:"Argelia",           f:"2026-06-22T22:00:00-06:00",e:"Levi's Stadium, San Francisco"},
  // 23 junio
  {id:"L3",g:"L",l:"Inglaterra",      v:"Ghana",             f:"2026-06-23T15:00:00-06:00",e:"Gillette Stadium, Boston"},
  {id:"L4",g:"L",l:"Panamá",          v:"Croacia",           f:"2026-06-23T18:00:00-06:00",e:"BMO Field, Toronto"},
  {id:"K3",g:"K",l:"Portugal",        v:"Uzbekistán",        f:"2026-06-23T12:00:00-06:00",e:"NRG Stadium, Houston"},
  {id:"K4",g:"K",l:"Colombia",        v:"DR Congo",          f:"2026-06-23T21:00:00-06:00",e:"Estadio Akron, Guadalajara"},
  // 24 junio — Jornada 3 simultánea
  {id:"C5",g:"C",l:"Escocia",         v:"Brasil",            f:"2026-06-24T17:00:00-06:00",e:"Hard Rock Stadium, Miami"},
  {id:"C6",g:"C",l:"Marruecos",       v:"Haití",             f:"2026-06-24T17:00:00-06:00",e:"Mercedes-Benz Stadium, Atlanta"},
  {id:"B5",g:"B",l:"Suiza",           v:"Canadá",            f:"2026-06-24T14:00:00-06:00",e:"BC Place, Vancouver"},
  {id:"B6",g:"B",l:"Bosnia y Herzegovina",v:"Qatar",         f:"2026-06-24T14:00:00-06:00",e:"Lumen Field, Seattle"},
  {id:"A5",g:"A",l:"Chequia",         v:"México",            f:"2026-06-24T20:00:00-06:00",e:"Estadio Azteca, Cdad. México"},
  {id:"A6",g:"A",l:"Sudáfrica",       v:"Corea del Sur",     f:"2026-06-24T20:00:00-06:00",e:"Estadio BBVA, Monterrey"},
  // 25 junio
  {id:"E5",g:"E",l:"Curazao",         v:"Costa de Marfil",   f:"2026-06-25T15:00:00-06:00",e:"Lincoln Financial Field, Filadelfia"},
  {id:"E6",g:"E",l:"Ecuador",         v:"Alemania",          f:"2026-06-25T15:00:00-06:00",e:"MetLife Stadium, Nueva York"},
  {id:"F5",g:"F",l:"Japón",           v:"Suecia",            f:"2026-06-25T18:00:00-06:00",e:"AT&T Stadium, Dallas"},
  {id:"F6",g:"F",l:"Túnez",           v:"Países Bajos",      f:"2026-06-25T18:00:00-06:00",e:"Arrowhead Stadium, Kansas City"},
  {id:"D5",g:"D",l:"Turquía",         v:"Estados Unidos",    f:"2026-06-25T21:00:00-06:00",e:"SoFi Stadium, Los Ángeles"},
  {id:"D6",g:"D",l:"Paraguay",        v:"Australia",         f:"2026-06-25T21:00:00-06:00",e:"Levi's Stadium, San Francisco"},
  // 26 junio
  {id:"I5",g:"I",l:"Noruega",         v:"Francia",           f:"2026-06-26T14:00:00-06:00",e:"Gillette Stadium, Boston"},
  {id:"I6",g:"I",l:"Senegal",         v:"Iraq",              f:"2026-06-26T14:00:00-06:00",e:"BMO Field, Toronto"},
  {id:"G5",g:"G",l:"Egipto",          v:"Irán",              f:"2026-06-26T22:00:00-06:00",e:"Lumen Field, Seattle"},
  {id:"G6",g:"G",l:"Nueva Zelanda",   v:"Bélgica",           f:"2026-06-26T22:00:00-06:00",e:"BC Place, Vancouver"},
  {id:"H5",g:"H",l:"Cabo Verde",      v:"Arabia Saudita",    f:"2026-06-26T19:00:00-06:00",e:"NRG Stadium, Houston"},
  {id:"H6",g:"H",l:"Uruguay",         v:"España",            f:"2026-06-26T19:00:00-06:00",e:"Estadio Akron, Guadalajara"},
  // 27 junio
  {id:"L5",g:"L",l:"Panamá",          v:"Inglaterra",        f:"2026-06-27T16:00:00-06:00",e:"MetLife Stadium, Nueva York"},
  {id:"L6",g:"L",l:"Croacia",         v:"Ghana",             f:"2026-06-27T16:00:00-06:00",e:"Lincoln Financial Field, Filadelfia"},
  {id:"J5",g:"J",l:"Argelia",         v:"Austria",           f:"2026-06-27T21:00:00-06:00",e:"Arrowhead Stadium, Kansas City"},
  {id:"J6",g:"J",l:"Jordania",        v:"Argentina",         f:"2026-06-27T21:00:00-06:00",e:"AT&T Stadium, Dallas"},
  {id:"K5",g:"K",l:"Colombia",        v:"Portugal",          f:"2026-06-27T18:30:00-06:00",e:"Hard Rock Stadium, Miami"},
  {id:"K6",g:"K",l:"DR Congo",        v:"Uzbekistán",        f:"2026-06-27T18:30:00-06:00",e:"Mercedes-Benz Stadium, Atlanta"},
];

// Cierre predicción campeón: cuando empieza la Ronda de 32
// Cierre campeón: 1 hora antes del primer partido del Mundial
const CIERRE_CAMPEON = "2026-06-11T13:00:00-06:00"; // 1h antes de México vs Sudáfrica

// ════════════════════════════════════════════════════════
// BANDERAS
// ════════════════════════════════════════════════════════
const BND = {
  "México":"🇲🇽","Sudáfrica":"🇿🇦","Corea del Sur":"🇰🇷","Chequia":"🇨🇿",
  "Canadá":"🇨🇦","Bosnia y Herzegovina":"🇧🇦","Qatar":"🇶🇦","Suiza":"🇨🇭",
  "Brasil":"🇧🇷","Marruecos":"🇲🇦","Haití":"🇭🇹","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turquía":"🇹🇷",
  "Alemania":"🇩🇪","Curazao":"🇨🇼","Costa de Marfil":"🇨🇮","Ecuador":"🇪🇨",
  "Países Bajos":"🇳🇱","Japón":"🇯🇵","Túnez":"🇹🇳","Suecia":"🇸🇪",
  "Bélgica":"🇧🇪","Egipto":"🇪🇬","Irán":"🇮🇷","Nueva Zelanda":"🇳🇿",
  "España":"🇪🇸","Cabo Verde":"🇨🇻","Arabia Saudita":"🇸🇦","Uruguay":"🇺🇾",
  "Francia":"🇫🇷","Senegal":"🇸🇳","Noruega":"🇳🇴","Iraq":"🇮🇶",
  "Argentina":"🇦🇷","Argelia":"🇩🇿","Austria":"🇦🇹","Jordania":"🇯🇴",
  "Portugal":"🇵🇹","DR Congo":"🇨🇩","Uzbekistán":"🇺🇿","Colombia":"🇨🇴",
  "Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croacia":"🇭🇷","Ghana":"🇬🇭","Panamá":"🇵🇦",
};
const F = e => BND[e]||"🏳️";

// ════════════════════════════════════════════════════════
// LÓGICA DE PUNTOS
// ════════════════════════════════════════════════════════
function calcPuntos(pred,res){
  const{l:pL,v:pV}=pred,{l:rL,v:rV}=res;
  if(pL===rL&&pV===rV)return 6;
  const gr=rL>rV?"l":rV>rL?"v":"e",gp=pL>pV?"l":pV>pL?"v":"e";
  let ex=false;
  if(gr==="l"&&pL===rL)ex=true;
  if(gr==="v"&&pV===rV)ex=true;
  if(gr==="e"&&(pL===rL||pV===rV))ex=true;
  if(ex)return 2;
  if(gp===gr)return 3;
  return 0;
}
const bloq=f=>new Date()>=new Date(new Date(f).getTime()-3600000);
const campBloq=()=>new Date()>=new Date(CIERRE_CAMPEON);
const genCod=()=>{const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join("");};

// ════════════════════════════════════════════════════════
// ESTILOS
// ════════════════════════════════════════════════════════
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--v:#00C853;--vo:#007E33;--d:#FFD700;--r:#D32F2F;--m:#7C3AED;--f0:#0a0a0a;--f1:#111;--f2:#1a1a1a;--t:#f0f0f0;--t2:#aaa;--b:#2a2a2a;--rad:16px}
body{font-family:'Nunito',sans-serif;background:var(--f0);color:var(--t);min-height:100vh;overscroll-behavior:none}
h1,h2{font-family:'Bebas Neue',sans-serif;letter-spacing:2px}
.app{max-width:480px;margin:0 auto;padding:0 0 100px;min-height:100vh}
.hdr{background:linear-gradient(135deg,#004D00,#006400,#004D00);padding:18px 16px 14px;position:sticky;top:0;z-index:100;border-bottom:3px solid var(--d)}
.hdr-t{display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:26px;color:var(--d);line-height:1}
.hdr p{font-size:11px;color:rgba(255,255,255,.7);margin-top:2px}
.av{width:38px;height:38px;border-radius:50%;border:2px solid var(--d);object-fit:cover;cursor:pointer}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#111;border-top:1px solid var(--b);display:flex;padding:8px 0 20px;z-index:100}
.nb{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;color:var(--t2);cursor:pointer;font-family:'Nunito';font-size:10px;font-weight:700;padding:6px 0;transition:color .2s}
.nb.on{color:var(--v)}
.nb span:first-child{font-size:20px}
.ls{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;gap:20px;background:radial-gradient(ellipse at top,#003300,var(--f0) 70%)}
.ll{font-family:'Bebas Neue';font-size:68px;color:var(--d);text-align:center;line-height:.9}
.lsb{font-size:15px;color:rgba(255,255,255,.6);text-align:center}
.lc{background:var(--f1);border:1px solid var(--b);border-radius:24px;padding:28px 20px;text-align:center;width:100%;max-width:360px}
.lc h2{font-size:26px;color:var(--v);margin-bottom:6px}
.lc p{color:var(--t2);font-size:13px;margin-bottom:18px;line-height:1.5}
.gg{width:100%;padding:15px;border-radius:14px;border:none;cursor:pointer;background:white;color:#333;font-family:'Nunito';font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.4);transition:transform .1s}
.gg:hover{transform:translateY(-1px)}
.gg img{width:22px}
.dv{display:flex;align-items:center;gap:8px;margin:10px 0}
.dv hr{flex:1;border:none;border-top:1px solid var(--b)}
.dv span{color:var(--t2);font-size:12px}
.btn{padding:13px 22px;border-radius:14px;border:none;cursor:pointer;font-family:'Nunito';font-size:15px;font-weight:800;transition:transform .1s,filter .2s;display:inline-flex;align-items:center;gap:8px}
.btn:active{transform:scale(.97)}
.bp{background:var(--v);color:#000}.bp:hover{filter:brightness(1.1)}
.bs{background:var(--f2);color:var(--t);border:1px solid var(--b)}
.bd{background:var(--d);color:#000}
.br2{background:var(--r);color:#fff}
.bm{background:var(--m);color:#fff}
.bw{width:100%;justify-content:center}
.card{background:var(--f1);border:1px solid var(--b);border-radius:var(--rad);padding:16px;margin:10px 16px}
.ctit{font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
.sec{padding:16px}
.st{font-family:'Bebas Neue';font-size:22px;color:var(--d);margin-bottom:4px}
.ss{font-size:13px;color:var(--t2);margin-bottom:14px}
.fi{background:var(--f1);border:1px solid var(--b);border-radius:var(--rad);padding:15px;margin-bottom:10px;cursor:pointer;transition:border-color .2s,transform .1s}
.fi:hover{border-color:var(--v);transform:translateY(-1px)}
.fi.on{border-color:var(--v);background:#0a1f0a}
.fn{font-size:17px;font-weight:800}
.fc{font-size:11px;color:var(--t2);margin-top:3px;font-family:monospace;letter-spacing:2px}
.fm{font-size:12px;color:var(--v);margin-top:3px;font-weight:700}
.fg{margin-bottom:14px}
.fl{font-size:12px;font-weight:700;color:var(--t2);margin-bottom:5px;display:block;text-transform:uppercase;letter-spacing:.5px}
.fi2{width:100%;padding:13px 15px;border-radius:12px;background:var(--f2);border:1px solid var(--b);color:var(--t);font-family:'Nunito';font-size:15px;font-weight:700;outline:none;transition:border-color .2s}
.fi2:focus{border-color:var(--v)}
.fi2.cod{letter-spacing:4px;text-transform:uppercase;font-size:18px;text-align:center}
.pc{background:var(--f1);border:1px solid var(--b);border-radius:var(--rad);padding:15px;margin-bottom:10px;position:relative;overflow:hidden}
.pc.lok{opacity:.75}
.pc.res{border-color:#1a3a1a}
.pb{position:absolute;top:10px;right:10px;background:var(--vo);color:var(--d);font-size:10px;font-weight:900;padding:2px 7px;border-radius:20px;letter-spacing:1px}
.peq{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;margin-bottom:10px}
.pe{display:flex;flex-direction:column;align-items:center;gap:3px}
.pef{font-size:34px}
.pen{font-size:10px;font-weight:700;text-align:center;line-height:1.2}
.vs{font-family:'Bebas Neue';font-size:20px;color:var(--t2)}
.rr{text-align:center;margin-bottom:10px;font-family:'Bebas Neue';font-size:34px;color:var(--d);letter-spacing:4px}
.pi{display:grid;grid-template-columns:1fr 28px 1fr;gap:7px;align-items:center;margin-bottom:7px}
.pinp{background:var(--f2);border:2px solid var(--b);border-radius:11px;color:var(--t);font-family:'Bebas Neue';font-size:30px;text-align:center;padding:7px 4px;width:100%;outline:none;transition:border-color .2s}
.pinp:focus{border-color:var(--v)}
.pg{font-family:'Bebas Neue';font-size:26px;color:var(--t2);text-align:center}
.ppb{display:inline-flex;align-items:center;gap:5px;background:#1a3a1a;border:1px solid var(--v);border-radius:20px;padding:4px 10px;font-size:12px;font-weight:700;color:var(--v)}
.lav{font-size:11px;color:var(--r);text-align:center;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;margin-top:5px}
.fp{font-size:11px;color:var(--t2);text-align:center;margin-bottom:7px}
.ep{background:var(--f1);border:1px solid var(--b);border-radius:var(--rad);padding:15px;margin-bottom:10px}
.ep.res{border-color:#3a1a4a}
.eo{display:flex;align-items:center;gap:10px;padding:13px 14px;border-radius:12px;border:2px solid var(--b);background:var(--f2);cursor:pointer;margin-bottom:7px;transition:all .2s;font-weight:700;font-size:14px}
.eo:hover{border-color:var(--m)}
.eo.sel{border-color:var(--m);background:#1a0a2a}
.eo.gan{border-color:var(--d);background:#2a1a00}
.eo.ok{border-color:var(--v);background:#0a1f0a}
.eo.fail{border-color:var(--r);background:#1f0a0a;opacity:.7}
.rhdr{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(90deg,#1a0a2a,var(--f1));border-radius:12px;margin-bottom:10px;border:1px solid #3a1a4a}
.rhdr h3{font-family:'Bebas Neue';font-size:19px;color:#c084fc}
.cc{background:linear-gradient(135deg,#1a1000,#2a2000);border:2px solid var(--d);border-radius:var(--rad);padding:20px;margin-bottom:12px;text-align:center}
.ct{font-family:'Bebas Neue';font-size:28px;color:var(--d);margin-bottom:4px}
.csb{font-size:13px;color:var(--t2);margin-bottom:16px;line-height:1.5}
.cs{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:2px solid var(--b);background:var(--f2);cursor:pointer;margin-bottom:8px;transition:all .2s;font-weight:700;font-size:14px;text-align:left}
.cs:hover{border-color:var(--d)}
.cs.el{border-color:var(--d);background:#2a1a00}
.cs.ok{border-color:var(--v);background:#0a1f0a}
.cs.fail{border-color:var(--r);background:#1f0a0a;opacity:.7}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:400px;overflow-y:auto;margin-bottom:12px}
.tp{border-radius:var(--rad);overflow:hidden;margin:0 16px}
.th{display:grid;grid-template-columns:40px 1fr 55px 55px;padding:10px 14px;background:var(--vo);font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase}
.tr{display:grid;grid-template-columns:40px 1fr 55px 55px;padding:13px 14px;border-bottom:1px solid var(--b);background:var(--f1);align-items:center;transition:background .2s}
.tr:hover{background:var(--f2)}
.tr.yo{background:#0a1f0a}
.tpos{font-family:'Bebas Neue';font-size:20px;color:var(--t2)}
.tpos.p1{color:var(--d)}.tpos.p2{color:#aaa}.tpos.p3{color:#cd7f32}
.tnom{font-weight:800;font-size:14px}
.tpar{text-align:center;color:var(--t2);font-size:12px}
.tpts{text-align:right;font-family:'Bebas Neue';font-size:24px;color:var(--v)}
.tabs{display:flex;gap:7px;padding:0 16px;margin-bottom:14px;overflow-x:auto}
.tabs::-webkit-scrollbar{display:none}
.tab{padding:7px 14px;border-radius:20px;border:1px solid var(--b);background:var(--f1);color:var(--t2);cursor:pointer;white-space:nowrap;font-family:'Nunito';font-size:12px;font-weight:700;transition:all .2s}
.tab.on{background:var(--v);color:#000;border-color:var(--v)}
.tab.onm{background:var(--m);color:#fff;border-color:var(--m)}
.ftabs{display:flex;gap:0;margin:0 16px 14px;border-radius:12px;overflow:hidden;border:1px solid var(--b)}
.ftab{flex:1;padding:11px 6px;text-align:center;background:var(--f1);color:var(--t2);cursor:pointer;font-weight:800;font-size:12px;border:none;font-family:'Nunito';transition:all .2s}
.ftab.on{background:var(--v);color:#000}
.ftab.onm{background:var(--m);color:#fff}
.ftab.ond{background:var(--d);color:#000}
.ap{padding:16px}
.rf{display:grid;grid-template-columns:1fr 28px 1fr;gap:7px;align-items:center;margin:10px 0}
.rf input{background:var(--f2);border:2px solid var(--b);border-radius:11px;color:var(--t);font-family:'Bebas Neue';font-size:30px;text-align:center;padding:7px;outline:none;transition:border-color .2s}
.rf input:focus{border-color:var(--d)}
.rg{font-family:'Bebas Neue';font-size:26px;color:var(--t2);text-align:center}
.arc{background:linear-gradient(135deg,#1a0a2a,#2a1a3a);border:1px solid #4a2a6a;border-radius:var(--rad);padding:15px;margin-bottom:10px}
.arc h3{font-family:'Bebas Neue';font-size:19px;color:#c084fc;margin-bottom:3px}
.arc p{font-size:12px;color:var(--t2);margin-bottom:10px}
.sel2{width:100%;padding:11px 14px;border-radius:11px;background:var(--f2);border:2px solid var(--b);color:var(--t);font-family:'Nunito';font-size:14px;font-weight:700;outline:none;cursor:pointer}
.sel2:focus{border-color:var(--m)}
.mo{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:flex-end;justify-content:center;z-index:200}
.md{background:var(--f1);border-top-left-radius:28px;border-top-right-radius:28px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;border-top:3px solid var(--v)}
.mt2{font-size:22px;font-weight:900;margin-bottom:6px}
.ms{font-size:13px;color:var(--t2);margin-bottom:20px}
.cg{background:var(--f2);border:2px dashed var(--d);border-radius:14px;padding:18px;text-align:center;margin:14px 0}
.cgt{font-family:'Bebas Neue';font-size:44px;color:var(--d);letter-spacing:8px}
.empty{text-align:center;padding:44px 20px}
.ei{font-size:52px;margin-bottom:14px}
.et2{font-size:18px;font-weight:800;margin-bottom:7px}
.es{color:var(--t2);font-size:13px;line-height:1.6}
.ldr{text-align:center;padding:44px;color:var(--t2);font-size:13px}
.sp{width:38px;height:38px;border:3px solid var(--b);border-top-color:var(--v);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;top:76px;left:50%;transform:translateX(-50%);background:var(--vo);border:1px solid var(--v);border-radius:11px;padding:11px 22px;color:#fff;font-weight:700;font-size:13px;z-index:300;animation:tin .3s ease;white-space:nowrap}
.toast.err{background:#7f1d1d;border-color:var(--r)}
@keyframes tin{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.perfil{display:flex;align-items:center;gap:10px;background:var(--f1);border:1px solid var(--b);border-radius:14px;padding:12px 14px;margin-bottom:16px}
.pav{width:42px;height:42px;border-radius:50%;border:2px solid var(--v);object-fit:cover}
.pavl{width:42px;height:42px;border-radius:50%;background:var(--v);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#000}
@media(max-width:360px){.pef{font-size:28px}.pinp{font-size:24px}.ll{font-size:52px}}
`;

// ════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════
export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  const[page,setPage]=useState("ligas");
  const[liga,setLiga]=useState(null);
  const[toast,setToast]=useState(null);
  const[modal,setModal]=useState(null);

  const msg=useCallback((m,t="ok")=>{setToast({m,t});setTimeout(()=>setToast(null),2800);},[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async u=>{
      if(u){
        await setDoc(doc(db,"usuarios",u.uid),{
          nombre:u.displayName||u.email?.split("@")[0]||"Jugador",
          foto:u.photoURL||null,email:u.email,ts:serverTimestamp()
        },{merge:true});
        setUser(u);
      }else{setUser(null);setLiga(null);}
      setLoading(false);
    });
  },[]);

  const loginG=async()=>{try{await signInWithPopup(auth,gp);}catch{msg("No se pudo iniciar sesión con Google","err");}};
  const loginE=async(e,p)=>{try{await signInWithEmailAndPassword(auth,e,p);}catch(er){msg(er.code==="auth/invalid-credential"?"Correo o contraseña incorrectos":"Error al entrar","err");}};
  const reg=async(n,e,p)=>{try{const c=await createUserWithEmailAndPassword(auth,e,p);await updateProfile(c.user,{displayName:n});msg("¡Cuenta creada! 🎉");}catch(er){msg(er.code==="auth/email-already-in-use"?"Ese correo ya está registrado":er.code==="auth/weak-password"?"Contraseña mínimo 6 caracteres":"Error al crear cuenta","err");}};
  const logout=async()=>{await signOut(auth);setLiga(null);setPage("ligas");msg("Sesión cerrada 👋");};

  if(loading)return<><style>{CSS}</style><div className="ldr"><div className="sp"/>Cargando...</div></>;
  if(!user)return<><style>{CSS}</style><Login onG={loginG} onE={loginE} onR={reg} msg={msg}/></>;

  const esAdmin=liga?.adminId===user.uid;
  const esSA=user.uid===SUPER_ADMIN_UID;

  return(
    <><style>{CSS}</style>
    <div className="app">
      <Hdr user={user} onLogout={logout} liga={liga}/>
      {toast&&<div className={`toast${toast.t==="err"?" err":""}`}>{toast.m}</div>}
      {modal==="crear"&&<MCrear user={user} onClose={()=>setModal(null)} onDone={l=>{setLiga(l);setModal(null);setPage("partidos");msg("¡Liga creada! 🎉");}}/>}
      {modal==="unir"&&<MUnir user={user} onClose={()=>setModal(null)} onDone={l=>{setLiga(l);setModal(null);setPage("partidos");msg("¡Te uniste! 🙌");}} msg={msg}/>}
      {page==="ligas"&&<Ligas user={user} liga={liga} onSel={l=>{setLiga(l);setPage("partidos");}} onCrear={()=>setModal("crear")} onUnir={()=>setModal("unir")} onLogout={logout} esSA={esSA}/>}
      {page==="partidos"&&<Partidos user={user} liga={liga} msg={msg}/>}
      {page==="tabla"&&<Tabla user={user} liga={liga}/>}
      {page==="admin"&&<Admin user={user} liga={liga} msg={msg}/>}
      <nav className="nav">
        <button className={`nb${page==="ligas"?" on":""}`} onClick={()=>setPage("ligas")}><span>🏆</span><span>Ligas</span></button>
        <button className={`nb${page==="partidos"?" on":""}`} onClick={()=>{if(!liga){msg("Selecciona una liga primero","err");return;}setPage("partidos");}}><span>⚽</span><span>Partidos</span></button>
        <button className={`nb${page==="tabla"?" on":""}`} onClick={()=>{if(!liga){msg("Selecciona una liga primero","err");return;}setPage("tabla");}}><span>📊</span><span>Tabla</span></button>
        {esAdmin&&<button className={`nb${page==="admin"?" on":""}`} onClick={()=>setPage("admin")}><span>⚙️</span><span>Admin</span></button>}
      </nav>
    </div></>
  );
}

// ════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════
function Login({onG,onE,onR,msg}){
  const[modo,setModo]=useState("inicio");
  const[nom,setNom]=useState("");
  const[em,setEm]=useState("");
  const[pw,setPw]=useState("");
  const[busy,setBusy]=useState(false);
  const doLogin=async()=>{if(!em||!pw){msg("Completa todos los campos","err");return;}setBusy(true);await onE(em,pw);setBusy(false);};
  const doReg=async()=>{if(!nom||!em||!pw){msg("Completa todos los campos","err");return;}if(pw.length<6){msg("Contraseña mínimo 6 caracteres","err");return;}setBusy(true);await onR(nom,em,pw);setBusy(false);};
  const doOlv=async()=>{if(!em){msg("Escribe tu correo primero","err");return;}try{await sendPasswordResetEmail(auth,em);msg("✅ Revisa tu correo");setModo("entrar");}catch{msg("Correo no encontrado","err");}};
  return(
    <div className="ls">
      <div><div className="ll">MUNDIAL<br/>2026 🏆</div><p className="lsb">La quiniela de tus amigos y familia</p></div>
      {modo==="inicio"&&<div className="lc"><h2>¡Bienvenido!</h2><p>¿Cómo quieres entrar?</p><button className="gg" onClick={onG} style={{marginBottom:10}}><img src="https://www.google.com/favicon.ico" alt="G"/> Entrar con Google</button><div className="dv"><hr/><span>o</span><hr/></div><button className="btn bs bw" style={{marginBottom:8}} onClick={()=>setModo("entrar")}>📧 Entrar con correo</button><button className="btn bs bw" onClick={()=>setModo("registrar")}>✏️ Crear cuenta nueva</button></div>}
      {modo==="entrar"&&<div className="lc"><h2>Iniciar sesión</h2><p style={{marginBottom:14}}>Entra con tu correo y contraseña</p><div className="fg"><label className="fl">Correo</label><input className="fi2" type="email" placeholder="tucorreo@gmail.com" value={em} onChange={e=>setEm(e.target.value)} autoFocus/></div><div className="fg"><label className="fl">Contraseña</label><input className="fi2" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/></div><button className="btn bp bw" onClick={doLogin} disabled={busy} style={{marginBottom:8}}>{busy?"Entrando...":"✅ Entrar"}</button><button className="btn bs bw" style={{marginBottom:8}} onClick={()=>setModo("olvide")}>🔑 Olvidé mi contraseña</button><button className="btn bs bw" onClick={()=>setModo("inicio")}>← Regresar</button></div>}
      {modo==="registrar"&&<div className="lc"><h2>Crear cuenta</h2><p style={{marginBottom:14}}>Regístrate con tu nombre y correo</p><div className="fg"><label className="fl">Tu nombre</label><input className="fi2" type="text" placeholder="Ej: Carlos García" value={nom} onChange={e=>setNom(e.target.value)} autoFocus maxLength={40}/></div><div className="fg"><label className="fl">Correo</label><input className="fi2" type="email" placeholder="tucorreo@gmail.com" value={em} onChange={e=>setEm(e.target.value)}/></div><div className="fg"><label className="fl">Contraseña (mín. 6 caracteres)</label><input className="fi2" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doReg()}/></div><button className="btn bp bw" onClick={doReg} disabled={busy} style={{marginBottom:8}}>{busy?"Creando...":"🎉 Crear mi cuenta"}</button><button className="btn bs bw" onClick={()=>setModo("inicio")}>← Regresar</button></div>}
      {modo==="olvide"&&<div className="lc"><h2>Restablecer contraseña</h2><p style={{marginBottom:14}}>Te enviaremos un link a tu correo</p><div className="fg"><label className="fl">Correo</label><input className="fi2" type="email" placeholder="tucorreo@gmail.com" value={em} onChange={e=>setEm(e.target.value)} autoFocus/></div><button className="btn bp bw" onClick={doOlv} style={{marginBottom:8}}>📧 Enviar link</button><button className="btn bs bw" onClick={()=>setModo("entrar")}>← Regresar</button></div>}
      <p style={{color:"rgba(255,255,255,.3)",fontSize:11,textAlign:"center"}}>Gratis · Seguro · Para todas las edades</p>
    </div>
  );
}

function Hdr({user,onLogout,liga}){
  return(
    <div className="hdr"><div className="hdr-t">
      <div><h1>⚽ QUINIELA 2026</h1>{liga&&<p>📍 {liga.nombre}</p>}</div>
      {user.photoURL?<img className="av" src={user.photoURL} alt="" onClick={onLogout} title="Toca para cerrar sesión"/>
        :<div className="av" style={{display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,cursor:"pointer"}} onClick={onLogout}>{(user.displayName||user.email||"?")[0].toUpperCase()}</div>}
    </div></div>
  );
}

// ════════════════════════════════════════════════════════
// LIGAS
// ════════════════════════════════════════════════════════
function Ligas({user,liga,onSel,onCrear,onUnir,onLogout,esSA}){
  const[ligas,setLigas]=useState([]);
  const[busy,setBusy]=useState(true);
  const[inv,setInv]=useState(null);
  useEffect(()=>{
    const q=query(collection(db,"ligas"),where("miembros","array-contains",user.uid));
    return onSnapshot(q,s=>{setLigas(s.docs.map(d=>({id:d.id,...d.data()})));setBusy(false);});
  },[user.uid]);
  const wa=l=>`🏆 ¡Únete a nuestra quiniela del Mundial 2026!\n\nLiga: *${l.nombre}*\n🔑 Código: *${l.codigo}*\n\n1. Abre el link de la app\n2. Entra con tu cuenta\n3. Toca "Unirme"\n4. Código: *${l.codigo}*\n\n¡A competir! ⚽`;
  const nom=user.displayName||user.email?.split("@")[0]||"Jugador";
  if(busy)return<div className="ldr"><div className="sp"/>Cargando ligas...</div>;
  return(
    <div className="sec">
      <div className="perfil">
        {user.photoURL?<img className="pav" src={user.photoURL} alt=""/>:<div className="pavl">{nom[0].toUpperCase()}</div>}
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nom}</div><div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div></div>
        <button className="btn br2" style={{fontSize:12,padding:"8px 12px"}} onClick={onLogout}>🚪 Salir</button>
      </div>
      <div className="st">🏆 Mis Ligas</div>
      <div className="ss">{esSA?"Crea o únete a una liga":"Únete con el código del organizador"}</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {esSA&&<button className="btn bp" style={{flex:1}} onClick={onCrear}>+ Crear liga</button>}
        <button className="btn bs" style={{flex:esSA?1:"1 1 100%"}} onClick={onUnir}>🔑 Unirme a una liga</button>
      </div>
      {ligas.length===0?<div className="empty"><div className="ei">⚽</div><div className="et2">¡Aún no estás en ninguna liga!</div><div className="es">Pide el código de 6 letras al organizador y toca "Unirme a una liga".</div></div>
      :ligas.map(l=>(
        <div key={l.id} className={`fi${liga?.id===l.id?" on":""}`} onClick={()=>onSel(l)}>
          <div className="fn">{l.nombre}</div>
          <div className="fc">Código: {l.codigo}</div>
          <div className="fm">👥 {l.miembros?.length||0} participantes</div>
          <div style={{display:"flex",gap:8,marginTop:9}}>
            <button className="btn bs" style={{fontSize:11,padding:"7px 11px"}} onClick={e=>{e.stopPropagation();onSel(l);}}>Ver partidos</button>
            <button className="btn bd" style={{fontSize:11,padding:"7px 11px"}} onClick={e=>{e.stopPropagation();setInv(l);}}>📲 Invitar</button>
          </div>
        </div>
      ))}
      {inv&&<div className="mo" onClick={()=>setInv(null)}><div className="md" onClick={e=>e.stopPropagation()}><div className="mt2">📲 Invitar amigos</div><div className="ms">Comparte el código o manda el mensaje por WhatsApp</div><div className="cg"><div style={{fontSize:11,color:"var(--t2)",marginBottom:3}}>CÓDIGO DE LIGA</div><div className="cgt">{inv.codigo}</div></div><a href={`https://wa.me/?text=${encodeURIComponent(wa(inv))}`} target="_blank" rel="noopener noreferrer" className="btn bp bw" style={{textDecoration:"none",justifyContent:"center",display:"flex",marginBottom:8}}>💬 Compartir por WhatsApp</a><button className="btn bs bw" onClick={()=>setInv(null)}>Cerrar</button></div></div>}
    </div>
  );
}

function MCrear({user,onClose,onDone}){
  const[nom,setNom]=useState("");const[busy,setBusy]=useState(false);
  const crear=async()=>{if(!nom.trim())return;setBusy(true);const cod=genCod();const ref=doc(collection(db,"ligas"));await setDoc(ref,{nombre:nom.trim(),codigo:cod,adminId:user.uid,adminNombre:user.displayName||user.email,miembros:[user.uid],miembrosInfo:{[user.uid]:{nombre:user.displayName||user.email||'Jugador',foto:user.photoURL||null}},creada:serverTimestamp(),fase:"grupos"});onDone({id:ref.id,nombre:nom.trim(),codigo:cod,adminId:user.uid,miembros:[user.uid]});setBusy(false);};
  return(<div className="mo" onClick={onClose}><div className="md" onClick={e=>e.stopPropagation()}><div className="mt2">🏆 Crear nueva liga</div><div className="ms">Dale un nombre — se generará un código de invitación</div><div className="fg"><label className="fl">Nombre de la liga</label><input className="fi2" placeholder="Ej: Los Compadres" value={nom} onChange={e=>setNom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&crear()} autoFocus maxLength={40}/></div><button className="btn bp bw" onClick={crear} disabled={!nom.trim()||busy}>{busy?"Creando...":"✅ Crear liga"}</button><div style={{height:8}}/><button className="btn bs bw" onClick={onClose}>Cancelar</button></div></div>);
}

function MUnir({user,onClose,onDone,msg}){
  const[cod,setCod]=useState("");const[busy,setBusy]=useState(false);
  const unir=async()=>{const c=cod.trim().toUpperCase();if(c.length!==6)return;setBusy(true);const snap=await getDocs(query(collection(db,"ligas"),where("codigo","==",c)));if(snap.empty){msg("Código no encontrado","err");setBusy(false);return;}const d=snap.docs[0];const l={id:d.id,...d.data()};if(l.miembros?.includes(user.uid)){onDone(l);return;}await setDoc(doc(db,"ligas",d.id),{miembros:arrayUnion(user.uid),[`miembrosInfo.${user.uid}`]:{nombre:user.displayName||user.email||'Jugador',foto:user.photoURL||null}},{merge:true});onDone({...l,miembros:[...(l.miembros||[]),user.uid]});setBusy(false);};
  return(<div className="mo" onClick={onClose}><div className="md" onClick={e=>e.stopPropagation()}><div className="mt2">🔑 Unirme a una liga</div><div className="ms">Escribe el código de 6 letras que te compartió el organizador</div><div className="fg"><label className="fl">Código de liga</label><input className="fi2 cod" placeholder="XXXXXX" value={cod} onChange={e=>setCod(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} autoFocus/></div><button className="btn bp bw" onClick={unir} disabled={cod.length!==6||busy}>{busy?"Buscando...":"✅ Unirme"}</button><div style={{height:8}}/><button className="btn bs bw" onClick={onClose}>Cancelar</button></div></div>);
}

// ════════════════════════════════════════════════════════
// PARTIDOS (GRUPOS + ELIMINATORIA + CAMPEÓN)
// ════════════════════════════════════════════════════════
function Partidos({user,liga,msg}){
  const[fase,setFase]=useState("grupos");
  const[ligaD,setLigaD]=useState(null);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"ligas",liga.id),s=>{if(s.exists())setLigaD({id:s.id,...s.data()});});},[liga]);
  if(!liga)return<div className="empty"><div className="ei">🏆</div><div className="et2">Selecciona una liga</div><div className="es">Ve a Ligas y selecciona una para ver los partidos.</div></div>;
  return(
    <div>
      <div style={{padding:"12px 16px 0"}}><div style={{fontSize:17,fontWeight:800,marginBottom:3}}>⚽ Partidos</div><div style={{fontSize:12,color:"var(--t2)",marginBottom:10}}>Ingresa tus predicciones antes del cierre</div></div>
      <div className="ftabs">
        <button className={`ftab${fase==="grupos"?" on":""}`} onClick={()=>setFase("grupos")}>⚽ Grupos</button>
        <button className={`ftab${fase==="elim"?" onm":""}`} style={fase==="elim"?{background:"var(--m)",color:"#fff"}:{}} onClick={()=>setFase("elim")}>🏆 Eliminatoria</button>
        <button className={`ftab${fase==="camp"?" ond":""}`} style={fase==="camp"?{background:"var(--d)",color:"#000"}:{}} onClick={()=>setFase("camp")}>👑 Campeón</button>
      </div>
      {fase==="grupos"&&<Grupos user={user} liga={liga} msg={msg}/>}
      {fase==="elim"&&<Elim user={user} liga={liga} ligaD={ligaD} rActivas={ligaD?.rondasActivas||[]} msg={msg}/>}
      {fase==="camp"&&<Camp user={user} liga={liga} msg={msg}/>}
    </div>
  );
}

// ─── FASE DE GRUPOS ───────────────────────────────────
function Grupos({user,liga,msg}){
  const[grp,setGrp]=useState("A");
  const[preds,setPreds]=useState({});
  const[res,setRes]=useState({});
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"predicciones",`${liga.id}_${user.uid}`),s=>{if(s.exists())setPreds(s.data());});},[liga,user.uid]);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"resultados",liga.id),s=>{if(s.exists())setRes(s.data());});},[liga]);
  const guardar=async(pid,l,v)=>{
    const p=PG.find(x=>x.id===pid);
    if(bloq(p.f)){msg("⛔ Predicción bloqueada — el partido empieza pronto","err");return;}
    if(l===""||v===""||isNaN(l)||isNaN(v))return;
    await setDoc(doc(db,"predicciones",`${liga.id}_${user.uid}`),{[`${pid}_l`]:parseInt(l),[`${pid}_v`]:parseInt(v),uid:user.uid,lid:liga.id,nom:user.displayName||user.email,foto:user.photoURL||null},{merge:true});
    msg("✅ Predicción guardada");
  };
  return(
    <>
      <div className="tabs">{Object.keys(GRUPOS).map(g=><button key={g} className={`tab${grp===g?" on":""}`} onClick={()=>setGrp(g)}>Grupo {g}</button>)}</div>
      <div style={{padding:"0 16px"}}>
        <div style={{fontSize:11,color:"var(--t2)",marginBottom:10,display:"flex",gap:6,flexWrap:"wrap"}}>{GRUPOS[grp].map(e=><span key={e}>{F(e)} {e}</span>)}</div>
        {PG.filter(p=>p.g===grp).map(p=>(
          <PCard key={p.id} p={p} lok={bloq(p.f)} rL={res[`${p.id}_l`]} rV={res[`${p.id}_v`]} mL={preds[`${p.id}_l`]} mV={preds[`${p.id}_v`]} onSave={(l,v)=>guardar(p.id,l,v)}/>
        ))}
      </div>
    </>
  );
}

function PCard({p,lok,rL,rV,mL,mV,onSave}){
  const[l,setL]=useState(mL!==undefined?String(mL):"");
  const[v,setV]=useState(mV!==undefined?String(mV):"");
  const[busy,setBusy]=useState(false);
  const tieneR=rL!==undefined;
  const pts=tieneR&&mL!==undefined?calcPuntos({l:mL,v:mV},{l:rL,v:rV}):null;
  const fecha=new Date(p.f).toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  return(
    <div className={`pc${lok?" lok":""}${tieneR?" res":""}`}>
      <div className="pb">GRP {p.g}</div>
      <div className="fp">📅 {fecha} · {p.e}</div>
      <div className="peq">
        <div className="pe"><div className="pef">{F(p.l)}</div><div className="pen">{p.l}</div></div>
        <div className="vs">VS</div>
        <div className="pe"><div className="pef">{F(p.v)}</div><div className="pen">{p.v}</div></div>
      </div>
      {tieneR&&<div className="rr">{rL} — {rV}</div>}
      {!lok?(
        <><div style={{fontSize:11,color:"var(--t2)",textAlign:"center",marginBottom:5}}>{mL!==undefined?"Tu predicción actual:":"Ingresa tu predicción:"}</div>
        <div className="pi"><input className="pinp" type="number" min="0" max="99" placeholder="0" value={l} onChange={e=>setL(e.target.value.replace(/[^0-9]/g,"").slice(0,2))}/><div className="pg">-</div><input className="pinp" type="number" min="0" max="99" placeholder="0" value={v} onChange={e=>setV(e.target.value.replace(/[^0-9]/g,"").slice(0,2))}/></div>
        <button className="btn bp bw" onClick={async()=>{setBusy(true);await onSave(l,v);setBusy(false);}} disabled={l===""||v===""||busy} style={{fontSize:13,padding:"11px"}}>{busy?"Guardando...":mL!==undefined?"✏️ Actualizar":"✅ Guardar predicción"}</button></>
      ):(
        <div>{mL!==undefined?<div style={{textAlign:"center"}}><div style={{fontSize:12,color:"var(--t2)",marginBottom:3}}>Tu predicción:</div><div style={{fontFamily:"'Bebas Neue'",fontSize:30,color:pts!==null?"var(--d)":"white"}}>{mL} — {mV}</div></div>:<div className="lav">🔒 Predicciones cerradas</div>}</div>
      )}
      {pts!==null&&<div style={{textAlign:"center",marginTop:7}}><span className="ppb">⭐ {pts} puntos</span></div>}
    </div>
  );
}

// ─── ELIMINATORIA ─────────────────────────────────────
function Elim({user,liga,rActivas,msg}){
  const[ronda,setRonda]=useState(null);
  const[elimD,setElimD]=useState({});
  const[resE,setResE]=useState({});
  const[misP,setMisP]=useState({});
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"resultados",liga.id),s=>{if(s.exists())setResE(s.data()?.eliminatoria||{});});},[liga]);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"predicciones",`${liga.id}_${user.uid}`),s=>{if(s.exists())setMisP(s.data()?.eliminatoria||{});});},[liga,user.uid]);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"eliminatoria",liga.id),s=>{if(s.exists())setElimD(s.data());});},[liga]);
  useEffect(()=>{if(rActivas?.length>0&&!ronda)setRonda(rActivas[rActivas.length-1]);},[rActivas]);
  if(!rActivas||rActivas.length===0)return(
    <div style={{padding:"0 16px"}}><div style={{textAlign:"center",padding:"36px 20px"}}><div style={{fontSize:44,marginBottom:12}}>🔒</div><div style={{fontWeight:800,fontSize:17,marginBottom:7}}>Fase eliminatoria no iniciada</div><div style={{color:"var(--t2)",fontSize:13,lineHeight:1.6}}>El administrador la activará cuando termine la fase de grupos.<br/>¡Aprovecha y pon tus predicciones de grupos!</div></div></div>
  );
  const guardar=async(pid,eq)=>{await setDoc(doc(db,"predicciones",`${liga.id}_${user.uid}`),{eliminatoria:{[pid]:eq},uid:user.uid,lid:liga.id},{merge:true});msg("✅ Predicción guardada");};
  return(
    <div style={{padding:"0 16px"}}>
      <div className="tabs" style={{paddingLeft:0,paddingRight:0}}>
        {RONDAS.filter(r=>rActivas.includes(r.id)).map(r=>(
          <button key={r.id} className={`tab${ronda===r.id?" onm":""}`} style={ronda===r.id?{background:"var(--m)",color:"#fff",borderColor:"var(--m)"}:{}} onClick={()=>setRonda(r.id)}>{r.nombre}</button>
        ))}
      </div>
      {ronda&&(()=>{
        const info=RONDAS.find(r=>r.id===ronda);
        const pts=ronda==="fin"?10:4;
        const partidos=elimD[ronda]||[];
        if(partidos.length===0)return<div style={{textAlign:"center",padding:"28px",color:"var(--t2)"}}><div style={{fontSize:36,marginBottom:8}}>⏳</div><div style={{fontWeight:800}}>Preparando enfrentamientos...</div></div>;
        return(
          <>
            <div className="rhdr"><span style={{fontSize:26}}>🏆</span><div><h3>{info?.nombre}</h3><div style={{fontSize:11,color:"var(--t2)"}}>Toca el equipo que crees que avanzará</div></div></div>
            {partidos.map((pt,i)=>{
              const pid=`${ronda}_${i}`;
              const gan=resE[pid],mi=misP[pid],lok2=!!gan;
              return(
                <div key={pid} className={`ep${gan?" res":""}`}>
                  <div style={{fontSize:11,color:"var(--t2)",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                    <span>Partido {i+1}</span>{gan&&<span style={{color:"var(--d)",fontWeight:800}}>✓ Resultado oficial</span>}
                  </div>
                  {[pt.equipo1,pt.equipo2].map(eq=>{
                    const esG=gan===eq,esE=mi===eq;
                    let cls="";
                    if(gan){cls=esG?"gan":"";if(esE)cls=esG?"ok":"fail";}else if(esE)cls="sel";
                    return(
                      <div key={eq} className={`eo${cls?" "+cls:""}`} onClick={()=>!lok2&&guardar(pid,eq)} style={lok2&&!esE?{cursor:"default"}:{}}>
                        <span style={{fontSize:26}}>{F(eq)}</span><span style={{flex:1}}>{eq}</span>
                        {esE&&!gan&&<span style={{fontSize:12}}>✓ Tu elección</span>}
                        {esG&&<span style={{color:"var(--d)",fontSize:12}}>🏆 Ganador</span>}
                        {esE&&gan&&esG&&<span style={{color:"var(--v)",fontSize:12}}>⭐ +{pts} pts</span>}
                        {esE&&gan&&!esG&&<span style={{color:"var(--r)",fontSize:12}}>✗ 0 pts</span>}
                      </div>
                    );
                  })}
                  {!lok2&&!mi&&<div style={{fontSize:11,color:"var(--t2)",textAlign:"center",marginTop:5}}>👆 Toca el equipo que crees que ganará</div>}
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  );
}

// ─── CAMPEÓN ──────────────────────────────────────────
function Camp({user,liga,msg}){
  const[mi,setMi]=useState(null);
  const[real,setReal]=useState(null);
  const[load,setLoad]=useState(true);
  const lok=campBloq();
  useEffect(()=>{
    if(!liga)return;
    const u1=onSnapshot(doc(db,"predicciones",`${liga.id}_${user.uid}`),s=>{if(s.exists())setMi(s.data()?.campeon||null);setLoad(false);});
    const u2=onSnapshot(doc(db,"resultados",liga.id),s=>{if(s.exists())setReal(s.data()?.campeon||null);});
    return()=>{u1();u2();};
  },[liga,user.uid]);
  const elegir=async eq=>{
    if(lok){msg("⛔ Ya cerró el plazo para elegir campeón","err");return;}
    await setDoc(doc(db,"predicciones",`${liga.id}_${user.uid}`),{campeon:eq,uid:user.uid,lid:liga.id},{merge:true});
    msg(`✅ Elegiste a ${eq} como campeón`);
  };
  if(load)return<div className="ldr"><div className="sp"/>Cargando...</div>;
  const acerto=real&&mi===real,fallo=real&&mi&&mi!==real;
  return(
    <div style={{padding:"0 16px"}}>
      <div className="cc">
        <div className="ct">👑 ¿Quién ganará el Mundial?</div>
        <div className="csb">
          {real?`🏆 Campeón oficial: ${F(real)} ${real}`:lok?"⏰ El plazo para elegir campeón ya cerró (antes del primer partido)":"Elige el equipo que crees que ganará el Mundial. ¡Vale 10 puntos si aciertas! Puedes cambiar tu elección hasta 1 hora antes del primer partido (11 jun, 13:00 hora México)."}
        </div>
        {mi&&<div className={`cs${acerto?" ok":fallo?" fail":" el"}`} style={{marginBottom:12,cursor:"default"}}>
          <span style={{fontSize:28}}>{F(mi)}</span>
          <div style={{flex:1}}><div style={{fontWeight:800}}>{mi}</div><div style={{fontSize:11,color:"var(--t2)"}}>Tu elección</div></div>
          {acerto&&<span style={{color:"var(--v)",fontWeight:800}}>⭐ +10 pts</span>}
          {fallo&&<span style={{color:"var(--r)",fontWeight:800}}>✗ 0 pts</span>}
          {!real&&<span style={{color:"var(--d)",fontSize:12}}>Pendiente</span>}
        </div>}
        {real&&<div className="cs gan" style={{cursor:"default",justifyContent:"center",gap:16}}>
          <span style={{fontSize:36}}>{F(real)}</span>
          <div><div style={{fontWeight:900,fontSize:16}}>🏆 {real}</div><div style={{fontSize:12,color:"var(--d)"}}>Campeón Mundial 2026</div></div>
        </div>}
      </div>
      {!lok&&!real&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:"var(--t2)",marginBottom:10,paddingLeft:2}}>{mi?"Cambia tu elección:":"Elige tu campeón:"}</div>
          <div className="cgrid">
            {TODOS.map(eq=>(
              <div key={eq} className={`cs${mi===eq?" el":""}`} onClick={()=>elegir(eq)}>
                <span style={{fontSize:22}}>{F(eq)}</span>
                <span style={{fontSize:12,flex:1}}>{eq}</span>
                {mi===eq&&<span style={{fontSize:16}}>✓</span>}
              </div>
            ))}
          </div>
        </>
      )}
      {lok&&!real&&!mi&&<div style={{background:"var(--f2)",border:"1px solid var(--b)",borderRadius:12,padding:16,textAlign:"center",color:"var(--t2)",fontSize:13}}>🔒 No elegiste campeón antes del cierre. Sin puntos en esta categoría.</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TABLA
// ════════════════════════════════════════════════════════
function Tabla({user,liga}){
  const[tabla,setTabla]=useState([]);
  const[load,setLoad]=useState(true);
  useEffect(()=>{
    if(!liga)return;
    setLoad(true);
    return onSnapshot(doc(db,"resultados",liga.id),async rs=>{
      const res=rs.exists()?rs.data():{};
      const resE=res.eliminatoria||{};
      const campReal=res.campeon||null;
      const[ld,ed]=await Promise.all([getDoc(doc(db,"ligas",liga.id)),getDoc(doc(db,"eliminatoria",liga.id))]);
      const ldata=ld.data()||{},elimD=ed.exists()?ed.data():{};
      const rows=await Promise.all((ldata.miembros||[]).map(async uid=>{
        const ps=await getDoc(doc(db,"predicciones",`${liga.id}_${uid}`));
        const pred=ps.exists()?ps.data():{},predE=pred.eliminatoria||{};
        let pts=0,j=0;
        PG.forEach(p=>{const rL=res[`${p.id}_l`],rV=res[`${p.id}_v`],pL=pred[`${p.id}_l`],pV=pred[`${p.id}_v`];if(rL!==undefined&&pL!==undefined){pts+=calcPuntos({l:pL,v:pV},{l:rL,v:rV});j++;}});
        RONDAS.forEach(r=>{(elimD[r.id]||[]).forEach((_,i)=>{const k=`${r.id}_${i}`;const g=resE[k],m=predE[k];if(g&&m===g){pts+=r.id==="fin"?10:4;j++;}});});
        if(campReal&&pred.campeon===campReal){pts+=10;j++;}
        const mi=ldata.miembrosInfo||{};
        return{uid,nom:mi[uid]?.nombre||"Jugador",foto:mi[uid]?.foto,pts,j,yo:uid===user.uid};
      }));
      rows.sort((a,b)=>b.pts-a.pts||b.j-a.j);
      setTabla(rows);setLoad(false);
    });
  },[liga,user.uid]);
  if(!liga)return<div className="empty"><div className="ei">📊</div><div className="et2">Selecciona una liga</div></div>;
  if(load)return<div className="ldr"><div className="sp"/>Calculando...</div>;
  const cls=i=>i===0?"p1":i===1?"p2":i===2?"p3":"";
  const med=i=>i===0?"🥇":i===1?"🥈":i===2?"🥉":"";
  return(
    <div>
      <div style={{padding:"12px 16px 10px"}}><div style={{fontSize:17,fontWeight:800,marginBottom:3}}>📊 Tabla de Posiciones</div><div style={{fontSize:12,color:"var(--t2)"}}>{liga.nombre} · {tabla.length} participantes</div></div>
      <div className="tp">
        <div className="th"><div>#</div><div>Jugador</div><div style={{textAlign:"center"}}>Partidos</div><div style={{textAlign:"right"}}>Pts</div></div>
        {tabla.map((j,i)=>(
          <div key={j.uid} className={`tr${j.yo?" yo":""}`}>
            <div className={`tpos ${cls(i)}`}>{med(i)||i+1}</div>
            <div className="tnom">{j.yo?<span style={{color:"var(--v)"}}>👤 Tú</span>:j.nom}</div>
            <div className="tpar">{j.j}</div>
            <div className="tpts">{j.pts}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"14px 16px 0"}}>
        <div className="card">
          <div className="ctit">📋 Sistema de puntos</div>
          <div style={{fontSize:12,display:"flex",flexDirection:"column",gap:5}}>
            {[["🎯 Marcador exacto","6 pts"],["✅ Ganador correcto","3 pts"],["⚽ Goles del ganador exactos","2 pts"],["➡️ Clasificado (Elim.)","4 pts"],["👑 Campeón del Mundial","10 pts"]].map(([d,p])=>(
              <div key={d} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--t2)"}}>{d}</span><span style={{fontWeight:800,color:"var(--d)"}}>{p}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════
function Admin({user,liga,msg}){
  const[sec,setSec]=useState("grupos");
  const[res,setRes]=useState({});
  const[ligaD,setLigaD]=useState(null);
  const[elimD,setElimD]=useState({});
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"resultados",liga.id),s=>{if(s.exists())setRes(s.data());});},[liga]);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"ligas",liga.id),s=>{if(s.exists())setLigaD({id:s.id,...s.data()});});},[liga]);
  useEffect(()=>{if(!liga)return;return onSnapshot(doc(db,"eliminatoria",liga.id),s=>{if(s.exists())setElimD(s.data());});},[liga]);
  if(!liga||liga.adminId!==user.uid)return<div className="empty"><div className="ei">🔒</div><div className="et2">Solo el administrador</div></div>;
  return(
    <div className="ap">
      <div style={{fontSize:17,fontWeight:800,marginBottom:3}}>⚙️ Panel de Administrador</div>
      <div style={{fontSize:12,color:"var(--t2)",marginBottom:14}}>Gestiona resultados, eliminatoria y campeón</div>
      <div className="ftabs" style={{margin:"0 0 14px"}}>
        <button className={`ftab${sec==="grupos"?" on":""}`} onClick={()=>setSec("grupos")}>⚽ Grupos</button>
        <button className={`ftab${sec==="elim"?" onm":""}`} style={sec==="elim"?{background:"var(--m)",color:"#fff"}:{}} onClick={()=>setSec("elim")}>🏆 Eliminatoria</button>
        <button className={`ftab${sec==="camp"?" ond":""}`} style={sec==="camp"?{background:"var(--d)",color:"#000"}:{}} onClick={()=>setSec("camp")}>👑 Campeón</button>
      </div>
      {sec==="grupos"&&<AdminGrupos liga={liga} res={res} msg={msg}/>}
      {sec==="elim"&&<AdminElim liga={liga} ligaD={ligaD} elimD={elimD} res={res} msg={msg}/>}
      {sec==="camp"&&<AdminCamp liga={liga} res={res} msg={msg}/>}
    </div>
  );
}

function AdminGrupos({liga,res,msg}){
  const[grp,setGrp]=useState("A");
  const guardar=async(pid,l,v)=>{if(l===""||v===""||parseInt(l)<0||parseInt(v)<0)return;await setDoc(doc(db,"resultados",liga.id),{[`${pid}_l`]:parseInt(l),[`${pid}_v`]:parseInt(v)},{merge:true});msg("✅ Resultado guardado");};
  return(
    <>
      <div className="tabs" style={{paddingLeft:0,paddingRight:0}}>{Object.keys(GRUPOS).map(g=><button key={g} className={`tab${grp===g?" on":""}`} onClick={()=>setGrp(g)}>Grupo {g}</button>)}</div>
      {PG.filter(p=>p.g===grp).map(p=><APC key={p.id} p={p} rLA={res[`${p.id}_l`]} rVA={res[`${p.id}_v`]} onSave={(l,v)=>guardar(p.id,l,v)}/>)}
    </>
  );
}

function APC({p,rLA,rVA,onSave}){
  const[l,setL]=useState(rLA!==undefined?String(rLA):"");
  const[v,setV]=useState(rVA!==undefined?String(rVA):"");
  const[busy,setBusy]=useState(false);
  return(
    <div className="card" style={{marginLeft:0,marginRight:0}}>
      <div style={{fontSize:11,color:"var(--t2)",marginBottom:7}}>{new Date(p.f).toLocaleDateString("es-MX",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
        <div style={{fontWeight:800,fontSize:13}}>{F(p.l)} {p.l}</div>
        <div style={{color:"var(--t2)",fontWeight:800}}>vs</div>
        <div style={{fontWeight:800,fontSize:13}}>{p.v} {F(p.v)}</div>
      </div>
      <div className="rf"><input type="number" min="0" max="99" placeholder="0" value={l} onChange={e=>setL(e.target.value.slice(0,2))}/><div className="rg">-</div><input type="number" min="0" max="99" placeholder="0" value={v} onChange={e=>setV(e.target.value.slice(0,2))}/></div>
      <button className={`btn${rLA!==undefined?" bs":" bp"} bw`} style={{fontSize:13}} onClick={async()=>{setBusy(true);await onSave(l,v);setBusy(false);}} disabled={l===""||v===""||busy}>{busy?"Guardando...":rLA!==undefined?"✏️ Actualizar":"✅ Guardar resultado"}</button>
      {rLA!==undefined&&<div style={{textAlign:"center",marginTop:5,fontSize:11,color:"var(--v)"}}>Resultado actual: {rLA} - {rVA}</div>}
    </div>
  );
}

function AdminElim({liga,ligaD,elimD,res,msg}){
  const rActivas=ligaD?.rondasActivas||[];
  const[vista,setVista]=useState(null);
  const[nuevaR,setNuevaR]=useState(null);
  const[nP,setNP]=useState([]);
  const activar=async rid=>{
    if(rActivas.includes(rid))return;
    await setDoc(doc(db,"ligas",liga.id),{rondasActivas:arrayUnion(rid)},{merge:true});
    const info=RONDAS.find(r=>r.id===rid);
    setNuevaR(rid);setNP(Array.from({length:info.partidos},()=>({equipo1:"",equipo2:""})));
    msg(`✅ "${info.nombre}" activada`);
  };
  const guardarP=async rid=>{
    if(nP.some(p=>!p.equipo1||!p.equipo2)){msg("Completa todos los equipos","err");return;}
    await setDoc(doc(db,"eliminatoria",liga.id),{[rid]:nP},{merge:true});
    setNuevaR(null);msg("✅ Enfrentamientos guardados");
  };
  const guardarG=async(rid,i,eq)=>{await setDoc(doc(db,"resultados",liga.id),{eliminatoria:{[`${rid}_${i}`]:eq}},{merge:true});msg(`✅ Ganador: ${eq}`);};
  return(
    <div>
      <div style={{fontSize:12,color:"var(--t2)",marginBottom:14,lineHeight:1.6}}>Activa cada ronda cuando terminen los partidos anteriores y define los enfrentamientos.</div>
      {RONDAS.map(r=>{
        const activa=rActivas.includes(r.id),partidos=elimD[r.id]||[];
        return(
          <div key={r.id} className="arc">
            <h3>{r.nombre}</h3>
            <p>{r.partidos} partido{r.partidos>1?"s":""} · {r.pts} pts por ganador correcto{r.id==="fin"?" (o 10 pts por campeón)":""}</p>
            {!activa?<button className="btn bm bw" onClick={()=>activar(r.id)}>🔓 Activar {r.nombre}</button>:(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{color:"var(--v)",fontWeight:800,fontSize:13}}>✅ Ronda activa</span>
                  <button className="btn bs" style={{fontSize:11,padding:"5px 10px"}} onClick={()=>setVista(vista===r.id?null:r.id)}>{vista===r.id?"Cerrar":"Ver partidos"}</button>
                </div>
                {nuevaR===r.id&&(
                  <div>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:8,color:"var(--d)"}}>Define los {r.partidos} enfrentamientos:</div>
                    {nP.map((pt,i)=>(
                      <div key={i} style={{marginBottom:10,background:"var(--f2)",borderRadius:11,padding:11}}>
                        <div style={{fontSize:11,color:"var(--t2)",marginBottom:7}}>Partido {i+1}</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:7,alignItems:"center"}}>
                          <select className="sel2" value={pt.equipo1} onChange={e=>{const a=[...nP];a[i]={...a[i],equipo1:e.target.value};setNP(a);}}>
                            <option value="">Equipo 1...</option>{TODOS.map(eq=><option key={eq} value={eq}>{F(eq)} {eq}</option>)}
                          </select>
                          <div style={{fontWeight:900,color:"var(--t2)",fontSize:12}}>vs</div>
                          <select className="sel2" value={pt.equipo2} onChange={e=>{const a=[...nP];a[i]={...a[i],equipo2:e.target.value};setNP(a);}}>
                            <option value="">Equipo 2...</option>{TODOS.map(eq=><option key={eq} value={eq}>{F(eq)} {eq}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    <button className="btn bp bw" onClick={()=>guardarP(r.id)}>✅ Guardar enfrentamientos</button>
                  </div>
                )}
                {vista===r.id&&partidos.map((pt,i)=>{
                  const gan=res?.eliminatoria?.[`${r.id}_${i}`];
                  return(
                    <div key={i} style={{background:"var(--f2)",borderRadius:11,padding:11,marginBottom:8}}>
                      <div style={{fontSize:11,color:"var(--t2)",marginBottom:7}}>Partido {i+1}</div>
                      <div style={{fontSize:13,fontWeight:800,marginBottom:9,textAlign:"center"}}>{F(pt.equipo1)} {pt.equipo1} <span style={{color:"var(--t2)"}}>vs</span> {pt.equipo2} {F(pt.equipo2)}</div>
                      {gan?<div style={{textAlign:"center",color:"var(--d)",fontWeight:800,fontSize:13}}>🏆 Ganador: {gan}</div>:(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                          <button className="btn bs" style={{fontSize:12,padding:"9px 7px"}} onClick={()=>guardarG(r.id,i,pt.equipo1)}>{F(pt.equipo1)} {pt.equipo1} ganó</button>
                          <button className="btn bs" style={{fontSize:12,padding:"9px 7px"}} onClick={()=>guardarG(r.id,i,pt.equipo2)}>{F(pt.equipo2)} {pt.equipo2} ganó</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdminCamp({liga,res,msg}){
  const[sel,setSel]=useState("");
  const actual=res?.campeon||null;
  const guardar=async()=>{if(!sel){msg("Selecciona un equipo","err");return;}await setDoc(doc(db,"resultados",liga.id),{campeon:sel},{merge:true});msg(`🏆 Campeón registrado: ${sel}`);};
  return(
    <div>
      <div style={{fontSize:13,color:"var(--t2)",marginBottom:14,lineHeight:1.6}}>Registra al campeón cuando termine la final. Los participantes que lo predijeron correctamente reciben 10 pts automáticamente.</div>
      {actual&&<div style={{background:"linear-gradient(135deg,#1a1000,#2a2000)",border:"2px solid var(--d)",borderRadius:14,padding:20,textAlign:"center",marginBottom:14}}><div style={{fontSize:44,marginBottom:8}}>{F(actual)}</div><div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:"var(--d)"}}>{actual}</div><div style={{fontSize:13,color:"var(--t2)",marginTop:6}}>🏆 Campeón del Mundial 2026</div></div>}
      <div className="card" style={{marginLeft:0,marginRight:0}}>
        <div className="ctit">{actual?"Cambiar campeón":"Selecciona al campeón"}</div>
        <select className="sel2" value={sel} onChange={e=>setSel(e.target.value)} style={{marginBottom:12}}>
          <option value="">Elige el campeón...</option>{TODOS.map(eq=><option key={eq} value={eq}>{F(eq)} {eq}</option>)}
        </select>
        <button className={`btn${actual?" bs":" bd"} bw`} onClick={guardar} disabled={!sel}>{actual?"✏️ Actualizar campeón":"🏆 Registrar campeón"}</button>
      </div>
    </div>
  );
}
