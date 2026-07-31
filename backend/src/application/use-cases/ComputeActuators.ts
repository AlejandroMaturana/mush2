import { Result, Ok } from '../../shared/index.js';
import { Run, Telemetry, Recipe, RecipeRepository } from '../../domain/index.js';

export type ActuatorType = 'VENTILATION' | 'HEATER' | 'HUMIDIFIER' | 'LIGHT';

export interface ActuatorCommand {
  channel: number;
  type: ActuatorType;
  state: 'ON' | 'OFF';
  reason: string;
}

export interface ComputeActuatorsInput {
  run: Run;
  telemetry: Telemetry;
}

export class ComputeActuators {
  constructor(
    private recipeRepo: RecipeRepository,
  ) {}

  async execute(input: ComputeActuatorsInput): Promise<Result<ActuatorCommand[], Error>> {
    const recipe = await this.recipeRepo.findById(input.run.recipeId.value);
    if (!recipe) {
      return Ok([]);
    }

    const phase = recipe.getPhaseByName(input.run.currentPhase);
    if (!phase) {
      return Ok([]);
    }

    const commands: ActuatorCommand[] = [];
    const t = input.telemetry;

    // CH1 = VENTILATION (FAE)
    const shouldVentOn = t.co2 > phase.co2Target.max || t.temperature > phase.tempRange.max;
    const shouldVentOff = t.co2 < phase.co2Target.min && t.temperature < phase.tempRange.min;
    if (shouldVentOn) {
      commands.push({ channel: 1, type: 'VENTILATION', state: 'ON', reason: 'Vent ON: CO2 or temp above max' });
    } else if (shouldVentOff) {
      commands.push({ channel: 1, type: 'VENTILATION', state: 'OFF', reason: 'Vent OFF: CO2 and temp within range' });
    }

    // CH2 = HEATER
    if (t.temperature < phase.tempRange.min) {
      commands.push({ channel: 2, type: 'HEATER', state: 'ON', reason: 'Heater ON: temp below min' });
    } else if (t.temperature > phase.tempRange.max) {
      commands.push({ channel: 2, type: 'HEATER', state: 'OFF', reason: 'Heater OFF: temp above max' });
    }

    // CH3 = HUMIDIFIER
    if (t.humidity < phase.humRange.min) {
      commands.push({ channel: 3, type: 'HUMIDIFIER', state: 'ON', reason: 'Humidifier ON: humidity below min' });
    } else if (t.humidity > phase.humRange.max) {
      commands.push({ channel: 3, type: 'HUMIDIFIER', state: 'OFF', reason: 'Humidifier OFF: humidity above max' });
    }

    // CH4 = LIGHT (delegado a firmware local, evaluado según receta)
    if (phase.lightCycleHours != null) {
      commands.push({ channel: 4, type: 'LIGHT', state: phase.lightCycleHours > 0 ? 'ON' : 'OFF', reason: `Light cycle: ${phase.lightCycleHours}h/day` });
    }

    return Ok(commands);
  }
}
