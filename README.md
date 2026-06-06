# ⚽ Quiniela Mundial 2026

Una aplicación web completa para organizar quinielas del Mundial 2026 con amigos y familia.

---

## 🚀 Cómo desplegar en Netlify (sin saber programar)

Sigue estos pasos con calma. Si tienes dudas, pide ayuda a alguien de confianza.

---

### PASO 1 — Crear cuenta en GitHub

1. Ve a **https://github.com**
2. Haz clic en **"Sign up"** (Registrarse)
3. Completa el registro con tu correo
4. Verifica tu correo

---

### PASO 2 — Subir el código a GitHub

1. Una vez que inicies sesión en GitHub, haz clic en el botón verde **"New"** (o el ícono `+`)
2. Nombre del repositorio: `quiniela-mundial-2026`
3. Ponlo en **"Public"** (Público)
4. Haz clic en **"Create repository"**
5. En la página que aparece, haz clic en **"uploading an existing file"**
6. Arrastra y suelta **todos los archivos** de esta carpeta
7. Haz clic en **"Commit changes"** (botón verde al final)

---

### PASO 3 — Crear proyecto en Firebase

Firebase es el servicio que guardará los datos de tu quiniela. Es gratis.

1. Ve a **https://console.firebase.google.com**
2. Inicia sesión con una cuenta Google
3. Haz clic en **"Crear un proyecto"**
4. Nombre: `quiniela-mundial-2026` → Siguiente → Siguiente → Crear
5. Espera a que se cree (unos segundos)

**Activar Firestore (la base de datos):**
1. En el menú izquierdo, haz clic en **"Firestore Database"**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"**
4. Elige la ubicación más cercana (ej: `us-central`) → Habilitar

**Activar Google Auth:**
1. En el menú izquierdo, haz clic en **"Authentication"**
2. Haz clic en **"Comenzar"**
3. En la pestaña **"Sign-in method"**, haz clic en **"Google"**
4. Activa el interruptor → Guarda el correo de soporte → Guardar

**Obtener las credenciales de Firebase:**
1. Haz clic en el ícono de engranaje ⚙️ junto a "Project Overview"
2. Selecciona **"Configuración del proyecto"**
3. Baja hasta **"Tus apps"** y haz clic en el ícono `</>`  (web)
4. Nombre de la app: `quiniela` → Registrar app
5. Copia todo el bloque `firebaseConfig` que aparece:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     ...
   };
   ```

**Pegar las credenciales en el código:**
1. Abre el archivo `src/App.jsx`
2. Busca la sección `// CONFIGURACIÓN FIREBASE`
3. Reemplaza `TU_API_KEY`, `TU_AUTH_DOMAIN`, etc. con los valores reales
4. Guarda el archivo y sube los cambios a GitHub

---

### PASO 4 — Configurar dominio en Firebase Auth

1. En Firebase → Authentication → Sign-in method → Google
2. Baja hasta **"Dominios autorizados"**
3. Agrega el dominio de Netlify que obtendrás en el siguiente paso
   (normalmente algo como `tu-quiniela.netlify.app`)

---

### PASO 5 — Desplegar en Netlify

1. Ve a **https://www.netlify.com**
2. Crea una cuenta gratuita (puedes usar GitHub para registrarte)
3. Haz clic en **"Add new site"** → **"Import an existing project"**
4. Selecciona **"Deploy with GitHub"**
5. Autoriza a Netlify a acceder a tu GitHub
6. Selecciona el repositorio `quiniela-mundial-2026`
7. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
8. Haz clic en **"Deploy site"**
9. ¡Espera 2-3 minutos y listo!

Netlify te dará un link como: `https://nombre-aleatorio.netlify.app`
**Ese es el link de tu quiniela.** Puedes compartirlo por WhatsApp.

---

### PASO 6 — Personalizar el dominio (opcional)

En Netlify → Site settings → Domain management → Options → Edit site name
Cambia el nombre a algo como `mi-quiniela-2026`

---

## 👑 Primer uso — Configuración inicial

1. Abre el link de tu quiniela
2. Entra con Google
3. El primer usuario en crear una liga se convierte en **administrador**
4. Comparte el código de 6 letras con tus amigos

---

## 🛠 Solución de problemas

| Problema | Solución |
|---|---|
| "Error de autenticación" | Verifica que el dominio de Netlify esté en Firebase Auth → Dominios autorizados |
| Los datos no se guardan | Verifica que Firestore esté en "modo de prueba" |
| Página en blanco | Verifica que `firebaseConfig` tenga los valores correctos |
| Error de CORS | Agrega el dominio de Netlify en Firebase Auth |

---

## 📞 Soporte

Si tienes problemas, revisa:
- La consola del navegador (F12 → Console) para ver errores
- La documentación de Firebase: https://firebase.google.com/docs
- La documentación de Netlify: https://docs.netlify.com
