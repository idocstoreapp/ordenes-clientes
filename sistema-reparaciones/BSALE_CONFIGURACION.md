# Configuración de Bsale API

## 🔑 Obtención del Token

### Token de Pruebas (Sandbox)
Para desarrollo y pruebas:
1. Crea una cuenta en [Bsale](https://www.bsale.cl)
2. Accede al panel de desarrollador
3. Genera un token de sandbox/pruebas
4. Este token **NO** tiene acceso a boletas reales del cliente

### Token de Producción ⚠️ IMPORTANTE
Para acceder a las boletas reales del cliente:
1. Envía un correo a **[email protected]**
2. Desde una cuenta de usuario **activa y con perfil de administrador** en Bsale
3. Indica el correo electrónico al que deseas asociar el token
4. Solicita un token de producción con acceso a documentos/boletas
5. Este token te permitirá validar boletas reales

## 📝 Configuración en el Proyecto

1. Crea o edita el archivo `.env` en la raíz del proyecto:
   ```
   PUBLIC_BSALE_ACCESS_TOKEN=tu_token_de_produccion_aqui
   ```

2. (Opcional) Si necesitas usar una URL base diferente:
   ```
   PUBLIC_BSALE_API_URL=https://api.bsale.cl
   ```
   O según tu país:
   - Chile: `https://api.bsale.cl`
   - Perú: `https://api.bsale.pe` (verificar)
   - México: `https://api.bsale.mx` (verificar)

3. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🧪 Pruebas

### Probar con un número de boleta real:
1. Ve al dashboard del técnico
2. Crea una nueva orden o edita una existente
3. Ingresa un número de boleta que exista en tu cuenta de Bsale
4. El sistema validará automáticamente:
   - ✅ Si existe en Bsale → guarda la orden con datos de Bsale
   - ❌ Si no existe → muestra error y no permite guardar
   - ❌ Si ya está registrado → muestra error de duplicado

### Verificar en la consola del navegador:
Abre las herramientas de desarrollador (F12) y revisa:
- Si ves advertencias sobre "Token no configurado" → verifica el `.env`
- Si ves errores 401/403 → el token no tiene permisos o es de sandbox
- Si ves errores de conexión → verifica tu internet y la URL de la API

## 📚 Documentación

- [Documentación oficial de Bsale API](https://docs.bsale.dev)
- [Primeros pasos](https://docs.bsale.dev/get-started)
- [FAQ](https://apichile.bsalelab.com/faq)

## ⚠️ Notas Importantes

- **El token de sandbox NO funciona con boletas reales** - necesitas un token de producción
- El token debe tener el prefijo `PUBLIC_` para ser accesible desde el navegador
- No compartas tu token públicamente (no lo subas a Git)
- Si cambias el token, reinicia el servidor

