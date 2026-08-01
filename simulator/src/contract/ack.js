// Constructor de ACK canónico (RFC-0009 §5.2 / ADR-030 / ack.schema.json).
//
// Replica el payload emitido por el firmware (tasks.cpp:147-155):
//   { cmdId, channel, state: boolean, status, ts }
// La resolución de estados sigue la precedencia del firmware: UNKNOWN_CMD
// (type desconocido) antes que INVALID_CHANNEL, y ALREADY_EXECUTED solo
// cuando el cmdId es un duplicado no vacío.
//
// AISLAMIENTO DEL PROTOCOLO: módulo puro, candidato a migrar a packages/protocol.

export const ACK_STATUS = {
  OK: 'OK',
  INVALID_CHANNEL: 'INVALID_CHANNEL',
  INVALID_STATE: 'INVALID_STATE',
  BUSY: 'BUSY',
  UNKNOWN_CMD: 'UNKNOWN_CMD',
  ALREADY_EXECUTED: 'ALREADY_EXECUTED',
};

export function resolveAckStatus(parseResult) {
  if (!parseResult.ok) return null;
  const { status, command } = parseResult;
  if (status === 'UNKNOWN_CMD') return ACK_STATUS.UNKNOWN_CMD;
  if (status === 'INVALID_CHANNEL') return ACK_STATUS.INVALID_CHANNEL;
  return ACK_STATUS.OK;
}

export function buildAck({ cmdId = '', channel = 0, state = false, status = ACK_STATUS.OK, ts }) {
  if (!Number.isInteger(ts) || ts <= 0) {
    ts = Math.floor(Date.now() / 1000);
  }
  return {
    cmdId: String(cmdId),
    channel: Number(channel),
    state: state === true || state === 1,
    status,
    ts,
  };
}

export function ackForParseResult(parseResult, { cmdId, channel, state, ts }) {
  const status = resolveAckStatus(parseResult);
  if (!status) return null;
  return buildAck({ cmdId, channel, state, status, ts });
}
