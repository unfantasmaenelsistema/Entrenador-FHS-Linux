import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  HardDrive,
  Cpu,
  CornerUpLeft,
  Home,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  RotateCcw,
  Terminal,
  ChevronRight,
  Compass,
  ShieldCheck,
  Sparkles,
  Wrench,
  Lock
} from 'lucide-react';
import {
  INITIAL_FHS_TREE,
  FHSNode,
  findNodeByPath,
  getParentPath,
  decodePermissions
} from './data/fhsData';
import { FHS_MISSIONS, FHSMission } from './data/missionsData';
import { isDirectory } from './engine/shell';
import {
  bestRecord,
  getTopLevelBranch,
  isClean,
  isPathWithinMissionLogic,
  loadRecords,
  NEW_ATTEMPT,
  recordLabel,
  type MissionAttempt,
  type MissionRecord
} from './engine/missions';
import { FhsTreePanel } from './components/FhsTreePanel';
import { InteractiveTerminal } from './components/InteractiveTerminal';
import { FhsReferenceView } from './components/FhsReferenceView';
import { FhsQuizView } from './components/FhsQuizView';
import { MountSimulatorView } from './components/MountSimulatorView';

type WorkspaceTab = 'misiones' | 'montajes' | 'referencia' | 'quiz';

interface ValidationFeedback {
  status: 'success' | 'partial' | 'error' | 'deviation';
  title: string;
  message: string;
  evaluatedPath: string;
}

const LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/icono_81a3db5b.png`;

const RECORDS_KEY = 'fhs_mission_records_v2';
const LEGACY_KEY = 'fhs_completed_missions_v1';

const readStored = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const cloneTree = (t: FHSNode): FHSNode => JSON.parse(JSON.stringify(t)) as FHSNode;

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('misiones');
  const [tree, setTree] = useState<FHSNode>(INITIAL_FHS_TREE);

  // Mission state
  const [activeMissionId, setActiveMissionId] = useState<string>(FHS_MISSIONS[0].id);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('Todas');
  // Mejor resultado de cada misión resuelta (con migración de la lista de la versión 1)
  const [records, setRecords] = useState<Record<string, MissionRecord>>(() =>
    loadRecords(readStored(RECORDS_KEY), readStored(LEGACY_KEY), FHS_MISSIONS.map((m) => m.id))
  );
  const completedMissions = Object.keys(records);
  const cleanCount = Object.values(records).filter(isClean).length;
  const [remediatedMissions, setRemediatedMissions] = useState<string[]>([]);
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [showClue, setShowClue] = useState<boolean>(false);
  // Intento en curso: se puntúa en el momento de localizar el objetivo
  const [attempt, setAttempt] = useState<MissionAttempt>(NEW_ATTEMPT);
  const [located, setLocated] = useState<boolean>(false);
  const [pendriveMounted, setPendriveMounted] = useState<boolean>(false);

  // Navigation state
  const [currentDirPath, setCurrentDirPath] = useState<string>('/');
  const [selectedNodePath, setSelectedNodePath] = useState<string>('/');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['/'])
  );
  const [pathHistory, setPathHistory] = useState<string[]>(['/']);
  const [deviatedPaths, setDeviatedPaths] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);
  const [externalTerminalLogs, setExternalTerminalLogs] = useState<
    {
      id: string;
      cwd: string;
      command: string;
      output: string;
      isError?: boolean;
      isSuccess?: boolean;
    }[]
  >([]);

  const activeMission: FHSMission =
    FHS_MISSIONS.find((m) => m.id === activeMissionId) || FHS_MISSIONS[0];

  useEffect(() => {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // almacenamiento no disponible (modo privado o iframe restringido)
    }
  }, [records]);

  const currentDirNode = findNodeByPath(tree, currentDirPath) || tree;
  const selectedNode = findNodeByPath(tree, selectedNodePath) || currentDirNode;
  const decodedPerm = decodePermissions(selectedNode.permissions);

  // Expand all parent folders along a path
  const expandAncestors = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      next.add('/');
      let acc = '';
      for (const p of parts) {
        acc += '/' + p;
        next.add(acc);
      }
      return next;
    });
  };

  const handleNavigateNode = (node: FHSNode) => {
    setSelectedNodePath(node.path);

    if (node.type === 'dir' || node.type === 'proc' || node.type === 'symlink') {
      // Un directorio vacío (p. ej. /mnt/pendrive sin montar) también puede ser el directorio actual
      if (isDirectory(node) || (node.children && node.children.length > 0)) {
        setCurrentDirPath(node.path);
        expandAncestors(node.path);
      } else {
        const parent = getParentPath(node.path);
        setCurrentDirPath(parent);
        expandAncestors(parent);
      }
    } else {
      const parent = getParentPath(node.path);
      setCurrentDirPath(parent);
      expandAncestors(parent);
    }

    setPathHistory((prev) =>
      prev[prev.length - 1] === node.path ? prev : [...prev, node.path]
    );

    // Check strict logical hierarchy compliance
    if (strictMode && !isPathWithinMissionLogic(node.path, activeMission)) {
      setDeviatedPaths((prev) => new Set(prev).add(node.path));
      // Una vez localizado el objetivo, explorar ya no penaliza
      if (!located) setAttempt((a) => ({ ...a, deviations: a.deviations + 1 }));
      const topBranch = getTopLevelBranch(node.path);
      const specificHint =
        activeMission.wrongBranchHints[topBranch] ||
        `El directorio ${topBranch} (${node.fhsCategory}) no corresponde a la naturaleza de los datos planteados en esta incidencia.`;

      setFeedback({
        status: 'deviation',
        title: `Desvío de la estructura lógica detectado en ${node.path}`,
        message: `${specificHint} Regresa a la raíz (/) o al nivel anterior para mantener una navegación FHS limpia.`,
        evaluatedPath: node.path
      });
    } else {
      if (feedback?.status === 'deviation') {
        setFeedback(null);
      }
    }
  };

  const handleNavigateByPathString = (pathStr: string) => {
    const found = findNodeByPath(tree, pathStr);
    if (found) {
      handleNavigateNode(found);
    }
  };

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path) && path !== '/') {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectMission = (missionId: string) => {
    setActiveMissionId(missionId);
    // Cada intento empieza con el sistema en su estado inicial
    setTree(INITIAL_FHS_TREE);
    setPendriveMounted(false);
    setRemediatedMissions([]);
    setAttempt({ ...NEW_ATTEMPT, strict: strictMode });
    setLocated(false);
    setCurrentDirPath('/');
    setSelectedNodePath('/');
    setExpandedPaths(new Set(['/']));
    setPathHistory(['/']);
    setDeviatedPaths(new Set());
    setFeedback(null);
    setShowClue(false);
    setActiveTab('misiones');
  };

  const handleResetNavigation = () => {
    setCurrentDirPath('/');
    setSelectedNodePath('/');
    setExpandedPaths(new Set(['/']));
    setPathHistory(['/']);
    setDeviatedPaths(new Set());
    setFeedback(null);
  };

  const handleValidateSelection = (overridePath?: string) => {
    const candidatePath = overridePath || selectedNodePath || currentDirPath;
    const candidateNode = findNodeByPath(tree, candidatePath) || selectedNode;
    const isExactMatch = candidatePath === activeMission.exactFileTarget;
    const isAcceptedMatch = activeMission.targetPaths.includes(candidatePath);

    if (isExactMatch || isAcceptedMatch) {
      // El resultado se fija la primera vez que se localiza en este intento
      const record: MissionRecord = located
        ? records[activeMission.id] ?? { ...attempt, strict: attempt.strict && strictMode }
        : {
            deviations: attempt.deviations,
            wrongValidations: attempt.wrongValidations,
            clueUsed: attempt.clueUsed,
            strict: attempt.strict && strictMode
          };
      if (!located) {
        setLocated(true);
        setRecords((prev) => ({ ...prev, [activeMission.id]: bestRecord(prev[activeMission.id], record) }));
      }
      const clean = isClean(record);
      setFeedback({
        status: 'success',
        title: isExactMatch
          ? `¡Objetivo exacto localizado (${candidatePath})!`
          : `¡Directorio correcto localizado (${candidatePath})!`,
        message: `${activeMission.explanation} ${
          clean
            ? 'Resultado: impecable (modo estricto, sin desvíos, sin rutas equivocadas y sin pista).'
            : `Resultado de este intento: ${recordLabel(record)}. Puedes repetir el caso para conseguir un recorrido impecable.`
        } Ya puedes aplicar la solución en la terminal.`,
        evaluatedPath: candidatePath
      });
    } else {
      if (!located) setAttempt((a) => ({ ...a, wrongValidations: a.wrongValidations + 1 }));
      const topBranch = getTopLevelBranch(candidatePath);
      const wrongHint =
        activeMission.wrongBranchHints[topBranch] ||
        `La ruta ${candidatePath} pertenece a la categoría "${candidateNode.fhsCategory}" (${candidateNode.summary}), que no resuelve el problema planteado.`;

      setFeedback({
        status: 'error',
        title: `Ruta incorrecta: ${candidatePath}`,
        message: `${wrongHint} Revisa el síntoma de la incidencia o despliega la pista FHS.`,
        evaluatedPath: candidatePath
      });
    }
  };

  // Efectos de los comandos sobre el árbol simulado
  const applyTruncateSyslog = () => {
    setTree((prevTree) => {
      const clone = cloneTree(prevTree);
      const syslog = findNodeByPath(clone, '/var/log/syslog');
      if (syslog) {
        syslog.size = '0B';
        syslog.summary = 'Registro general del sistema (truncado: 0 B).';
        syslog.content =
          'Nov 03 08:45:00 lab-fhs rsyslogd: file \'/var/log/syslog\' was truncated, continuing at offset 0.';
      }
      return clone;
    });
  };

  const applyMountPendrive = () => {
    setPendriveMounted(true);
    setTree((prevTree) => {
      const clone = cloneTree(prevTree);
      const mntPendrive = findNodeByPath(clone, '/mnt/pendrive');
      if (mntPendrive && !mntPendrive.children?.length) {
        mntPendrive.summary = 'Punto de montaje activo: /dev/sdb1 (USB_RESCATE, 32 GB, vfat).';
        mntPendrive.children = [
          {
            path: '/mnt/pendrive/rescate_sistema.sh',
            name: 'rescate_sistema.sh',
            type: 'file',
            permissions: '-rwxr-xr-x',
            owner: 'root:root',
            size: '2.4K',
            inode: 8901,
            modified: 'Nov 03 08:45',
            fhsCategory: 'Montajes',
            shareable: 'No compartible',
            summary: 'Script de recuperación guardado en el pendrive recién montado.',
            fhsDescription: 'Accesible ahora que /dev/sdb1 está montado en /mnt/pendrive.',
            content: '#!/bin/bash\necho "USB de rescate montado correctamente en /mnt/pendrive"'
          }
        ];
      }
      return clone;
    });
  };

  /** Aplica la solución de la incidencia activa. Exige haberla localizado antes. */
  const handleExecuteRemediation = (fromTerminal = false) => {
    if (!located || remediatedMissions.includes(activeMission.id)) return;
    setRemediatedMissions((prev) => [...prev, activeMission.id]);
    if (!fromTerminal) {
      if (activeMission.id === 'mission-log-disk-full') applyTruncateSyslog();
      if (activeMission.id === 'mission-mount-pendrive-manual') applyMountPendrive();
      setExternalTerminalLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          cwd: currentDirPath,
          command: activeMission.remediationCommand,
          output: `[OK] ${activeMission.remediationEffect}`,
          isSuccess: true
        }
      ]);
    }
    setFeedback({
      status: 'success',
      title: `Incidencia #${activeMission.number} resuelta en consola`,
      message: `${activeMission.remediationEffect} ${activeMission.explanation}`,
      evaluatedPath: activeMission.exactFileTarget
    });
  };

  const filteredMissions = FHS_MISSIONS.filter((m) =>
    difficultyFilter === 'Todas' ? true : m.difficulty === difficultyFilter
  );

  // Build breadcrumb parts for current directory
  const breadcrumbSegments =
    currentDirPath === '/'
      ? [{ name: '/', path: '/' }]
      : [
          { name: '/', path: '/' },
          ...currentDirPath
            .split('/')
            .filter(Boolean)
            .map((part, idx, arr) => ({
              name: part,
              path: '/' + arr.slice(0, idx + 1).join('/')
            }))
        ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#E6EDF3]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-4 xl:gap-8 px-4 sm:px-6 py-3.5 border-b border-[#232D3F] bg-[#0E131D]">
        {/* Zone 1: Brand Title (single line with logo) */}
        <a
          href="https://www.unfantasmaenelsistema.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 group"
        >
          <div className="w-9 h-9 rounded-lg bg-[#161E2E] border border-[#2A364F] p-1 flex items-center justify-center overflow-hidden group-hover:border-emerald-500/60 transition-colors">
            <img
              src={LOGO_URL}
              alt="Logo Un Fantasma en el Sistema"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/aistudio/icono_81a3db5b.png';
              }}
            />
          </div>
          <span>Entrenador FHS Linux</span>
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('misiones')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'misiones'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Simulador FHS (16 Casos)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('montajes')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'montajes'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Particiones y Montajes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referencia')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'referencia'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Matriz FHS 3.0
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'quiz'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Test LPIC-1 e Informe
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <span>Un Fantasma en el Sistema</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex xl:hidden items-center justify-around border-b border-[#232D3F] bg-[#111722] px-2 py-2 text-xs font-medium overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('misiones')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'misiones'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'text-slate-300'
          }`}
        >
          Simulador FHS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('montajes')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'montajes'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'text-slate-300'
          }`}
        >
          Montajes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('referencia')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'referencia'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'text-slate-300'
          }`}
        >
          Matriz FHS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap shrink-0 ${
            activeTab === 'quiz'
              ? 'bg-emerald-500 text-slate-950 font-semibold'
              : 'text-slate-300'
          }`}
        >
          Test e Informe
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {activeTab === 'montajes' && (
          <MountSimulatorView
            onJumpToPath={(path) => {
              setActiveTab('misiones');
              handleNavigateByPathString(path);
            }}
          />
        )}

        {activeTab === 'referencia' && (
          <FhsReferenceView
            onJumpToPath={(path) => {
              setActiveTab('misiones');
              handleNavigateByPathString(path);
            }}
          />
        )}

        {activeTab === 'quiz' && (
          <FhsQuizView missionRecords={records} />
        )}

        {activeTab === 'misiones' && (
          <>
            {/* Mission Selector & Progress Strip */}
            <section className="bg-[#111722] border border-[#232D3F] rounded-lg p-4 space-y-3.5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#232D3F] pb-3">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-400">
                    Laboratorio de Administración de Sistemas Linux · Estándar FHS 3.0 ·{' '}
                    <span className="font-mono text-emerald-400">
                      {completedMissions.length}/{FHS_MISSIONS.length} incidencias resueltas · {cleanCount} impecables
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-semibold text-white">
                    Selecciona un escenario real y localiza su ruta sin salirte de la estructura lógica
                  </h1>
                </div>

                {/* Interactive Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0F17] border border-[#232D3F] rounded-md">
                    {['Todas', 'Básico', 'Intermedio', 'Avanzado'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficultyFilter(level)}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                          difficultyFilter === level
                            ? 'bg-emerald-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-pressed={strictMode}
                    onClick={() => {
                      // Desactivarlo durante un intento hace que ese intento no cuente como impecable
                      if (strictMode && !located) setAttempt((a) => ({ ...a, strict: false }));
                      setStrictMode((v) => !v);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      strictMode
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#0B0F17] border-[#232D3F] text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>
                      Control de Rama Lógica: {strictMode ? 'Activo' : 'Libre'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Horizontal Scannable Mission Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredMissions.map((mission) => {
                  const isCurrent = mission.id === activeMission.id;
                  const record = records[mission.id];
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => handleSelectMission(mission.id)}
                      className={`text-left p-2.5 rounded-md border transition-colors flex flex-col justify-between gap-1.5 ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                          : 'bg-[#0B0F17] border-[#232D3F] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                        <span>
                          Caso {mission.number} · {mission.difficulty}
                        </span>
                        {record && (
                          <span
                            title={recordLabel(record)}
                            className={`flex items-center gap-1 font-sans font-medium ${
                              isClean(record) ? 'text-emerald-400' : 'text-amber-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> {isClean(record) ? 'Impecable' : 'Resuelto'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-slate-100 line-clamp-2 leading-snug">
                        {mission.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Active Incident Briefing Card */}
            <section className="bg-[#111722] border border-[#232D3F] rounded-lg p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-emerald-400 font-semibold">
                      INCIDENCIA #{activeMission.number}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeMission.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Nivel {activeMission.difficulty}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">
                    {activeMission.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeMission.symptom}
                  </p>
                  <p className="text-xs font-medium text-emerald-300 pt-0.5">
                    Objetivo: {activeMission.objective}
                  </p>
                </div>

                <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleValidateSelection()}
                    className="px-4 py-2.5 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer [overflow-wrap:anywhere]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Validar Ruta Seleccionada ({selectedNodePath})</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!showClue && !located) setAttempt((a) => ({ ...a, clueUsed: true }));
                        setShowClue((v) => !v);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 text-amber-300 border border-[#232D3F] rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{showClue ? 'Ocultar pista' : 'Ver pista FHS (resta impecable)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetNavigation}
                      className="px-3 py-1.5 text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 text-slate-300 border border-[#232D3F] rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar a /</span>
                    </button>
                  </div>
                </div>
              </div>

              {showClue && (
                <div className="p-3 rounded-md bg-[#0B0F17] border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Pista de Arquitectura FHS:</strong>{' '}
                    {activeMission.clue}
                  </div>
                </div>
              )}

              {/* Live Logical Path Breadcrumb Tracker */}
              <div className="pt-2 border-t border-[#232D3F] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 font-mono">
                  <span className="text-slate-400 font-sans">Traza de navegación:</span>
                  {pathHistory.map((step, i) => {
                    const isDev = deviatedPaths.has(step);
                    return (
                      <React.Fragment key={`${step}-${i}`}>
                        {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                        <button
                          type="button"
                          onClick={() => handleNavigateByPathString(step)}
                          className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                            isDev
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : step === selectedNodePath
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {step}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Desvíos: {attempt.deviations} · Rutas equivocadas: {attempt.wrongValidations}
                  {attempt.clueUsed ? ' · Pista usada' : ''}
                  {!attempt.strict || !strictMode ? ' · Sin modo estricto' : ''}
                </div>
              </div>

              {/* Validation or Deviation Feedback Callout */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-md border text-xs space-y-2 ${
                    feedback.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100'
                      : feedback.status === 'deviation'
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-100'
                      : 'bg-rose-500/10 border-rose-500/50 text-rose-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {feedback.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <span>{feedback.title}</span>
                    </div>

                    {feedback.status === 'deviation' && (
                      <button
                        type="button"
                        onClick={() => {
                          const parent = getParentPath(currentDirPath);
                          handleNavigateByPathString(parent);
                        }}
                        className="px-2.5 py-1 bg-amber-400 text-slate-950 font-semibold rounded text-xs whitespace-nowrap shrink-0"
                      >
                        Regresar a la rama válida (cd ..)
                      </button>
                    )}

                    {feedback.status === 'success' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {located && !remediatedMissions.includes(activeMission.id) && (
                          <button
                            type="button"
                            onClick={() => handleExecuteRemediation()}
                            className="px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold rounded text-xs inline-flex items-center gap-1.5 text-left [overflow-wrap:anywhere]"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Ejecutar solución: {activeMission.remediationCommand}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const currentIdx = FHS_MISSIONS.findIndex(
                              (m) => m.id === activeMission.id
                            );
                            const nextMission =
                              FHS_MISSIONS[(currentIdx + 1) % FHS_MISSIONS.length];
                            handleSelectMission(nextMission.id);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded text-xs whitespace-nowrap shrink-0"
                        >
                          Siguiente incidencia →
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="leading-relaxed text-slate-200">{feedback.message}</p>

                  {feedback.status === 'success' && (
                    <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-1 md:grid-cols-3 gap-2">
                      {activeMission.realWorldCommands.map((c) => (
                        <div
                          key={c.cmd}
                          className="p-2 rounded bg-[#0B0F17]/80 border border-[#232D3F]"
                        >
                          <div className="font-mono text-emerald-300 text-[11px]">
                            $ {c.cmd}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {c.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Three-Column Interactive Workbench: Tree Explorer + Directory View (ls -la) + Inode/FHS Inspector */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Column 1: Interactive FHS Tree (3 cols) */}
              <div className="lg:col-span-3 h-[540px]">
                <FhsTreePanel
                  tree={tree}
                  currentDirPath={currentDirPath}
                  selectedNodePath={selectedNodePath}
                  expandedPaths={expandedPaths}
                  deviatedPaths={deviatedPaths}
                  onSelectNode={handleNavigateNode}
                  onToggleExpand={handleToggleExpand}
                />
              </div>

              {/* Column 2: Current Directory Explorer (`ls -la`) (5 cols) */}
              <div className="lg:col-span-5 h-[540px] flex flex-col bg-[#111722] border border-[#232D3F] rounded-lg overflow-hidden">
                {/* Path Bar (`pwd`) */}
                <div className="px-3.5 py-2.5 bg-[#0E131D] border-b border-[#232D3F] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-0.5">
                    <span className="text-slate-500 mr-1">pwd:</span>
                    {breadcrumbSegments.map((seg, index) => (
                      <React.Fragment key={seg.path}>
                        {index > 0 && <span className="text-slate-600">/</span>}
                        <button
                          type="button"
                          onClick={() => handleNavigateByPathString(seg.path)}
                          className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-emerald-300 font-semibold whitespace-nowrap shrink-0"
                        >
                          {seg.name === '/' ? '/' : seg.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={currentDirPath === '/'}
                      onClick={() =>
                        handleNavigateByPathString(getParentPath(currentDirPath))
                      }
                      title="Subir al directorio padre (cd ..)"
                      className="px-2 py-1 text-xs font-mono bg-[#161E2E] hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                      <span>cd ..</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigateByPathString('/')}
                      title="Ir al directorio raíz (/)"
                      className="px-2 py-1 text-xs font-mono bg-[#161E2E] hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>/</span>
                    </button>
                  </div>
                </div>

                {/* Directory Header description */}
                <div className="px-3.5 py-2 bg-[#0B0F17] border-b border-[#1E2636] text-xs text-slate-300 flex items-center justify-between gap-2">
                  <span className="truncate">{currentDirNode.summary}</span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {currentDirNode.children?.length || 0} entradas
                  </span>
                </div>

                {/* `ls -la` Interactive Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#232D3F] bg-[#0E131D]/60 text-[11px] text-slate-400">
                        <th className="py-2 px-3">Permisos</th>
                        <th className="py-2 px-2">Propietario</th>
                        <th className="py-2 px-2 text-right">Tamaño</th>
                        <th className="py-2 px-3">Nombre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2232]">
                      {currentDirPath !== '/' && (
                        <tr
                          onClick={() =>
                            handleNavigateByPathString(getParentPath(currentDirPath))
                          }
                          className="hover:bg-slate-800/50 cursor-pointer text-slate-400"
                        >
                          <td className="py-2 px-3">drwxr-xr-x</td>
                          <td className="py-2 px-2">root:root</td>
                          <td className="py-2 px-2 text-right">4.0K</td>
                          <td className="py-2 px-3 font-semibold text-sky-300">
                            .. (Subir nivel)
                          </td>
                        </tr>
                      )}
                      {currentDirNode.children?.map((item) => {
                        const isItemSelected = selectedNodePath === item.path;
                        const isHugeAlert = item.size === '42.8G';
                        return (
                          <tr
                            key={item.path}
                            onClick={() => handleNavigateNode(item)}
                            className={`cursor-pointer transition-colors ${
                              isItemSelected
                                ? 'bg-emerald-500/15 text-white'
                                : 'hover:bg-slate-800/45 text-slate-200'
                            }`}
                          >
                            <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                              {item.permissions}
                            </td>
                            <td className="py-2 px-2 text-[11px] text-slate-400 whitespace-nowrap">
                              {item.owner}
                            </td>
                            <td
                              className={`py-2 px-2 text-right whitespace-nowrap ${
                                isHugeAlert
                                  ? 'text-rose-400 font-bold'
                                  : item.size === '0B'
                                  ? 'text-sky-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              {item.size}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {item.type === 'dir' || item.type === 'symlink' ? (
                                  <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : item.type === 'block' || item.type === 'char' ? (
                                  <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : item.type === 'proc' ? (
                                  <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span
                                  className={
                                    item.type === 'dir'
                                      ? 'font-semibold text-emerald-300'
                                      : 'text-slate-100'
                                  }
                                >
                                  {item.name}
                                  {item.type === 'dir' ? '/' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Action Footer inside Directory Panel */}
                <div className="px-3.5 py-2 border-t border-[#232D3F] bg-[#0E131D] flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 truncate">
                    Seleccionado: <strong className="text-slate-200">{selectedNode.path}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleValidateSelection(selectedNode.path)}
                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    Validar aquí
                  </button>
                </div>
              </div>

              {/* Column 3: Inode, Octal Permissions, FHS Specification & File Content Inspector (4 cols) */}
              <div className="lg:col-span-4 h-[540px] flex flex-col bg-[#111722] border border-[#232D3F] rounded-lg overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#0E131D] border-b border-[#232D3F] flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-semibold text-slate-200">
                      Inspector de Inodo, Permisos y Estándar FHS
                    </h2>
                    <p className="text-[11px] font-mono text-emerald-400 truncate">
                      {selectedNode.path} (Inodo #{selectedNode.inode})
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-sky-300 font-semibold">
                    chmod {decodedPerm.octal}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {/* Metadata Line (Zero-Pill clean unboxed text with separators) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 border-b border-[#232D3F] pb-3 font-mono">
                    <span className="text-emerald-300">{selectedNode.fhsCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedNode.shareable}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedNode.owner}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedNode.size}</span>
                  </div>

                  {/* Interactive Octal Permission & Special Bit Decoder */}
                  <div className="p-3 rounded-md bg-[#0B0F17] border border-[#232D3F] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Desglose de Permisos POSIX</span>
                      </span>
                      <span className="font-mono text-emerald-300">
                        Octal: {decodedPerm.octal}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
                      <div className="p-1.5 rounded bg-[#111722] border border-[#1E2636]">
                        <div className="text-amber-300 font-bold">{decodedPerm.fileTypeChar}</div>
                        <div className="text-[10px] text-slate-400 font-sans truncate">Tipo</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#111722] border border-[#1E2636]">
                        <div className="text-emerald-300 font-bold">{decodedPerm.userPerms}</div>
                        <div className="text-[10px] text-slate-400 font-sans">User (u)</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#111722] border border-[#1E2636]">
                        <div className="text-sky-300 font-bold">{decodedPerm.groupPerms}</div>
                        <div className="text-[10px] text-slate-400 font-sans">Group (g)</div>
                      </div>
                      <div className="p-1.5 rounded bg-[#111722] border border-[#1E2636]">
                        <div className="text-slate-200 font-bold">{decodedPerm.otherPerms}</div>
                        <div className="text-[10px] text-slate-400 font-sans">Others (o)</div>
                      </div>
                    </div>
                    {decodedPerm.specialBit && (
                      <div className="pt-1.5 border-t border-[#1E2636] text-[11px] text-amber-200">
                        <strong>{decodedPerm.specialBit}:</strong>{' '}
                        <span className="text-slate-300">
                          {decodedPerm.specialBitExplanation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* FHS Purpose */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-semibold text-white">
                      Función en la Jerarquía Linux (FHS 3.0)
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedNode.fhsDescription}
                    </p>
                  </div>

                  {/* Common Mistake Callout */}
                  {selectedNode.commonMistake && (
                    <div className="p-3 rounded-md bg-[#0B0F17] border border-[#232D3F] space-y-1">
                      <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Nota clave de examen / Administración</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {selectedNode.commonMistake}
                      </p>
                    </div>
                  )}

                  {/* File Content Preview (`cat`) */}
                  {selectedNode.content ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-200">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span>cat {selectedNode.path}</span>
                        </span>
                        <span>Solo lectura</span>
                      </div>
                      <pre className="p-3 rounded-md bg-[#080B11] border border-[#232D3F] font-mono text-[11px] text-emerald-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {selectedNode.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-3 rounded-md bg-[#080B11] border border-[#232D3F] font-mono text-[11px] text-slate-400">
                      $ stat {selectedNode.path}
                      {'\n'}Fichero: {selectedNode.path}
                      {'\n'}Tamaño: {selectedNode.size} · Inodo: {selectedNode.inode} · Tipo: {decodedPerm.fileTypeLabel}
                      {'\n'}Acceso: ({decodedPerm.octal}/{selectedNode.permissions}) · Uid/Gid: {selectedNode.owner}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Synchronized Interactive Linux Terminal */}
            <InteractiveTerminal
              tree={tree}
              currentDirPath={currentDirPath}
              activeMission={activeMission}
              onNavigatePath={handleNavigateByPathString}
              onValidatePath={(path) => handleValidateSelection(path)}
              onExecuteRemediation={() => handleExecuteRemediation(true)}
              onMountPendrive={applyMountPendrive}
              onTruncateSyslog={applyTruncateSyslog}
              located={located}
              remediated={remediatedMissions}
              pendriveMounted={pendriveMounted}
              externalLogs={externalTerminalLogs}
            />
          </>
        )}
      </main>

      {/* Clean Author & Educational Footer */}
      <footer className="border-t border-[#232D3F] bg-[#0E131D] px-6 py-4 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Logo Un Fantasma en el Sistema"
              className="w-7 h-7 object-contain rounded bg-[#161E2E] p-0.5 border border-[#2A364F]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/aistudio/icono_81a3db5b.png';
              }}
            />
            <div>
              <span className="text-slate-200 font-medium">
                Entrenador de Jerarquía del Sistema de Ficheros Linux (FHS 3.0)
              </span>
              <span className="mx-2 text-slate-600">·</span>
              <span>Recurso didáctico para ASIR, DAW, DAM, SMR y preparación de LPIC-1</span>
            </div>
          </div>

          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            <span>https://www.unfantasmaenelsistema.com/</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
