#!/usr/bin/env python3
"""Gate de cobertura I105 (PR-H).

Verifica que la cobertura de lineas de los modulos objetivo del firmware
compilados por la suite nativa (pio test -c platformio.test.ini -e native)
supere el umbral minimo del DoD (por defecto 60%).

Uso:
    python test/scripts/coverage_gate.py            # umbral 60%
    python test/scripts/coverage_gate.py --min 70   # umbral custom

Debe ejecutarse desde firmware/ tras correr la suite nativa (los .gcda
quedan en .pio/build/native/test). Necesita gcov del toolchain nativo en
el PATH.
"""
import argparse
import os
import re
import subprocess
import sys

# Modulos de produccion objetivo de I105 (cobertura agregada sobre estos).
TARGET_MODULES = [
    "src/ota_decisor.cpp",
    "src/hysteresis_controller.cpp",
    "src/actuator_nvs.cpp",
    "src/ota_nvs.cpp",
    "src/telemetry_buffer.cpp",
    "src/logger.cpp",
    "src/event_bus.cpp",
]

BUILD_TEST_DIR = os.path.join(".pio", "build", "native", "test")

FILE_RE = re.compile(r"^File '(.*)'$")
LINES_RE = re.compile(r"^Lines executed:(\d+(?:\.\d+)?)% of (\d+)$")


def run_gcov():
    gcda_files = [
        os.path.join(BUILD_TEST_DIR, f)
        for f in sorted(os.listdir(BUILD_TEST_DIR))
        if f.endswith(".gcda")
    ]
    if not gcda_files:
        print("ERROR: no hay .gcda en %s. Ejecuta primero la suite nativa." % BUILD_TEST_DIR)
        sys.exit(2)
    proc = subprocess.run(
        ["gcov", "-m", "-o", BUILD_TEST_DIR] + gcda_files,
        capture_output=True,
        text=True,
        cwd=os.getcwd(),
    )
    return proc.stdout


def parse_gcov(out):
    files = {}
    current = None
    for line in out.splitlines():
        m = FILE_RE.match(line)
        if m:
            current = m.group(1)
            continue
        m = LINES_RE.match(line.strip())
        if m and current:
            files[current] = (float(m.group(1)), int(m.group(2)))
    return files


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min", type=float, default=60.0, help="Umbral minimo (%%).")
    args = parser.parse_args()

    files = parse_gcov(run_gcov())
    if not files:
        print("ERROR: gcov no produjo resultados.")
        sys.exit(2)

    total_lines = 0
    covered_lines = 0
    missing = []
    print("%-40s %8s %8s" % ("Modulo", "Lineas", "Cobertura"))
    print("-" * 60)
    for mod in TARGET_MODULES:
        norm = mod.replace("\\", "/")
        key = next((k for k in files if k.replace("\\", "/").endswith(norm)), None)
        if not key:
            missing.append(mod)
            continue
        pct, total = files[key]
        covered = total * pct / 100.0
        total_lines += total
        covered_lines += covered
        print("%-40s %8d %7.1f%%" % (norm, total, pct))

    print("-" * 60)
    if missing:
        print("ERROR: modulos sin datos de cobertura: %s" % ", ".join(missing))
        sys.exit(2)

    if total_lines == 0:
        print("ERROR: sin lineas ejecutables en los modulos objetivo.")
        sys.exit(2)

    overall = covered_lines * 100.0 / total_lines
    print("%-40s %8d %7.1f%%  (umbral >= %.1f%%)"
          % ("TOTAL", total_lines, overall, args.min))
    if overall < args.min:
        print("FAIL: cobertura por debajo del umbral I105.")
        sys.exit(1)
    print("PASS: gate de cobertura I105 superado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
