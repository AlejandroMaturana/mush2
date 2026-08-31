// D3/T11 — Capacidad backend de alertas (Nivel 2): Single Source of Truth.
// Deriva los 5 niveles (Qué ocurrió → Qué significa → Qué impacto →
// Qué debería hacer → Cómo verificar) a partir del modelo Alarm, para que
// el mismo message se use en todas las superficies y N1 (frontend) deje de
// duplicar esta lógica.
// NO inventa recomendaciones de hardware (límite M0.1 D3). Usa únicamente
// los campos reales del modelo Alarm (type/severity/sensorType/currentValue).
// Fuente de copy validada por T10 (Quick Win UX).

export const SENSOR_LABEL = {
  TEMPERATURE: 'Temperatura',
  HUMIDITY: 'Humedad',
  CO2: 'CO₂',
  VOC: 'VOC',
};

const UNIT_BY_SENSOR = {
  TEMPERATURE: '°C',
  HUMIDITY: '%',
  CO2: ' ppm',
  VOC: ' ppb',
};

// Copy curada por tipo. `{sensor}` se sustituye por el sensor cuando aplica.
const TRANSLATION = {
  OUT_OF_RANGE: {
    what: '{sensor} está fuera del rango esperado',
    meaning: 'El valor registrado superó el límite configurado.',
    impact: 'Las condiciones del cultivo ya no están dentro de lo deseado.',
    action: 'Revise el valor actual y ajuste la configuración o el ambiente.',
    verify: 'Compruebe que el valor vuelva a estar dentro del rango en los próximos minutos.',
  },
  THRESHOLD_CROSSED: {
    what: 'Se superó el umbral de {sensor}',
    meaning: 'El valor cruzó el límite que se había definido.',
    impact: 'Puede requerir una corrección para mantener el cultivo estable.',
    action: 'Revise la lectura actual y decida si debe corregir el ambiente.',
    verify: 'Confirme que la lectura se estabilice dentro del rango fijado.',
  },
  DISCONNECTED: {
    what: 'El dispositivo dejó de comunicarse',
    meaning: 'No se reciben datos del dispositivo desde hace un tiempo.',
    impact: 'Deja de verse el estado y la telemetría en tiempo real.',
    action: 'Verifique la conexión eléctrica y de red del dispositivo.',
    verify: 'Espere a que el dispositivo vuelva a reportar datos en la lista de cámaras.',
  },
  SENSOR_FAULT: {
    what: 'Un sensor del dispositivo reporta un fallo',
    meaning: 'El sensor no está dando lecturas válidas.',
    impact: 'Esa medición no está disponible para el control del ambiente.',
    action: 'Revise el estado del sensor y su conexión al dispositivo.',
    verify: 'Observe si el sensor vuelve a reportar lecturas válidas.',
  },
  SYSTEM_ERROR: {
    what: 'Ocurrió un error interno del sistema',
    meaning: 'Un componente del sistema falló al procesar una operación.',
    impact: 'Alguna función pudo interrumpirse temporalmente.',
    action: 'Revise el mensaje y reintente la operación.',
    verify: 'Confirme que la operación termine correctamente al reintentar.',
  },
};

const DEFAULT = {
  what: 'Ocurrió una alerta',
  meaning: 'Se registró una condición que requiere atención.',
  impact: 'Puede afectar el estado o el control del ambiente.',
  action: 'Revise el detalle y tome la acción correspondiente.',
  verify: 'Confirme que la condición vuelva a la normalidad.',
};

function formatValue(alarm) {
  if (alarm.currentValue == null) return '';
  const unit = UNIT_BY_SENSOR[alarm.sensorType] || '°C';
  return ` (${alarm.currentValue}${unit})`;
}

export function explainAlarm(alarm = {}) {
  const sensorLabel = SENSOR_LABEL[alarm.sensorType] || 'la medición';
  const valueSuffix = formatValue(alarm);
  const t = TRANSLATION[alarm.type] || DEFAULT;

  const fmt = (tmpl) => {
    let s = tmpl.replace('{sensor}', sensorLabel);
    if (valueSuffix && !s.includes(String(alarm.currentValue))) {
      s = `${s}${valueSuffix}`;
    }
    return s;
  };

  return {
    what: fmt(t.what),
    meaning: fmt(t.meaning),
    impact: t.impact,
    action: t.action,
    verify: t.verify,
  };
}
