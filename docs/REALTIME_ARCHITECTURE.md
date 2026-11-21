# Propuesta de Arquitectura para Control Remoto en Tiempo Real (RoboKinetic 3D)

> **Alcance del documento:** Diseño técnico de arquitectura multiusuario (solo diseño, sin implementación de código de red) para sincronizar **RoboKinetic 3D** (Vite + React + Three.js) con roles diferenciados de **Operador** y **Espectador**.

---

## 1. Objetivos y Requisitos del Sistema

1. **Separación de Roles:**
   - **Operador (1 por sala / sesión):** Único cliente con autoridad de escritura sobre el estado del manipulador (sliders articulares $\theta_1, \theta_2, \theta_3$, apertura de pinza, posicionamiento cartesiano XYZ, masa de carga y comandos de rutina Pick & Place).
   - **Espectador ($N$ concurrentes):** Clientes de solo lectura que observan la escena 3D y las telemetrías en vivo con los controles de movimiento deshabilitados.
2. **Baja Latencia:** Transmisión fluida del vector mínimo `[theta1Deg, theta2Deg, theta3Deg, gripperAperture]` con latencia extremo a extremo ideal $< 50\text{ ms}$.
3. **Hidratación Inicial (Late-Joiner Sync):** Cualquier espectador que ingrese a mitad de una operación o rutina debe recibir de forma inmediata el último estado completo antes de aplicar actualizaciones continuas.
4. **Renderizado Continuo a 60 FPS:** La llegada discreta de paquetes de red ($20\text{--}30\text{ Hz}$) nunca debe producir saltos o *stuttering* en el canvas Three.js del espectador.

---

## 2. Comparativa de Tecnologías para Vite + Three.js

| Criterio | WebSockets / PartyKit (Edge Durable Objects) | Supabase Realtime (Broadcast + Presence) | Firebase (Realtime Database / Firestore) |
| :--- | :--- | :--- | :--- |
| **Modelo de transporte** | WebSocket bidireccional puro sobre Cloudflare Workers / Durable Objects. | WebSockets gestionados sobre Phoenix Channels (Elixir). | WebSockets / HTTP Long-Polling sobre JSON Tree (RTDB) o gRPC-Web (Firestore). |
| **Latencia típica** | **Muy baja (15–40 ms)** gracias a ejecución en el Edge cercano al usuario. | **Baja (40–90 ms)** en modo *Broadcast* (sin persistencia en Postgres). | **Media (60–150 ms)** en RTDB; mayor en Firestore por validación de documentos. |
| **Frecuencia óptima (Hz)** | **20–60 Hz** sin penalizaciones por escritura en disco. | **15–30 Hz** en canal Broadcast efímero. | Limitado por cuota de escrituras/lecturas facturadas por evento en Firestore; RTDB soporta ~10–20 Hz. |
| **Estado en memoria en servidor** | **Nativo:** Cada sala (`Room`) mantiene el estado actual en RAM en un Durable Object. | Efímero en *Broadcast*; requiere *Presence* o consulta inicial a Postgres para estado previo. | Persistente por defecto en la base de datos en la nube. |
| **Arbitraje de rol Operador** | **Atómico en servidor (`onConnect` / `onMessage`)**; evita condiciones de carrera. | Basado en *Presence* / *Postgres RLS*; requiere lógica extra para evitar doble operador simultáneo. | Basado en *Security Rules* + `onDisconnect()` en RTDB. |
| **Complejidad con Vite** | Mínima (`partysocket` cliente ligero, ~4 KB gzipped). | Baja (`@supabase/supabase-js`). | Media (`firebase/database`, SDK más pesado). |
| **Coste para telemetría continua** | Muy bajo (facturación por conexión/CPU en Edge, sin cobro por cada I/O de disco). | Moderado (límites de mensajes Broadcast por segundo según plan). | Alto a 20–30 Hz si se usa Firestore; moderado en RTDB por ancho de banda. |

### Decisión Arquitectónica Recomendada

