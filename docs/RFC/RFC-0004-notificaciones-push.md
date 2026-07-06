# RFC-0004 — Sistema de Notificaciones Push (Telegram / Email)

## Metadata

| Campo             | Valor                               |
| ----------------- | ----------------------------------- |
| Autor             | Alejandro Maturana                  |
| Estado            | DRAFT                               |
| Fecha de apertura | 2026-07-05                          |
| Fecha de cierre   | 2026-07-19                          |
| ADR resultado     | Pendiente                           |
| Área              | Backend / Mobile                    |
| EDD relacionado   | EDD-002 (Motor de Reglas y Recetas) |

---

## Resumen

Diseñar e implementar un sistema de notificaciones push para alertar proactivamente a los operadores en caso de alarmas críticas (ej: temperatura > 32°C, fallos de sensores) a través de bots de Telegram y correos electrónicos.

---

## Motivación

Actualmente las alarmas generadas por el sistema (tanto en firmware como en backend) solo son visibles en el Dashboard web a través del stream de Server-Sent Events (SSE). Si el operador no tiene la pestaña del navegador abierta:

1. No se entera de fallas críticas (ej: sobrecalentamiento de la cámara)
2. No puede reaccionar a tiempo, arriesgando la pérdida del lote de cultivo
3. Carece de un historial de notificaciones fuera de la base de datos

Un bot de Telegram y notificaciones por email ofrecen canales de alerta asíncronos y proactivos con un esfuerzo de implementación relativamente bajo.

---

## Diseño detallado

### Arquitectura de notificaciones

```
[ControlEngine] o [Firmware error]
      │
      ▼
[AlarmService.js] (crea alarma en DB)
      │
      ▼
[NotificationDispatcher.js] (evalúa preferencias del usuario)
      ├── Telegram Bot API (mensajes urgentes)
      └── Nodemailer / SendGrid (reportes diarios / resúmenes)
```

### Canal Telegram: Registro de usuario

Para vincular la cuenta de Telegram del operador con su usuario en Mush2:

1. El usuario va a `/settings` en el frontend.
2. Hace click en "Vincular Telegram". El backend genera un token de un solo uso (ej: `/start link_12345`).
3. El usuario abre el bot de Telegram de Mush2 (`@Mush2Bot`) e inicia conversación con `/start link_12345`.
4. El bot recibe el comando, valida el token con el backend y guarda el `chat_id` en el perfil del usuario en la base de datos.

```sql
ALTER TABLE "Users" ADD COLUMN "telegramChatId" VARCHAR(255) NULL;
```

### Servicio de despacho de notificaciones (NotificationDispatcher.js)

```javascript
import TelegramBot from 'node-telegram-bot-api';
import nodemailer from 'nodemailer';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
const transporter = nodemailer.createTransport({...});

export async function dispatchNotification(userId, alarm) {
  const user = await User.findByPk(userId);
  if (!user) return;

  const message = `⚠️ [Mush2 Alerta] ${alarm.severity.toUpperCase()}: ${alarm.message} en dispositivo ${alarm.deviceId}`;

  // 1. Enviar a Telegram si está vinculado
  if (user.telegramChatId && alarm.severity === 'critical') {
    try {
      await bot.sendMessage(user.telegramChatId, message, { parse_mode: 'HTML' });
    } catch (err) {
      console.error(`Error enviando Telegram a ${user.username}:`, err);
    }
  }

  // 2. Enviar email si el usuario tiene alertas activadas
  if (user.emailAlertsEnabled) {
    try {
      await transporter.sendMail({
        from: '"Mush2 Alert System" <alerts@mush2.io>',
        to: user.email,
        subject: `[Alerta ${alarm.severity}] Mush2 Device ${alarm.deviceId}`,
        text: message,
      });
    } catch (err) {
      console.error(`Error enviando email a ${user.username}:`, err);
    }
  }
}
```

---

## Alternativas consideradas

| Opción                     | Pros                                                                 | Contras                                                  | Decisión                              |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| **Telegram Bot (elegida)** | Gratuito, API simple, notificaciones instantáneas y nativas en móvil | Requiere que el usuario tenga Telegram instalado         | ✅ Elegido para canal móvil inmediato |
| SMS (Twilio)               | Universal                                                            | Costo por mensaje elevado en fase piloto                 | ❌ Descartado por costos              |
| Firebase Cloud Push (FCM)  | Notificaciones push nativas en app móvil                             | Requiere compilar y distribuir app nativa (Fase 17)      | ❌ Diferido para Fase 17              |
| WhatsApp Business API      | Muy popular                                                          | API costosa y restrictiva para alertas de automatización | ❌ Descartado                         |

---

## Impacto en compatibilidad

- **Backend**: adición de variables de entorno (`TELEGRAM_TOKEN`, configuración SMTP), modelo `User` con campos nuevos.
- **Frontend**: nueva sección en Settings para vincular Telegram.
- **Base de datos**: migración para añadir `telegramChatId` y `emailAlertsEnabled` a la tabla `Users`.
- Sin impacto en firmware.

---

## Preguntas abiertas

1. ¿Cómo gestionamos el rate-limiting de Telegram para evitar que el bot sea bloqueado si una cámara tiene flapping de sensores? (Sugerido: deduplicar a nivel de `NotificationDispatcher` y enviar máximo 1 mensaje cada 5 minutos por el mismo tipo de alarma).
2. ¿Debe el bot de Telegram permitir comandos interactivos? (ej: `/status` para consultar telemetría, `/off` para apagar alarmas).
3. ¿Qué servicio SMTP usaremos en desarrollo y producción? (Sugerido: Maildev en local, SendGrid/Postmark en prod).

---

## Decisión

**Estado final:** DRAFT — Pendiente de revisión

**ADR generado:** Pendiente de aceptación
