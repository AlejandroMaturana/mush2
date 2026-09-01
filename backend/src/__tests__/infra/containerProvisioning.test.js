/**
 * Contract tests — Provisioning MQTT en el contenedor de producción (I081 / INF-022).
 *
 * Garantizan que la imagen prod y el stack prod-like local (ADR-029) mantienen el
 * contrato necesario para que MosquittoProvisioningService funcione dentro del
 * contenedor:
 *
 *   1. La imagen copia `docker/mosquitto` (config) — el path por defecto que
 *      resuelve `env.MQTT_PROVISIONING.passwordFile` (ROOT=docker/mosquitto/prod).
 *   2. La imagen trae `docker-cli` para el SIGHUP de recarga (reload()).
 *   3. `docker-compose.yml` comparte el password_file entre backend (rw) y broker (ro).
 *   4. `.dockerignore` excluye certs/keys y password_file del build context (sin
 *      secretos horneados en la imagen).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../');

function readLines(relPath) {
  return readFileSync(resolve(REPO_ROOT, relPath), 'utf-8').split(/\r?\n/);
}

function normalize(line) {
  return line.trim().replace(/\s+/g, ' ');
}

/**
 * Extrae las líneas de la etapa de producción del Dockerfile
 * (desde `FROM ... AS production` en adelante).
 */
function productionStageLines() {
  const lines = readLines('Dockerfile');
  const idx = lines.findIndex((l) => l.includes('AS production'));
  return idx >= 0 ? lines.slice(idx) : [];
}

/**
 * Extrae las líneas de la sección `volumes:` de un servicio del docker-compose.
 * Parser mínimo orientado a la estructura fija del proyecto (2 espacios por nivel).
 */
function composeVolumes(serviceName) {
  const lines = readLines('docker-compose.yml');
  const volumes = [];
  let inService = false;
  let inVolumes = false;

  for (const raw of lines) {
    const line = raw;

    if (/^  [A-Za-z0-9_-]+:$/.test(line)) {
      inService = line.trim().replace(/:$/, '') === serviceName;
      inVolumes = false;
      continue;
    }

    if (!inService) continue;

    if (/^    volumes:$/.test(line)) {
      inVolumes = true;
      continue;
    }

    if (/^    [A-Za-z0-9_-]+:/.test(line)) {
      inVolumes = false;
      continue;
    }

    if (inVolumes && /^      - /.test(line)) {
      volumes.push(normalize(line.replace(/^      - /, '')));
    }
  }

  return volumes;
}

describe('Provisioning MQTT en el contenedor de producción (I081/INF-022)', () => {
  describe('Dockerfile — imagen prod autocontenida para provisioning', () => {
    it('copia docker/mosquitto en la etapa de producción (path de passwordFile existente)', () => {
      const copy = productionStageLines().find((l) => /^COPY\s+docker\/mosquitto/.test(l.trim()));
      expect(copy).toBeTruthy();
    });

    it('incluye docker-cli en la etapa de producción (SIGHUP de reload a mush2-mosquitto)', () => {
      const apk = productionStageLines().find((l) => /^RUN\s+apk\s+add/.test(l.trim()));
      expect(apk).toBeTruthy();
      expect(apk.includes('docker-cli')).toBe(true);
    });
  });

  describe('docker-compose.yml — volumen compartido del password_file', () => {
    it('el backend monta docker/mosquitto/prod como volumen rw (escribe el password_file)', () => {
      const volumes = composeVolumes('backend');
      expect(volumes).toContain('./docker/mosquitto/prod:/app/docker/mosquitto/prod');
    });

    it('el broker monta el mismo docker/mosquitto/prod read-only en /mosquitto/config', () => {
      const volumes = composeVolumes('mosquitto');
      expect(volumes).toContain('./docker/mosquitto/prod:/mosquitto/config:ro');
    });

    it('el backend monta el socket de Docker para recargar el broker con SIGHUP', () => {
      const volumes = composeVolumes('backend');
      expect(volumes).toContain('/var/run/docker.sock:/var/run/docker.sock');
    });
  });

  describe('.dockerignore — sin secretos horneados en la imagen', () => {
    it('excluye certs/keys del broker del build context', () => {
      const lines = readLines('.dockerignore').map(normalize);
      expect(lines).toContain('docker/mosquitto/certs');
    });

    it('excluye los password_file reales del build context', () => {
      const lines = readLines('.dockerignore').map(normalize);
      expect(lines).toContain('docker/mosquitto/*/password_file');
    });
  });
});
