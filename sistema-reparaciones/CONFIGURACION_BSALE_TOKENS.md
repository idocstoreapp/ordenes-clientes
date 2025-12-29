# 🔑 Configuración de Tokens de Bsale

## 📋 Información de las Empresas

### Empresa 1: FIX PRO COMPANY SPA
- **RUT**: 77256261-6
- **Token**: `b2d5a1042405501fa165cd625919a9d4f531f6ce`
- **Usuario**: DANIEL LIZARAZO
- **Correo**: daniel_lizarazo18@hotmail.com

### Empresa 2: FIXPRO SPA
- **RUT**: 77064513-1
- **Token**: `0680bbf2719463d3b40ca4b0d5ed998f38ee3f79`

## ⚙️ Configuración

### Opción 1: Múltiples Tokens (Recomendado)

Para validar facturas de ambas empresas, configura la variable de entorno con ambos tokens separados por coma:

**En Vercel:**
```bash
PUBLIC_BSALE_ACCESS_TOKENS=b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79
```

**En archivo `.env.local` (desarrollo):**
```
PUBLIC_BSALE_ACCESS_TOKENS=b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79
```

### Opción 2: Token Único (Solo una empresa)

Si solo necesitas validar con una empresa, puedes usar:

```bash
PUBLIC_BSALE_ACCESS_TOKEN=b2d5a1042405501fa165cd625919a9d4f531f6ce
```

## 🚀 Cómo Configurar en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega la variable:
   - **Name**: `PUBLIC_BSALE_ACCESS_TOKENS`
   - **Value**: `b2d5a1042405501fa165cd625919a9d4f531f6ce,0680bbf2719463d3b40ca4b0d5ed998f38ee3f79`
   - **Environment**: Selecciona todas (Production, Preview, Development)
5. Haz clic en **Save**
6. **Re-despliega** tu aplicación para que los cambios surtan efecto

## ✅ Cómo Funciona

El sistema ahora:

1. **Valida con ambos tokens**: Cuando un técnico ingresa un número de factura, el sistema intenta validarlo con ambos tokens de Bsale.

2. **Bloquea facturas inválidas**: Si el número de factura **NO existe** en ninguna de las dos empresas de Bsale, el sistema:
   - Muestra un mensaje de error claro al técnico
   - **NO permite** guardar la orden hasta que se corrija el número

3. **Extrae datos automáticamente**: Si la factura existe, el sistema extrae automáticamente:
   - Número de documento
   - URL del documento en Bsale
   - Monto total de la factura

## 🧪 Pruebas

### Probar con una factura válida:
1. Ingresa un número de factura que exista en alguna de las dos empresas
2. El sistema debería validar correctamente y permitir guardar

### Probar con una factura inválida:
1. Ingresa un número de factura que NO existe (ej: "999999")
2. El sistema debería mostrar: "⚠️ El número de factura '999999' no existe en Bsale. Por favor, verifica que el número sea correcto."
3. No debería permitir guardar la orden

## ⚠️ Notas Importantes

- **Los tokens son sensibles**: No los compartas públicamente ni los subas a Git
- **Re-despliegue necesario**: Después de agregar las variables en Vercel, debes re-desplegar la aplicación
- **Validación obligatoria**: El sistema ahora **bloquea** el guardado si la factura no existe en Bsale
- **Múltiples empresas**: El sistema busca en ambas empresas automáticamente

## 🔍 Troubleshooting

### Error: "Tokens de Bsale no configurados"
- Verifica que la variable `PUBLIC_BSALE_ACCESS_TOKENS` esté configurada en Vercel
- Asegúrate de haber re-desplegado después de agregar la variable

### Error: "El número de factura no existe en Bsale"
- Verifica que el número de factura sea correcto
- Asegúrate de que la factura exista en alguna de las dos empresas configuradas
- Verifica que los tokens sean válidos y tengan acceso a las facturas

### La validación no funciona
- Revisa la consola del navegador (F12) para ver errores detallados
- Verifica que los tokens sean correctos
- Asegúrate de que la URL de la API sea correcta (por defecto: `https://api.bsale.cl`)








