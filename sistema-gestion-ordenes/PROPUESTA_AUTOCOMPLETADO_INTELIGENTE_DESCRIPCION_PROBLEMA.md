# Propuesta: Autocompletado Inteligente de Descripción de Problemas

## Objetivo
Mejorar la calidad y velocidad de captura de **Descripción del Problema** en la orden, pasando de frases genéricas a descripciones:

- completas,
- específicas por dispositivo,
- consistentes entre técnicos,
- y editables (nunca bloqueadas).

La idea es mantener la precisión de descripciones largas, pero con ayuda guiada para reducir tiempo y errores.

---

## Problema actual
Hoy el sistema usa sugerencias muy simples (frases fijas), lo que provoca:

1. **Poca cobertura de casos reales**.
2. **Baja precisión técnica** (falta síntoma + contexto + limitaciones de prueba + alcance de intervención).
3. **Inconsistencia** entre técnicos para un mismo tipo de falla.
4. **Sin adaptación al tipo de equipo** (celular, tablet, notebook, smartwatch, etc.).

---

## Enfoque propuesto (híbrido, práctico y escalable)

Combinar 4 mecanismos en una sola experiencia:

1. **Plantillas estructuradas por familia de falla**
2. **Autocompletado contextual por tipo de dispositivo**
3. **Bloques inteligentes (“chips”) de texto técnico**
4. **Motor de ranking por historial real (aprendizaje gradual)**

### 1) Plantillas estructuradas por familia de falla
En vez de una sola frase sugerida, usar una estructura reusable:

`[Síntoma principal] + [Estado de ingreso] + [Limitación de pruebas] + [Intervención prevista] + [Condición/Garantía]`

Ejemplo generado:

> “Pantalla trizada con imagen parcial; ingresa encendido; no se prueban funciones por daño de display; se cotiza reemplazo de módulo de pantalla; garantía aplica solo por defecto de repuesto instalado.”

Esto conserva el nivel profesional, pero acelera la redacción.

### 2) Autocompletado contextual por tipo de dispositivo
El sistema ya detecta/infiera tipo de equipo (iPhone, iPad, MacBook y tipos personalizados). Se propone usar eso para filtrar sugerencias relevantes.

- **iPhone/Android**: pantalla, batería, puerto de carga, cámara, Face ID, micrófono, altavoz.
- **iPad/Tablet**: táctil, LCD, conector, consumo anómalo.
- **Notebook/MacBook**: teclado, trackpad, bisagra, batería cíclica, placa, sistema operativo.
- **Watch**: táctil, corona, carga magnética, humedad.

Con esto desaparecen sugerencias fuera de contexto.

### 3) Bloques inteligentes (“chips”)
En la UI de descripción, mostrar chips seleccionables por etapa:

- **Síntoma**: “pantalla trizada”, “equipo no enciende”, “se reinicia”, etc.
- **Ingreso**: “ingresa encendido”, “ingresa apagado”, “sin clave de desbloqueo”, etc.
- **Diagnóstico inicial**: “no se pueden probar funciones por…”, “requiere apertura técnica”, etc.
- **Trabajo propuesto**: “cambio de batería”, “cambio de pantalla”, “limpieza de puerto”, etc.
- **Condiciones**: “pruebas completas al finalizar”, “garantía por repuesto”, etc.

Cada clic agrega una cláusula bien redactada y evita texto ambiguo.

### 4) Ranking inteligente por historial real
No es IA compleja al inicio: basta un ranking por señales simples:

- frecuencia de uso,
- éxito (orden cerrada sin reclamos tempranos),
- técnico/sucursal,
- coincidencia con tipo de equipo + servicios seleccionados,
- recencia.

Así, en 2–3 semanas de uso, las mejores sugerencias suben solas.

---

## Diseño de datos recomendado

## 1) Catálogo maestro de descripciones (`description_problem_data.md` o JSON normalizado)
Conviene migrar ese contenido a JSON/tabla para uso programático.

Estructura sugerida por item:

```json
{
  "id": "screen_cracked_no_test",
  "device_types": ["iphone", "samsung", "xiaomi", "ipad"],
  "service_tags": ["screen_replacement"],
  "symptom_tags": ["screen_cracked", "no_display"],
  "severity": "media",
  "template": "Pantalla trizada; ingresa {{power_state}}; {{test_limitation}}; se cotiza cambio de pantalla; {{warranty_clause}}.",
  "required_vars": ["power_state", "test_limitation", "warranty_clause"],
  "quality_score": 0.92,
  "active": true
}
```

## 2) Diccionario de variables controladas
Ejemplo:

- `power_state`: `ingresa encendido | ingresa apagado`
- `test_limitation`: `no se prueban funciones por daño en display | no se prueba carga por falla de puerto`
- `warranty_clause`: `garantía de 30 días por defecto del repuesto`

Esto obliga consistencia y reduce errores de redacción.

