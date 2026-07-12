#!/usr/bin/env python3
"""Generate firmware/src/config.h from .env file."""

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

// Backend HTTP
#define BACKEND_HOST "{BACKEND_HOST}"
#define BACKEND_PORT {BACKEND_PORT}
#define POLL_INTERVAL {POLL_INTERVAL}

// Device
#define DEVICE_ID "mush2_s3_001"

// I2C
#define I2C_SDA GPIO_NUM_4
#define I2C_SCL GPIO_NUM_5
#define I2C_FREQ 100000

// LED RGB (NeoPixel)
#define LED_RGB_PIN GPIO_NUM_48
#define LED_RGB_COUNT 1
#define LED_RGB_BRIGHTNESS 24

// SSR 4CH (runtime-configurable via NVS)
#define SSR_CH1_PIN GPIO_NUM_11
#define SSR_CH2_PIN GPIO_NUM_12
#define SSR_CH3_PIN GPIO_NUM_13
#define SSR_CH4_PIN GPIO_NUM_14
#define SSR_ACTIVE_LOW {SSR_ACTIVE_LOW}

// FreeRTOS pinning
#define CORE_CONTROL   1
#define CORE_NETWORK   0

#define STACK_SENSORS   4096
#define STACK_SSR       4096
#define STACK_WIFI      4096
// Stack para tarea de red (HTTP polling)
#define STACK_MQTT      4096
#define STACK_OTA       4096
#define STACK_TELEMETRY 4096

#define PRIORITY_SENSORS    configMAX_PRIORITIES - 1
#define PRIORITY_SSR        configMAX_PRIORITIES - 2
#define PRIORITY_WIFI       configMAX_PRIORITIES - 3
#define PRIORITY_MQTT       configMAX_PRIORITIES - 3
#define PRIORITY_OTA        configMAX_PRIORITIES - 4
#define PRIORITY_TELEMETRY  configMAX_PRIORITIES - 4

#define DELAY_SENSORS   10000
#define DELAY_SSR       250
#define DELAY_WIFI      1000
#define DELAY_MQTT      50
#define DELAY_OTA       100
#define DELAY_TELEMETRY 20000

#define SENSOR_INTERVAL 10000
#define TS_INTERVAL 20000

#define TEMP_CRITICAL 32.0
#define TEMP_RECOVERY 28.0

#define POST_VENT_DELAY 10000
#define POST_VENT_DURATION 30000

#define LIGHT_CYCLE_MS 43200000UL
#define DARK_CYCLE_MS 43200000UL

#define DEFAULT_TEMP_MIN 20.0
#define DEFAULT_TEMP_MAX 24.0
#define DEFAULT_HUM_MIN 78.0
#define DEFAULT_HUM_MAX 85.0
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
    output = TEMPLATE.format(
        WIFI_SSID_1=env.get('WIFI_SSID_1', ''),
        WIFI_PASSWORD_1=env.get('WIFI_PASSWORD_1', ''),
        WIFI_SSID_2=env.get('WIFI_SSID_2', ''),
        WIFI_PASSWORD_2=env.get('WIFI_PASSWORD_2', ''),
        TS_HOST=env.get('TS_HOST', 'api.thingspeak.com'),
        TS_PORT=env.get('TS_PORT', '80'),
        TS_API_KEY=env.get('TS_API_KEY', ''),
        BACKEND_HOST=env.get('BACKEND_HOST', 'localhost'),
        BACKEND_PORT=env.get('BACKEND_PORT', '3797'),
        POLL_INTERVAL=env.get('POLL_INTERVAL', '3000'),
        SSR_ACTIVE_LOW=env.get('SSR_ACTIVE_LOW', '1'),
    )

    config_dir = os.path.join(os.path.dirname(__file__), 'src')
    os.makedirs(config_dir, exist_ok=True)
    config_path = os.path.join(config_dir, 'config.h')

    with open(config_path, 'w') as f:
        f.write(output)

    print(f"Generated {config_path}")


if __name__ == '__main__':
    main()
