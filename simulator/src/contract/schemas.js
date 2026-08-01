// Carga de los schemas canónicos del contrato (FASE 0.5).
//
// Los schemas viven en docs/contracts/conformance/schemas/ y son la fuente única
// del contrato congelado. Este loader resuelve la ruta relativa al repo raíz,
// independientemente del cwd desde el que se invoque el simulador.
//
// AISLAMIENTO DEL PROTOCOLO: candidato a migrar a packages/protocol.

import { readFileSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../');
const SCHEMAS_DIR = join(REPO_ROOT, 'docs/contracts/conformance/schemas');

export function loadSchemas() {
  const schemas = {};
  for (const file of readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'))) {
    schemas[file] = JSON.parse(readFileSync(join(SCHEMAS_DIR, file), 'utf-8'));
  }
  return schemas;
}

export function getSchema(name) {
  return loadSchemas()[name];
}