- **Opción Principal Recomendada: PartyKit (WebSockets en el Edge / Durable Objects).**
  - **Por qué encaja mejor:** Un manipulador robótico en vivo genera un flujo continuo de ángulos a **20–30 Hz** que es **telemetría efímera**, no datos transaccionales de base de datos. Un Durable Object por sala actúa como árbitro autoritativo en memoria RAM: valida en $< 1\text{ ms}$ que el emisor sea el `Operador` activo, almacena el último snapshot para nuevos espectadores y reenvía paquetes binarios o JSON mínimos por WebSocket a todos los espectadores sin tocar disco.
- **Alternativa BaaS sin servidor propio: Supabase Realtime (Broadcast + Presence).**
  - Ideal si el proyecto ya requiere autenticación de usuarios o almacenamiento histórico en PostgreSQL. Se utiliza un canal efímero `broadcast` (`ack: false`) para los ángulos a `20 Hz` y `presence` para anunciar quién posee el token de `Operador` y publicar el snapshot de estado al unirse.

---

## 3. Arquitectura de Control de Roles y Topología

```
+-----------------------+         WSS (20-30 Hz)          +----------------------------+
|   Cliente OPERADOR    | ------------------------------> |   Sala WebSocket / Edge    |
|  (Vite + Three.js)    |   STATE_TICK / ROUTINE_EVENT    |   (PartyKit Room / Server) |
|  - Sliders / XYZ / PnP| <------------------------------ |  - Estado en memoria (RAM) |
+-----------------------+        ROLE_ASSIGNED            |  - Mutex Operador único    |
                                                          +-------------+--------------+
                                                                        |
                                              WSS Broadcast (20-30 Hz)  |  INITIAL_SNAPSHOT
                                              + Late-Joiner Snapshot    |  al conectar
                                                                        v
                                                          +----------------------------+
                                                          |   Clientes ESPECTADORES    |
                                                          |     (N x Vite + Three)     |
                                                          |  - UI solo lectura         |
                                                          |  - Interpolación 60 FPS    |
                                                          +----------------------------+
```

### Reglas de Arbitraje de Roles (`Operador` vs `Espectador`)

1. **Bloqueo Exclusivo (Single-Operator Mutex):** La sala mantiene `operatorConnectionId: string | null`.
2. **Asignación y Relevo:**
   - Al entrar el primer cliente o al solicitar control (`CLAIM_OPERATOR`), el servidor asigna el rol si `operatorConnectionId === null`.
   - Si ya existe un operador activo, el nuevo usuario entra automáticamente como `Espectador` y su UI oculta/bloquea controles de escritura.
   - Si el operador desea ceder el control (`RELEASE_OPERATOR`), el servidor libera el bloqueo y notifica `ROLE_CHANGED` a la sala.
3. **Recuperación ante Desconexión (Fail-safe):** El WebSocket dispara `onClose` (y un *heartbeat* cada `5 s` con *timeout* de `10 s`). Si el operador pierde conexión, el servidor libera el rol automáticamente y envía un evento `OPERATOR_DISCONNECTED` para que otro participante pueda asumir el mando sin dejar la sala bloqueada.

---

## 4. Protocolo de Sincronización y Vector de Estado

Para minimizar el ancho de banda y mantener la latencia bajo control, se separan las tramas frecuentes de las tramas de configuración/eventos.

### 4.1. Vector de Estado en Vivo (`STATE_TICK`) — Emisión a 20–30 Hz

El operador solo emite cuando los valores cambian (con *throttling* a **33–50 ms**, es decir, 20–30 paquetes/seg) y cuantizados a **2 decimales** (suficiente para precisión visual $< 0.01^\circ$):

```json
{
  "t": "tick",
  "seq": 1482,
  "ts": 1732150045120,
  "v": [45.25, 34.80, -25.10, 29.0]
}
```
Donde `v` corresponde exactamente a **`[θ₁, θ₂, θ₃, aperturaPinza]`**.
*(Opcionalmente puede codificarse en `Float32Array` de 16 bytes binarios sobre WebSocket para eliminar por completo el overhead de parsing JSON).*

### 4.2. Snapshot Inicial (`INITIAL_SNAPSHOT`) — Al conectarse un cliente

El servidor mantiene en memoria el estado completo de la celda robótica y lo envía únicamente al socket recién conectado antes de suscribirlo al flujo `tick`:

