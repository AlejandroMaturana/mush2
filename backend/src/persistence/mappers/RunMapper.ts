import { Run, RunId, ChamberId, RecipeId } from '../../domain/index.js';
import type { RunStatus, ControlState, RunData } from '../../domain/index.js';

export interface RunRecord {
  id: number;
  chamberId: number;
  recipeId: number;
  species: string;
  status: RunStatus;
  controlState: ControlState;
  currentPhase: string;
  startedAt: Date;
  endedAt: Date | null;
  abortReason: string | null;
}

export function toRunDomain(record: RunRecord): Run {
  const data: RunData = {
    id: RunId.create(String(record.id)),
    chamberId: ChamberId.create(String(record.chamberId)),
    recipeId: RecipeId.create(String(record.recipeId)),
    status: record.status,
    controlState: record.controlState,
    currentPhase: record.currentPhase,
    startedAt: record.startedAt,
    abortedAt: record.endedAt ?? undefined,
    completedAt: undefined,
  };
  return Run.create(data);
}

export function toRunRecord(run: Run): RunRecord {
  const data = run.toData();
  return {
    id: Number(data.id.value),
    chamberId: Number(data.chamberId.value),
    recipeId: Number(data.recipeId.value),
    species: '',
    status: data.status,
    controlState: data.controlState,
    currentPhase: data.currentPhase,
    startedAt: data.startedAt,
    endedAt: data.abortedAt ?? data.completedAt ?? null,
    abortReason: null,
  };
}
