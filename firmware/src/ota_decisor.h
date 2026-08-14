#ifndef OTA_DECISOR_H
#define OTA_DECISOR_H

#include <Arduino.h>

struct OtaCandidate {
  String url;
  String version;
  String hash;
  int rssi;
  bool valid;
};

class OTASelector {
public:
  OTASelector();
  bool validateUrl(const String& url);
  bool validateHash(const String& hash);
  int compareSemVer(const String& current, const String& candidate);
  bool checkRssiThreshold(int rssi);
  OtaCandidate select(const String& url, const String& version, const String& hash, int rssi);
};

#endif
