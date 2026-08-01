// Parser de comandos canónicos (RFC-0009 §5.1 / ADR-030).
//
// Replica la semántica del firmware (firmware/src/mqtt_client.cpp:264-301 y
// tasks.cpp:157-206) para que el simulador se comporte EXACTAMENTE igual que un
// dispositivo físico frente al backend:
//
//   - JSON inválido o formato legacy actuators[]  → no es comando, sin ACK.
//   - type !== 'ACTUATOR_SET'                      → status UNKNOWN_CMD (ch 0).
//   - channel fuera de 1..4                         → status INVALID_CHANNEL (ch 0).
//   - cmdId no vacío y duplicado                    → status ALREADY_EXECUTED.
//   - válido                                        → status OK.
//
// AISLAMIENTO DEL PROTOCOLO: módulo puro, sin dependencias de mqtt/node.
// Candidato a migrar a packages/protocol.

export const COMMAND_TYPE = 'ACTUATOR_SET';
export const CHANNELS = [1, 2, 3, 4];

export function parseCommand(raw) {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'PARSE_ERROR' };
    }
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'PARSE_ERROR' };
  }

  const command = raw.command;
  if (command === null || typeof command !== 'object' || Array.isArray(command)) {
    return { ok: false, reason: 'NOT_COMMAND' };
  }

  const parsed = {
    cmdId: typeof raw.cmdId === 'string' ? raw.cmdId : '',
    source: typeof raw.source === 'string' ? raw.source : '',
    ts: typeof raw.ts === 'number' ? raw.ts : null,
    type: typeof command.type === 'string' ? command.type : '',
    channel: typeof command.channel === 'number' ? command.channel : 0,
    value: command.value === true || command.value === false ? command.value : false,
    setpoints: command.setpoints || raw.setpoints,
    phase: typeof raw.phase === 'string' ? raw.phase : '',
  };

  if (parsed.type !== COMMAND_TYPE) {
    return { ok: true, command: parsed, status: 'UNKNOWN_CMD' };
  }

  const channel = parsed.channel;
  if (!Number.isInteger(channel) || channel < 1 || channel > 4) {
    return { ok: true, command: parsed, status: 'INVALID_CHANNEL' };
  }

  return { ok: true, command: parsed, status: 'OK' };
}
