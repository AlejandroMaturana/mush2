#include "thingspeak_client.h"
#include "config.h"
#include <WiFi.h>
#include <HTTPClient.h>

ThingSpeakClient::ThingSpeakClient() {}

bool ThingSpeakClient::send(float temperature, float humidity, float co2, float voc) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String url = String("http://") + TS_HOST + "/update?api_key=" + TS_API_KEY
    + "&field1=" + String(temperature, 1)
    + "&field2=" + String(humidity, 1);

  if (co2 > 0) url += "&field3=" + String(co2, 0);
  if (voc > 0) url += "&field4=" + String(voc, 0);

  return sendRequest(url);
}

bool ThingSpeakClient::sendRequest(const String& url) {
  WiFiClient wc;
  HTTPClient http;
  http.begin(wc, url);
  http.setTimeout(5000);

  int code = http.GET();
  bool ok = (code == 200);

  if (ok) {
    Serial.printf("[TS] Enviado OK, respuesta: %s\n", http.getString().c_str());
  } else {
    Serial.printf("[TS] Error HTTP %d\n", code);
  }

  http.end();
  return ok;
}
