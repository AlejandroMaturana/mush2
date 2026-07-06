# BLE Contract v1 — Provisioning

## Service

| Campo       | Valor                                        |
|-------------|----------------------------------------------|
| UUID        | `a7c3d6e0-f1b2-4a5b-8c9d-0e1f2a3b4c5d`      |
| Name        | Mush2 Provisioning Service                    |

## Characteristics

### DEVICE_INFO (UUID: `a7c3d6e1-f1b2-4a5b-8c9d-0e1f2a3b4c5d`)

- **Properties:** READ
- **Description:** Información del dispositivo
- **Payload:**
```json
{
  "deviceId": "mush2_A1B2C3D4E5F6",
  "fwVer": "0.9.1",
  "hwRev": "1.0"
}
```

### WIFI_SSID (UUID: `a7c3d6e2-f1b2-4a5b-8c9d-0e1f2a3b4c5d`)

- **Properties:** WRITE
- **Description:** SSID de la red Wi-Fi a configurar
- **Payload:** Texto plano UTF-8
- **Ejemplo:** `MiRedWiFi`

### WIFI_PASS (UUID: `a7c3d6e3-f1b2-4a5b-8c9d-0e1f2a3b4c5d`)

- **Properties:** WRITE
- **Description:** Contraseña de la red Wi-Fi
- **Payload:** Texto plano UTF-8
- **Ejemplo:** `MiClaveSegura123`

### PROV_CMD (UUID: `a7c3d6e4-f1b2-4a5b-8c9d-0e1f2a3b4c5d`)

- **Properties:** WRITE
- **Description:** Comandos de provisioning
- **Payload:** Texto plano UTF-8

| Comando         | Acción                                          |
|-----------------|-------------------------------------------------|
| `provision`     | Guarda SSID+PASS en NVS y reinicia el dispositivo |
| `reset`         | Reinicia el dispositivo                         |
| `factory_reset` | Limpia NVS y reinicia (vuelve a modo provisioning) |

### PROV_STATUS (UUID: `a7c3d6e5-f1b2-4a5b-8c9d-0e1f2a3b4c5d`)

- **Properties:** READ + NOTIFY
- **Description:** Estado del proceso de provisioning
- **Payload:**
```json
{"status":"ready","msg":"Esperando configuración..."}
{"status":"ok","msg":"Credenciales guardadas. Reiniciando..."}
{"status":"error","msg":"SSID vacío"}
{"status":"error","msg":"Comando desconocido"}
```

## Flujo

```
1. Cliente descubre dispositivo (namePrefix: "Mush2")
2. Cliente conecta y obtiene servicio PROV_SERVICE_UUID
3. Cliente lee DEVICE_INFO
4. Cliente escribe WIFI_SSID
5. Cliente escribe WIFI_PASS
6. Cliente escribe PROV_CMD = "provision"
7. Dispositivo responde por PROV_STATUS (NOTIFY)
8. Dispositivo guarda en NVS y reinicia
9. Post-reboot: dispositivo conecta Wi-Fi y se registra en backend
```

## Advertising

| Campo       | Valor                  |
|-------------|------------------------|
| Name        | `Mush2-{last4MAC}`     |
| Service UUID| `a7c3d6e0-...`         |
| Interval    | 100ms (descubrimiento rápido) |
| Timeout     | 5 minutos              |

## Versionado

| Versión | Fecha       | Cambios |
|---------|-------------|---------|
| 1.0.0   | 2026-07-06  | Versión inicial |
