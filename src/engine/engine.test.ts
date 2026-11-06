import { describe, expect, it } from 'vitest';
import { decodePermissions, findNodeByPath, getAllPaths, INITIAL_FHS_TREE } from '../data/fhsData';
import { FHS_MISSIONS, FHS_QUIZ_QUESTIONS } from '../data/missionsData';
import {
  bestRecord,
  isClean,
  isPathWithinMissionLogic,
  loadRecords,
  recordLabel,
  type MissionRecord,
} from './missions';
import { isDirectory, resolvePath, runShell, type ShellContext } from './shell';

const ids = FHS_MISSIONS.map((m) => m.id);
const ctx = (over: Partial<ShellContext> = {}): ShellContext => ({
  tree: INITIAL_FHS_TREE,
  cwd: '/',
  mission: FHS_MISSIONS[0],
  located: false,
  remediated: [],
  pendriveMounted: false,
  ...over,
});
const clean: MissionRecord = { deviations: 0, wrongValidations: 0, clueUsed: false, strict: true };

describe('datos de las misiones', () => {
  it('hay 16 misiones con IDs y números únicos', () => {
    expect(FHS_MISSIONS).toHaveLength(16);
    expect(new Set(ids).size).toBe(16);
    expect(new Set(FHS_MISSIONS.map((m) => m.number)).size).toBe(16);
  });

  it.each(FHS_MISSIONS.map((m) => [m.id, m] as const))('%s: el objetivo existe y está dentro de su rama lógica', (_id, m) => {
    expect(findNodeByPath(INITIAL_FHS_TREE, m.exactFileTarget)).not.toBeNull();
    for (const p of m.targetPaths) expect(findNodeByPath(INITIAL_FHS_TREE, p), p).not.toBeNull();
    // Se puede llegar desde / hasta el objetivo sin un solo desvío
    const parts = m.exactFileTarget.split('/').filter(Boolean);
    let acc = '';
    for (const part of parts) {
      acc += '/' + part;
      expect(isPathWithinMissionLogic(acc, m), `${m.id}: ${acc}`).toBe(true);
    }
  });

  it('las pistas de rama equivocada no apuntan a la rama correcta', () => {
    for (const m of FHS_MISSIONS) {
      const top = '/' + m.exactFileTarget.split('/').filter(Boolean)[0];
      expect(Object.keys(m.wrongBranchHints), m.id).not.toContain(top);
    }
  });

  it('cada pregunta del test tiene su respuesta entre las opciones', () => {
    for (const q of FHS_QUIZ_QUESTIONS) expect(q.options, q.id).toContain(q.correctAnswer);
  });

  it('las rutas del árbol son coherentes con su padre y no se repiten', () => {
    const all = getAllPaths(INITIAL_FHS_TREE);
    expect(new Set(all.map((n) => n.path)).size).toBe(all.length);
    const walk = (n: typeof INITIAL_FHS_TREE) => {
      for (const c of n.children ?? []) {
        expect(c.path).toBe((n.path === '/' ? '' : n.path) + '/' + c.name);
        walk(c);
      }
    };
    walk(INITIAL_FHS_TREE);
  });
});

describe('permisos', () => {
  it('decodifica varios bits especiales a la vez', () => {
    const d = decodePermissions('-rwsr-sr-x');
    expect(d.octal).toBe('6755');
    expect(d.specialBit).toContain('SUID');
    expect(d.specialBit).toContain('SGID');
  });
  it('sticky bit de /tmp', () => {
    expect(decodePermissions('drwxrwxrwt').octal).toBe('1777');
  });
});

describe('registro de misiones', () => {
  it('impecable solo sin desvíos, errores ni pista y en modo estricto', () => {
    expect(isClean(clean)).toBe(true);
    expect(isClean({ ...clean, deviations: 1 })).toBe(false);
    expect(isClean({ ...clean, wrongValidations: 1 })).toBe(false);
    expect(isClean({ ...clean, clueUsed: true })).toBe(false);
    expect(isClean({ ...clean, strict: false })).toBe(false);
    expect(isClean({ ...clean, legacy: true })).toBe(false);
  });

  it('etiquetas en castellano', () => {
    expect(recordLabel(clean)).toBe('impecable');
    expect(recordLabel({ ...clean, deviations: 2, clueUsed: true })).toBe('con pista, 2 desvíos');
    expect(recordLabel({ ...clean, wrongValidations: 1 })).toBe('1 ruta equivocada');
  });

  it('se queda con el mejor intento', () => {
    const malo = { ...clean, deviations: 3 };
    expect(bestRecord(undefined, malo)).toBe(malo);
    expect(bestRecord(malo, clean)).toBe(clean);
    expect(bestRecord(clean, malo)).toBe(clean);
  });

  it('migra la lista de la versión 1 y descarta IDs desconocidos', () => {
    const r = loadRecords(null, [ids[0], 'inventado'], ids);
    expect(Object.keys(r)).toEqual([ids[0]]);
    expect(r[ids[0]].legacy).toBe(true);
    const r2 = loadRecords({ [ids[1]]: { deviations: 2 }, x: clean }, [ids[1]], ids);
    expect(r2[ids[1]]).toEqual({ deviations: 2, wrongValidations: 0, clueUsed: false, strict: true });
    expect(loadRecords('basura', 42, ids)).toEqual({});
  });
});

