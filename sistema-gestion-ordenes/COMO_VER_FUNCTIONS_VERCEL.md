image.png# Cómo Ver Functions (API Routes) en Vercel

## Método 1: Desde el Deployment (Recomendado)

1. Ve a **Vercel Dashboard** → Tu Proyecto (`ordenes-clientes`)
2. Ve a la pestaña **"Deployments"**
3. Haz clic en el **último deployment** (el más reciente, con el check verde)
4. En la página del deployment, busca una de estas opciones:

### Opción A: Pestaña "Functions"
- Si ves una pestaña llamada **"Functions"** en la parte superior (junto a "Deployment", "Logs", "Resources", etc.)
- Haz clic en **"Functions"**
- Deberías ver `/api/send-order-email` listado ahí

### Opción B: Sección "Functions" en la página del deployment
- Desplázate hacia abajo en la página del deployment
- Busca una sección llamada **"Functions"** o **"Serverless Functions"**
- Deberías ver `/api/send-order-email` listado ahí

### Opción C: En "Resources"
- Haz clic en la pestaña **"Resources"**
- Busca una sección de **"Functions"** o **"Serverless Functions"**
- Deberías ver `/api/send-order-email` ahí

## Método 2: Ver Logs en Tiempo Real

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. Ve a la pestaña **"Logs"** (en el menú lateral izquierdo o en la parte superior)
3. Aquí verás todos los logs en tiempo real, incluyendo los de las Functions
4. Filtra por `[EMAIL API]` para ver solo los logs de emails

## Método 3: Desde el Dashboard del Proyecto

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. En la página principal del proyecto, busca una sección de **"Functions"** o **"Serverless Functions"**
3. O ve a **Settings** → **Functions** (si está disponible)

## Método 4: Ver Logs Directamente

Si no encuentras la sección "Functions", puedes ver los logs directamente:

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. Ve a **"Logs"** (pestaña o menú lateral)
3. Los logs de las Functions aparecerán aquí cuando se ejecuten
4. Busca mensajes que empiecen con `[EMAIL API]`

## Si No Ves Functions

### Posibles Razones:

1. **El deployment aún no se ha completado**
   - Espera a que termine el build
   - Verifica que el status sea "Ready" (verde)

2. **Las Functions no se están generando**
   - Verifica que `output: 'server'` esté en `astro.config.mjs`
   - Verifica que el archivo esté en `src/pages/api/send-order-email.ts`
   - Haz un nuevo deploy

3. **La interfaz de Vercel cambió**
   - Las Functions pueden estar en una ubicación diferente
   - Usa el Método 2 (Logs) que siempre está disponible

## Verificar que la Function Existe

Para verificar que la function se está generando:

1. Ve a **Deployments** → Último deployment
2. En los **Build Logs**, busca:
   - `[@astrojs/vercel] Bundling function`
   - O mensajes sobre "serverless functions"
3. Si ves estos mensajes, las functions se están generando

## Alternativa: Ver Logs en Tiempo Real

La forma más fácil de ver qué está pasando:

1. Ve a **Vercel Dashboard** → Tu Proyecto
2. Ve a **"Logs"** (pestaña o menú lateral)
3. Intenta cambiar el estado de una orden a "por entregar"
4. Los logs aparecerán en tiempo real aquí
5. Busca mensajes con `[EMAIL API]`

## Consejo

Si no encuentras la sección "Functions", **usa los Logs** (Método 2). Los logs siempre están disponibles y muestran toda la información que necesitas, incluyendo los errores de las Functions.










