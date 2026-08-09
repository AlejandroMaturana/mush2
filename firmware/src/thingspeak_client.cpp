#include "thingspeak_client.h"
#include "config.h"
#include "thingspeak_ca_root.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

ThingSpeakClient::ThingSpeakClient() {}

bool ThingSpeakClient::send(float temperature, float humidity, float co2, float voc) {
  if (WiFi.status() != WL_CONNECTED) return false;

  // DECISION-007: HTTPS + CA root embebida; la clave viaja en el header
  // `X-ApiKey`, nunca en el query string ni en claro por la red.
  String uri = String("/update?field1=") + String(temperature, 1)
    + "&field2=" + String(humidity, 1);

  if (co2 > 0) uri += "&field3=" + String(co2, 0);
  if (voc > 0) uri += "&field4=" + String(voc, 0);

  return sendRequest(uri);
}

bool ThingSpeakClient::sendRequest(const String& uri) {
  WiFiClientSecure wc;
  wc.setCACert(TS_CA_ROOT);
  wc.setHandshakeTimeout(5000);

  HTTPClient http;
  // HTTPS obligatorio (DECISION-007): `https=true` sobre TS_PORT 443.
  http.begin(wc, TS_HOST, TS_PORT, uri, true);
  http.setTimeout(5000);
  http.addHeader("X-ApiKey", TS_API_KEY);

  int code = http.GET();
  bool ok = (code == 200);

  if (ok) {
    Serial.printf("[TS] OK #%s\n", http.getString().c_str());
  } else {
    Serial.printf("[TS] Error HTTP %d\n", code);
  }

  http.end();
  return ok;
}