```json
{
  "t": "snapshot",
  "role": "spectator",
  "operatorId": "conn_abc123",
  "state": {
    "joints": [0.0, 100.0, -120.0, 14.0],
    "links": { "l1": 1.75, "l2": 1.45, "hBase": 0.60 },
    "payloadMass": 2.0,
    "cubeLocation": "pick",
    "routineStatus": "IDLE",
    "statusMessage": "Listo para iniciar rutina"
  }
}
```

### 4.3. Eventos Discretos (`STATE_META`) — Solo bajo cambio

Cambios de baja frecuencia (`l1`, `l2`, `payloadMass`, `cubeLocation`, `routineStatus`, `statusMessage`) se envían únicamente cuando ocurren (no en cada tick de 30 Hz), reduciendo el tráfico en más de un 80 %.

---

## 5. Interpolación Suave en el Cliente Espectador (60 FPS)

Aunque el operador transmita a **20–30 Hz** (un paquete cada `33–50 ms`), el visor Three.js renderiza a **60–120 Hz** (`~8–16 ms` por frame). Si el espectador asignara directamente los ángulos recibidos al estado React, el robot avanzaría a saltos y provocaría re-renders innecesarios de React.

### Estrategia Recomendada en Two-Tier State

1. **Separar Estado de Red (`targetPoseRef`) del Render Loop Three.js:**
   - Los mensajes `tick` entrantes **no disparan `setState` a 30 Hz**; actualizan una referencia mutable (`targetPoseRef.current = { t1, t2, t3, grip, serverTs }`) y un estado React *throttled* (p. ej. a `10 Hz`) solo para las lecturas numéricas del panel lateral.
2. **Suavizado Exponencial Independiente del Framerate (`THREE.MathUtils.damp`):**
   - Dentro del bucle `requestAnimationFrame` de `Viewport3D.jsx`, usando `deltaSeconds` del reloj de Three.js (`THREE.Clock`):
     ```js
     // Ejemplo conceptual (solo referencia de diseño)
     const lambda = 18; // Factor de respuesta (~55ms de constante temporal)
     displayPose.t1 = THREE.MathUtils.damp(displayPose.t1, targetPose.t1, lambda, deltaSeconds);
     displayPose.t2 = THREE.MathUtils.damp(displayPose.t2, targetPose.t2, lambda, deltaSeconds);
     displayPose.t3 = THREE.MathUtils.damp(displayPose.t3, targetPose.t3, lambda, deltaSeconds);
     displayPose.grip = THREE.MathUtils.damp(displayPose.grip, targetPose.grip, lambda, deltaSeconds);
     ```
   - **Nota sobre `θ₁` (Base -180° a +180°):** Como `J1` posee tope físico en `[-180°, +180°]`, la interpolación lineal amortiguada sigue exactamente el arco real del servomotor sin cruzar el tope mecánico.
3. **Buffer de Jitter Opcional (para redes móviles):**
   - Si se detecta varianza alta de latencia, el espectador puede mantener una pequeña cola de los últimos 2–3 paquetes con retraso fijo de `50 ms` (*interpolation delay*) e interpolar linealmente entre el paquete $k$ y $k+1$ según el reloj local.

---

## 6. Resumen de Flujo Operativo

1. **Operador mueve un slider / ejecuta Pick & Place / envía coordenada XYZ:**
   - La validación física (`clampPoseToWorkspace` e `inverseKinematics3DOF`) se ejecuta localmente en el cliente del Operador para garantizar respuesta instantánea a 60 FPS.
   - Un emisor *throttled* envía `[θ₁, θ₂, θ₃, aperturaPinza]` a 25 Hz por WebSocket.
2. **Servidor Edge (PartyKit Room):**
   - Verifica `sender.id === operatorConnectionId`.
   - Actualiza `roomState.joints` en memoria.
   - Reenvía el paquete al resto de sockets conectados en la sala.
3. **Espectadores:**
   - Al entrar, aplican inmediatamente `INITIAL_SNAPSHOT` (sin empezar en `0°`).
   - En cada paquete `tick`, actualizan el objetivo e interpolan suavemente en el loop de Three.js a 60+ FPS, manteniendo los paneles de telemetría y cálculo de torque sincronizados en tiempo real.
