#!/usr/bin/env python3
"""Generate firmware/config.h from .env file."""

import os
import re
import sys

TEMPLATE = '''#ifndef CONFIG_H
#define CONFIG_H

// WiFi
#define WIFI_SSID_1 "{WIFI_SSID_1}"
#define WIFI_PASSWORD_1 "{WIFI_PASSWORD_1}"
#define WIFI_SSID_2 "{WIFI_SSID_2}"
#define WIFI_PASSWORD_2 "{WIFI_PASSWORD_2}"

// ThingSpeak
#define TS_HOST "{TS_HOST}"
#define TS_PORT {TS_PORT}
#define TS_API_KEY "{TS_API_KEY}"

// MQTT
#define MQTT_BROKER "{MQTT_BROKER}"
#define MQTT_PORT {MQTT_PORT}
#define MQTT_BROKER_FALLBACK "{MQTT_BROKER_FALLBACK}"
#define MQTT_PORT_FALLBACK {MQTT_PORT_FALLBACK}

// Intervals (ms)
#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 15000

// SSR
#define SSR_ACTIVE_HIGH 1
#define SSR1_PIN D5  // CH1 — Ventilación
#define SSR2_PIN D7  // CH2 — Calefacción (evita conflicto LED_BUILTIN en D4)
#define SSR3_PIN D6  // CH3 — Humidificación
#define SSR4_PIN D0  // CH4 — Humidificación

// Default hysteresis setpoints
#define DEFAULT_TEMP_MIN 20.0
#define DEFAULT_TEMP_MAX 24.0
#define DEFAULT_HUM_MIN 85.0
#define DEFAULT_HUM_MAX 95.0
#define DEFAULT_CO2_MAX 1200

#endif
'''


def validate(value: str, name: str, pattern: str = None, min_len: int = 0) -> str:
    if not value:
        print(f"WARNING: {name} is empty", file=sys.stderr)
        return value
    if pattern and not re.match(pattern, value):
        print(f"WARNING: {name} has invalid format", file=sys.stderr)
    if min_len and len(value) < min_len:
        print(f"WARNING: {name} is too short (min {min_len})", file=sys.stderr)
    return value


def main():
    env_path = sys.argv[1] if len(sys.argv) > 1 else '.env'

    if not os.path.exists(env_path):
        print(f"ERROR: {env_path} not found", file=sys.stderr)
        sys.exit(1)

    with open(env_path) as f:
        lines = f.readlines()

    env = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' not in line:
            continue
        key, _, value = line.partition('=')
        env[key.strip()] = value.strip()

    validate(env.get('WIFI_SSID_1', ''), 'WIFI_SSID_1')
    validate(env.get('WIFI_PASSWORD_1', ''), 'WIFI_PASSWORD_1', min_len=8)
    validate(env.get('TS_API_KEY', ''), 'TS_API_KEY')
    validate(env.get('MQTT_BROKER', ''), 'MQTT_BROKER')

    output = TEMPLATE.format(
        WIFI_SSID_1=env.get('WIFI_SSID_1', ''),
        WIFI_PASSWORD_1=env.get('WIFI_PASSWORD_1', ''),
        WIFI_SSID_2=env.get('WIFI_SSID_2', ''),
        WIFI_PASSWORD_2=env.get('WIFI_PASSWORD_2', ''),
        TS_HOST=env.get('TS_HOST', 'api.thingspeak.com'),
        TS_PORT=env.get('TS_PORT', '80'),
        TS_API_KEY=env.get('TS_API_KEY', ''),
        MQTT_BROKER=env.get('MQTT_BROKER', 'test.mosquitto.org'),
        MQTT_PORT=env.get('MQTT_PORT', '1883'),
        MQTT_BROKER_FALLBACK=env.get('MQTT_BROKER_FALLBACK', 'broker.hivemq.com'),
        MQTT_PORT_FALLBACK=env.get('MQTT_PORT_FALLBACK', '1883'),
    )

    config_dir = os.path.join(os.path.dirname(__file__), 'src')
    os.makedirs(config_dir, exist_ok=True)
    config_path = os.path.join(config_dir, 'config.h')

    with open(config_path, 'w') as f:
        f.write(output)

    print(f"Generated {config_path}")


if __name__ == '__main__':
    main()