describe('terminal', () => {
  it('resuelve rutas relativas, .. y ~ (root)', () => {
    expect(resolvePath('/var/log', '..')).toBe('/var');
    expect(resolvePath('/var', 'log/syslog')).toBe('/var/log/syslog');
    expect(resolvePath('/etc', '~')).toBe('/root');
    expect(resolvePath('/etc', '/')).toBe('/');
  });

  it('cd navega a directorios y rechaza archivos', () => {
    const ok = runShell('cd /var/log', ctx());
    expect(ok.effects).toEqual([{ type: 'navigate', path: '/var/log' }]);
    const ko = runShell('cd /etc/fstab', ctx());
    expect(ko.isError).toBe(true);
    expect(ko.effects).toEqual([]);
    expect(runShell('cd /proc/meminfo', ctx()).isError).toBe(true);
    expect(isDirectory(findNodeByPath(INITIAL_FHS_TREE, '/bin')!)).toBe(true);
  });

  it('validar comprueba el directorio actual o la ruta indicada', () => {
    expect(runShell('validar', ctx({ cwd: '/var/log' })).effects).toEqual([{ type: 'validate', path: '/var/log' }]);
    expect(runShell('validar syslog', ctx({ cwd: '/var/log' })).effects).toEqual([{ type: 'validate', path: '/var/log/syslog' }]);
    expect(runShell('validar /no/existe', ctx()).isError).toBe(true);
  });

  it.each(FHS_MISSIONS.map((m) => [m.id, m] as const))('%s: la solución exige localizar antes', (_id, m) => {
    const antes = runShell(m.remediationCommand, ctx({ mission: m }));
    expect(antes.isError).toBe(true);
    expect(antes.effects).toEqual([]);
    const despues = runShell(`sudo ${m.remediationCommand}`, ctx({ mission: m, located: true }));
    expect(despues.isSuccess).toBe(true);
    expect(despues.effects).toContainEqual({ type: 'remediate' });
  });

  it('mount y truncate no resuelven otra misión distinta de la suya', () => {
    const otra = FHS_MISSIONS.find((m) => m.id === 'mission-ssh-intrusion-audit')!;
    const mount = runShell('mount /dev/sdb1 /mnt/pendrive', ctx({ mission: otra, located: true }));
    expect(mount.effects).toContainEqual({ type: 'mount_pendrive' });
    expect(mount.effects).not.toContainEqual({ type: 'remediate' });
    const trunc = runShell('truncate -s 0 /var/log/syslog', ctx({ mission: otra, located: true }));
    expect(trunc.effects).toContainEqual({ type: 'truncate_syslog' });
    expect(trunc.effects).not.toContainEqual({ type: 'remediate' });
  });

  it('nginx -t falla hasta corregir la configuración', () => {
    const nginx = FHS_MISSIONS.find((m) => m.id === 'mission-nginx-config-error')!;
    expect(runShell('nginx -t', ctx({ mission: nginx })).isError).toBe(true);
    expect(runShell('nginx -t', ctx({ mission: nginx, remediated: [nginx.id] })).isError).toBeFalsy();
  });

  it('el pendrive aparece en lsblk solo una vez montado', () => {
    expect(runShell('lsblk', ctx()).output).not.toContain('/mnt/pendrive');
    expect(runShell('lsblk', ctx({ pendriveMounted: true })).output).toContain('/mnt/pendrive');
  });

  it('blkid usa BLOCK_SIZE 512 para vfat', () => {
    expect(runShell('blkid', ctx()).output).toMatch(/sdb1.*BLOCK_SIZE="512".*vfat/);
  });

  it('comando desconocido y clear', () => {
    expect(runShell('rm -rf /', ctx()).isError).toBe(true);
    expect(runShell('clear', ctx()).clear).toBe(true);
    expect(runShell('whoami', ctx()).output).toBe('root');
  });
});

describe('correcciones detectadas en la prueba real', () => {
  it('blkid con argumento muestra solo ese dispositivo', () => {
    const out = runShell('blkid /dev/sdb1', ctx({ mission: FHS_MISSIONS[0] })).output;
    expect(out).toContain('/dev/sdb1:');
    expect(out).not.toContain('/dev/sda1:');
    expect(runShell('blkid /dev/sdz9', ctx()).output).toBe('');
  });
  it('cd a un directorio vacío funciona', () => {
    expect(runShell('cd /mnt/pendrive', ctx()).effects).toEqual([{ type: 'navigate', path: '/mnt/pendrive' }]);
  });
});
