import { getContainer } from '../composition-root.js';

export async function handleTelemetryViaUseCase(deviceId: string, data: Record<string, unknown>): Promise<void> {
  const container = getContainer();

  const chamber = await container.chamberRepository.findByDeviceId(deviceId);
  if (!chamber) {
    console.error(`[MQTT-Adapter] No chamber found for device ${deviceId}`);
    return;
  }

  const activeRuns = await container.runRepository.findActiveRuns();
  const run = activeRuns.find(r => r.chamberId.value === chamber.id.value);
  if (!run) {
    console.log(`[MQTT-Adapter] No active run for device ${deviceId}, skipping telemetry`);
    return;
  }

  const result = await container.receiveTelemetry.execute({
    runId: run.id.value,
    deviceId,
    temperature: (data.temp as number) || 0,
    humidity: (data.hum as number) || 0,
    co2: (data.co2 as number) || 0,
    voc: (data.tvoc as number) || 0,
    aqi: (data.aqi as number) || 0,
    ssrState: (data.ssrState as number[]) || [],
    wifiRssi: (data.rssi as number) || 0,
  });

  if (result.isErr()) {
    console.error(`[MQTT-Adapter] Error processing telemetry from ${deviceId}:`, result.error.message);
  }
}
