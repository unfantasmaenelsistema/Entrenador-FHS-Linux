import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2 } from 'lucide-react';
import { FHSNode, findNodeByPath } from '../data/fhsData';
import { FHSMission } from '../data/missionsData';
import { resolvePath, runShell, type ShellEffect } from '../engine/shell';

interface TerminalEntry {
  id: string;
  cwd: string;
  command: string;
  output: string;
  isError?: boolean;
  isSuccess?: boolean;
}

interface InteractiveTerminalProps {
  tree: FHSNode;
  currentDirPath: string;
  activeMission: FHSMission;
  onNavigatePath: (path: string) => void;
  onValidatePath: (path: string) => void;
  onExecuteRemediation: () => void;
  onMountPendrive: () => void;
  onTruncateSyslog: () => void;
  /** La incidencia activa ya está localizada: su comando de solución está desbloqueado. */
  located: boolean;
  remediated: string[];
  pendriveMounted: boolean;
  externalLogs: TerminalEntry[];
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  tree,
  currentDirPath,
  activeMission,
  onNavigatePath,
  onValidatePath,
  onExecuteRemediation,
  onMountPendrive,
  onTruncateSyslog,
  located,
  remediated,
  pendriveMounted,
  externalLogs
}) => {
  const [input, setInput] = useState('');
  const [cmdHistoryList, setCmdHistoryList] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [history, setHistory] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      cwd: '/',
      command: 'uname -sr && echo "Terminal FHS interactiva lista (Soporta TAB y flechas ↑/↓)"',
      output:
        'Linux 6.8.0-45-generic x86_64 · Entrenador FHS (Un Fantasma en el Sistema)\nComandos: cd, ls -l, pwd, cat, stat, file, find, tree, df -h, du -sh, free -h, lsblk, blkid, mount, truncate, nginx -t, validar, clear, help'
    }
  ]);
  const viewportRef = useRef<HTMLDivElement>(null);

  const allEntries = [...history, ...externalLogs];

  // Desplaza solo la salida de la terminal (no toda la página) hasta la última línea
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [allEntries.length]);

  const resolveRelativePath = resolvePath;

  // Tab completion & ArrowUp/ArrowDown history navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const tokens = input.split(/\s+/);
      const lastToken = tokens[tokens.length - 1] || '';

      let searchDir = currentDirPath;
      let prefix = lastToken;

      if (lastToken.includes('/')) {
        const lastSlash = lastToken.lastIndexOf('/');
        const dirPart = lastToken.slice(0, lastSlash) || '/';
        prefix = lastToken.slice(lastSlash + 1);
        searchDir = resolveRelativePath(currentDirPath, dirPart);
      }

      const dirNode = findNodeByPath(tree, searchDir);
      if (dirNode && dirNode.children) {
        const matches = dirNode.children.filter((c) => c.name.startsWith(prefix));
        if (matches.length === 1) {
          const match = matches[0];
          const base = lastToken.includes('/')
            ? lastToken.slice(0, lastToken.lastIndexOf('/') + 1)
            : '';
          const completed = `${base}${match.name}${match.type === 'dir' ? '/' : ''}`;
          tokens[tokens.length - 1] = completed;
          setInput(tokens.join(' '));
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistoryList.length === 0) return;
      const nextCursor =
        historyCursor < cmdHistoryList.length - 1 ? historyCursor + 1 : historyCursor;
      setHistoryCursor(nextCursor);
      setInput(cmdHistoryList[cmdHistoryList.length - 1 - nextCursor] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor <= 0) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        const nextCursor = historyCursor - 1;
        setHistoryCursor(nextCursor);
        setInput(cmdHistoryList[cmdHistoryList.length - 1 - nextCursor] || '');
      }
    }
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    setInput('');
    setCmdHistoryList((prev) => [...prev, raw]);
    setHistoryCursor(-1);

    const result = runShell(raw, { tree, cwd: currentDirPath, mission: activeMission, located, remediated, pendriveMounted });
    if (result.clear) {
      setHistory([]);
      return;
    }
    for (const effect of result.effects as ShellEffect[]) {
      if (effect.type === 'navigate') onNavigatePath(effect.path);
      else if (effect.type === 'validate') onValidatePath(effect.path);
      else if (effect.type === 'mount_pendrive') onMountPendrive();
      else if (effect.type === 'truncate_syslog') onTruncateSyslog();
      else if (effect.type === 'remediate') onExecuteRemediation();
    }
    setHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cwd: currentDirPath,
        command: raw,
        output: result.output,
        isError: result.isError,
        isSuccess: result.isSuccess,
      },
    ]);
  };

  return (
    <div className="bg-[#080B11] border border-[#232D3F] rounded-lg overflow-hidden flex flex-col">
      <div className="px-3.5 py-2 bg-[#0E131D] border-b border-[#232D3F] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-medium text-slate-200">
            root@lab-fhs:{currentDirPath}#
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            · Autocompletado con TAB · Historial con ↑/↓
          </span>
        </div>
        <div className="flex items-center gap-2">
          {located && !remediated.includes(activeMission.id) && (
            <button
              type="button"
              onClick={() => setInput(activeMission.remediationCommand)}
              className="px-2 py-0.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors whitespace-nowrap shrink-0"
            >
              Cargar comando de solución
            </button>
          )}
          <button
            type="button"
            onClick={() => setHistory([])}
            title="Limpiar terminal"
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={viewportRef} role="log" aria-label="Salida de la terminal" className="p-3 h-64 overflow-y-auto font-mono text-xs space-y-2">
        {allEntries.map((entry) => (
          <div key={entry.id} className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400">root@lab-fhs</span>
              <span>:</span>
              <span className="text-sky-400">{entry.cwd}</span>
              <span>#</span>
              <span className="text-slate-100">{entry.command}</span>
            </div>
            <pre
              className={`whitespace-pre-wrap [overflow-wrap:anywhere] pl-2 leading-relaxed ${
                entry.isError
                  ? 'text-rose-400'
                  : entry.isSuccess
                  ? 'text-emerald-300'
                  : 'text-slate-300'
              }`}
            >
              {entry.output}
            </pre>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCommand}
        className="border-t border-[#1E2636] bg-[#0B0F17] px-3 py-2 flex items-center gap-2 font-mono text-xs"
      >
        <span className="text-emerald-400 shrink-0">
          root@lab-fhs:{currentDirPath}#
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Usa TAB para autocompletar rutas (ej. cd /var/log, stat /tmp, lsblk, find syslog)..."
          aria-label="Comando de terminal Linux"
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
        >
          <span>Ejecutar</span>
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
