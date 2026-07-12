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
  int compareSemVer(const String& current, const String& candidate);
  bool checkRssiThreshold(int rssi);
  OtaCandidate select(const String& url, const String& version, int rssi);
};

#endif