## 3) Telemetría mínima (para ranking)
Registrar evento de uso de sugerencia:

- `suggestion_id`
- `device_type`
- `selected_services`
- `accepted` (sí/no)
- `edited_after_insert` (sí/no)
- `order_outcome` (cerrada/reingreso/reclamo)

---

## UX propuesta (sin fricción para el técnico)

En el campo “Descripción del Problema” agregar:

1. **Sugerencias Top 5** (contextuales) bajo el textarea.
2. **Botón “Construir descripción”** abre mini panel guiado por pasos:
   - Paso 1: síntoma
   - Paso 2: estado de ingreso
   - Paso 3: limitación de pruebas
   - Paso 4: intervención
   - Paso 5: condición final
3. **Inserción editable**: siempre se inserta texto en el textarea para poder ajustar.
4. **Indicador de calidad** (simple):
   - Verde: tiene síntoma + estado + limitación + intervención
   - Amarillo: faltan 1–2 bloques
   - Rojo: texto demasiado corto o ambiguo

---

## Lógica de inferencia (sin LLM, rápida de implementar)

Score de sugerencia:

`score = 0.35 * device_match + 0.25 * service_match + 0.15 * symptom_match + 0.15 * frequency + 0.10 * recency`

Donde:

- `device_match`: 1 si coincide tipo de equipo, 0.5 si es familia similar.
- `service_match`: similitud entre servicios seleccionados y `service_tags`.
- `symptom_match`: palabras clave ya escritas por el técnico.
- `frequency`: uso histórico normalizado.
- `recency`: peso mayor a sugerencias recientes y exitosas.

Esto ya da recomendaciones “inteligentes” sin complejidad alta.

---

## Plan de implementación por fases

## Fase 1 (rápida, 1–2 días)
- Crear dataset normalizado desde el contenido actual.
- Mostrar sugerencias contextuales Top 5 en `OrderForm`.
- Inserción con click + edición manual.

## Fase 2 (3–5 días)
- Constructor por bloques (chips).
- Variables controladas por tipo de equipo.
- Indicador de calidad de descripción.

## Fase 3 (1 semana)
- Telemetría y ranking automático por uso real.
- Panel interno simple para activar/desactivar templates.

---

## Reglas de calidad recomendadas (muy importante)

Para aceptar una descripción como “buena”, validar:

1. Mínimo 90–120 caracteres (según tipo de falla).
2. Debe contener al menos:
   - 1 síntoma,
   - 1 estado de ingreso,
   - 1 cláusula de alcance de prueba o intervención.
3. Evitar términos vagos:
   - “malo”, “no sirve”, “revisar”, sin contexto.
4. Si hay limitación de prueba, debe explicitar causa.

Esto sube la calidad operativa y reduce conflictos post-servicio.

---

## Ejemplos mejorados (comparables al estilo que buscas)

### Caso: cambio de batería (teléfono)
“Equipo ingresa apagado y no retiene carga; batería presenta descarga acelerada según reporte del cliente; no se validan funciones completas hasta reemplazo; se realiza cambio de batería certificada y pruebas funcionales al finalizar; garantía aplica por defecto del componente reemplazado.”

### Caso: pantalla rota sin imagen
“Pantalla con ruptura severa y sin imagen visible; equipo ingresa encendido con respuesta háptica parcial; no es posible validar táctil ni cámaras por falta de visualización; se cotiza reemplazo de módulo completo y pruebas integrales posteriores a instalación.”

### Caso: posible daño por software
“Equipo ingresa encendido con lentitud extrema, ventanas emergentes y consumo anómalo de batería; se detectan indicios de software malicioso; se propone respaldo, limpieza de sistema y optimización; pruebas de estabilidad y rendimiento se realizan al término del proceso.”

---

## Riesgos y cómo mitigarlos

1. **Texto demasiado largo** → usar plantillas por cláusulas cortas.
2. **Descripción robótica** → permitir edición libre y variantes por plantilla.
3. **Sugerencias incorrectas por detección de equipo** → botón “ver sugerencias de otro tipo”.
4. **Curva de adopción** → mantener modo manual siempre disponible.

---

## Decisión recomendada

Sí, vale totalmente la pena implementar este enfoque. La mejor relación impacto/esfuerzo es:

1. **Primero**: dataset estructurado + Top 5 contextual.
2. **Segundo**: constructor por bloques.
3. **Tercero**: ranking por uso real.

Con eso pasas de autocompletado “genérico” a un asistente técnico realmente útil y preciso.

---

## Siguiente paso sugerido

Si te parece bien, en la próxima iteración te preparo:

1. El **formato exacto** del dataset (JSON listo para cargar).
2. Un **MVP en `OrderForm.tsx`** con sugerencias contextuales + inserción en un clic.
3. Una primera **librería de 30–50 plantillas** por tipo de equipo/falla.

