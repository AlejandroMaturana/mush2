import { EventBus, DomainEvent, EventHandler } from '../shared/EventBus.js';
import { ConsoleLogger } from '../shared/Logger.js';
import { CryptoUUID } from '../shared/UUID.js';
import { SystemClock } from '../shared/Clock.js';
import {
  SequelizeRunRepository,
  SequelizeChamberRepository,
  SequelizeRecipeRepository,
  SequelizeTelemetryRepository,
  SequelizeAlarmRepository,
} from '../persistence/index.js';
import {
  StartRun,
  AbortRun,
  ReceiveTelemetry,
  EvaluatePhase,
  ComputeActuators,
  RaiseAlarms,
} from '../application/index.js';
import { ControlEngine, createDefaultGuards } from '../control-engine/index.js';

class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();

  publish<T extends DomainEvent>(event: T): void {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler as EventHandler);
    this.handlers.set(eventType, existing);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    this.handlers.set(eventType, existing.filter(h => h !== handler));
  }
}

export interface Container {
  eventBus: EventBus;
  logger: ConsoleLogger;
  uuid: CryptoUUID;
  clock: SystemClock;

  runRepository: SequelizeRunRepository;
  chamberRepository: SequelizeChamberRepository;
  recipeRepository: SequelizeRecipeRepository;
  telemetryRepository: SequelizeTelemetryRepository;
  alarmRepository: SequelizeAlarmRepository;

  startRun: StartRun;
  abortRun: AbortRun;
  receiveTelemetry: ReceiveTelemetry;
  evaluatePhase: EvaluatePhase;
  computeActuators: ComputeActuators;
  raiseAlarms: RaiseAlarms;

  controlEngine: ControlEngine;
}

let container: Container | null = null;

export function createContainer(): Container {
  if (container) return container;

  const eventBus = new InMemoryEventBus();
  const logger = new ConsoleLogger('mush2');
  const uuid = new CryptoUUID();
  const clock = new SystemClock();

  const runRepository = new SequelizeRunRepository();
  const chamberRepository = new SequelizeChamberRepository();
  const recipeRepository = new SequelizeRecipeRepository();
  const telemetryRepository = new SequelizeTelemetryRepository();
  const alarmRepository = new SequelizeAlarmRepository();

  const startRun = new StartRun(
    runRepository,
    chamberRepository,
    recipeRepository,
    eventBus,
    uuid,
    clock
  );

  const abortRun = new AbortRun(runRepository, eventBus, clock);

  const receiveTelemetry = new ReceiveTelemetry(
    telemetryRepository,
    runRepository,
    eventBus,
    uuid,
    clock
  );

  const evaluatePhase = new EvaluatePhase(recipeRepository);

  const computeActuators = new ComputeActuators(recipeRepository);

  const raiseAlarms = new RaiseAlarms(alarmRepository, eventBus, clock);

  const controlEngine = new ControlEngine(createDefaultGuards());

  container = {
    eventBus,
    logger,
    uuid,
    clock,
    runRepository,
    chamberRepository,
    recipeRepository,
    telemetryRepository,
    alarmRepository,
    startRun,
    abortRun,
    receiveTelemetry,
    evaluatePhase,
    computeActuators,
    raiseAlarms,
    controlEngine,
  };

  return container;
}

export function getContainer(): Container {
  if (!container) {
    throw new Error('Container not initialized. Call createContainer() first.');
  }
  return container;
}
