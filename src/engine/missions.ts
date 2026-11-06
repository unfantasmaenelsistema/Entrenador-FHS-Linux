import type { FHSMission } from '../data/missionsData';

/** ¿La ruta está dentro de la rama lógica que lleva al objetivo de la misión? */
export function isPathWithinMissionLogic(path: string, mission: FHSMission): boolean {
  if (path === '/') return true;
  return mission.validBranchPrefixes.some(
    (prefix) => prefix === path || prefix.startsWith(path + '/') || path.startsWith(prefix + '/')
  );
}

export function getTopLevelBranch(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? '/' + parts[0] : '/';
}

/** Lo que ha pasado durante el intento actual de una misión. */
export interface MissionAttempt {
  deviations: number;
  wrongValidations: number;
  clueUsed: boolean;
  strict: boolean;
}

export const NEW_ATTEMPT: MissionAttempt = { deviations: 0, wrongValidations: 0, clueUsed: false, strict: true };

/** Resultado guardado de una misión resuelta. */
export interface MissionRecord {
  deviations: number;
  wrongValidations: number;
  clueUsed: boolean;
  strict: boolean;
  /** Resuelta con la versión 1, de la que no se sabe cómo fue. */
  legacy?: boolean;
}

/** Impecable: en modo estricto, sin desvíos, sin rutas equivocadas y sin pista. */
export function isClean(r: MissionRecord): boolean {
  return !r.legacy && r.strict && r.deviations === 0 && r.wrongValidations === 0 && !r.clueUsed;
}

export function recordLabel(r: MissionRecord): string {
  if (r.legacy) return 'resuelta (versión anterior)';
  if (isClean(r)) return 'impecable';
  const notes: string[] = [];
  if (!r.strict) notes.push('sin modo estricto');
  if (r.clueUsed) notes.push('con pista');
  if (r.deviations) notes.push(`${r.deviations} desvío${r.deviations > 1 ? 's' : ''}`);
  if (r.wrongValidations) notes.push(`${r.wrongValidations} ruta${r.wrongValidations > 1 ? 's' : ''} equivocada${r.wrongValidations > 1 ? 's' : ''}`);
  return notes.join(', ');
}

const score = (r: MissionRecord) =>
  (isClean(r) ? 1000 : 0) - (r.legacy ? 500 : 0) - r.deviations * 10 - r.wrongValidations * 10 - (r.clueUsed ? 5 : 0) - (r.strict ? 0 : 20);

/** Se guarda el mejor resultado de cada misión. */
export function bestRecord(prev: MissionRecord | undefined, next: MissionRecord): MissionRecord {
  return !prev || score(next) > score(prev) ? next : prev;
}

/** Carga los resultados guardados; acepta la lista de IDs de la versión 1. */
export function loadRecords(rawV2: unknown, rawV1: unknown, validIds: string[]): Record<string, MissionRecord> {
  const out: Record<string, MissionRecord> = {};
  if (rawV2 && typeof rawV2 === 'object' && !Array.isArray(rawV2)) {
    for (const [id, r] of Object.entries(rawV2 as Record<string, unknown>)) {
      if (!validIds.includes(id) || !r || typeof r !== 'object') continue;
      const o = r as Record<string, unknown>;
      out[id] = {
        deviations: Number(o.deviations) || 0,
        wrongValidations: Number(o.wrongValidations) || 0,
        clueUsed: Boolean(o.clueUsed),
        strict: o.strict !== false,
        ...(o.legacy ? { legacy: true } : {}),
      };
    }
  }
  if (Array.isArray(rawV1)) {
    for (const id of rawV1) {
      if (typeof id === 'string' && validIds.includes(id) && !out[id]) {
        out[id] = { deviations: 0, wrongValidations: 0, clueUsed: false, strict: true, legacy: true };
      }
    }
  }
  return out;
}
