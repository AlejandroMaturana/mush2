import { Result, Ok, Err } from '../../shared/index.js';
import { TemperatureRange } from './TemperatureRange.js';
import { HumidityRange } from './HumidityRange.js';
import { CO2Target } from './CO2Target.js';

export interface PhaseData {
  name: string;
  tempRange: TemperatureRange;
  humRange: HumidityRange;
  co2Target: CO2Target;
  durationDays: number;
  lightCycleHours?: number;
}

export class Phase {
  private constructor(
    readonly name: string,
    readonly tempRange: TemperatureRange,
    readonly humRange: HumidityRange,
    readonly co2Target: CO2Target,
    readonly durationDays: number,
    readonly lightCycleHours: number | undefined,
  ) {}

  static create(data: PhaseData): Result<Phase, string> {
    if (!data.name || data.name.trim().length === 0) {
      return Err('Phase name cannot be empty');
    }
    if (data.durationDays <= 0) {
      return Err(`Duration must be positive, got ${data.durationDays}`);
    }
    return Ok(new Phase(
      data.name.trim(),
      data.tempRange,
      data.humRange,
      data.co2Target,
      data.durationDays,
      data.lightCycleHours,
    ));
  }

  toJSON() {
    return {
      name: this.name,
      tempRange: this.tempRange.toJSON(),
      humRange: this.humRange.toJSON(),
      co2Target: this.co2Target.toJSON(),
      durationDays: this.durationDays,
      lightCycleHours: this.lightCycleHours,
    };
  }
}
