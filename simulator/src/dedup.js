// Deduplicación de cmdId en memoria (política MVP de FASE 1).
//
// Estructura acotada: LRU (Map con límite de tamaño) + TTL (expiración por
// antigüedad). No hay persistencia ni historial permanente; el historial
// completo se pierde al reiniciar el proceso, igual que el anillo de dedup del
// firmware (CMD_DEDUP_RING_SIZE en firmware/src/tasks.cpp).
//
// Semántica: un cmdId vacío nunca se considera duplicado (paridad con el
// firmware: `if (msg->cmdId[0] != '\0' && cmdIsDuplicate(...))`).

export class CmdIdDedup {
  constructor({ maxSize = 128, ttlMs = 60000, now = Date.now } = {}) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map();
  }

  _prune(now) {
    for (const [id, at] of this.map) {
      if (now - at > this.ttlMs) this.map.delete(id);
      else break;
    }
    while (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value);
    }
  }

  isDuplicate(cmdId) {
    if (!cmdId) return false;
    const now = this.now();
    this._prune(now);
    if (this.map.has(cmdId)) return true;
    this.map.set(cmdId, now);
    return false;
  }

  get size() {
    this._prune(this.now());
    return this.map.size;
  }
}
