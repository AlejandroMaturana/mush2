#include "ota_decisor.h"

OTASelector::OTASelector() {}

bool OTASelector::validateUrl(const String& url) {
  if (url.length() == 0) return false;
  if (!url.startsWith("https://")) return false;
  if (!url.endsWith(".bin")) return false;
  return true;
}

int OTASelector::compareSemVer(const String& current, const String& candidate) {
  int cMajor = 0, cMinor = 0, cPatch = 0;
  int nMajor = 0, nMinor = 0, nPatch = 0;
  sscanf(current.c_str(), "%d.%d.%d", &cMajor, &cMinor, &cPatch);
  sscanf(candidate.c_str(), "%d.%d.%d", &nMajor, &nMinor, &nPatch);

  if (nMajor > cMajor) return 1;
  if (nMajor < cMajor) return -1;
  if (nMinor > cMinor) return 1;
  if (nMinor < cMinor) return -1;
  if (nPatch > cPatch) return 1;
  if (nPatch < cPatch) return -1;
  return 0;
}

bool OTASelector::checkRssiThreshold(int rssi) {
  return rssi >= -75;
}

OtaCandidate OTASelector::select(const String& url, const String& version, int rssi) {
  OtaCandidate cand;
  cand.url = url;
  cand.version = version;
  cand.rssi = rssi;
  cand.valid = validateUrl(url) && checkRssiThreshold(rssi);
  return cand;
}
