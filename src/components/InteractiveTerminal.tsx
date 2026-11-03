import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2 } from 'lucide-react';
import { FHSNode, findNodeByPath, getParentPath, getAllPaths, decodePermissions } from '../data/fhsData';
import { FHSMission } from '../data/missionsData';

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
  onValidatePath: (pathToValidate?: string) => void;
  onExecuteRemediation: () => void;
  externalLogs: TerminalEntry[];
}

export const InteractiveTerminal: React.FC<InteractiveTerminalProps> = ({
  tree,
  currentDirPath,
  activeMission,
  onNavigatePath,
  onValidatePath,
  onExecuteRemediation,
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
        'Linux 6.8.0-45-generic x86_64 · Entrenador FHS (Un Fantasma en el Sistema)\nComandos: cd, ls -la, pwd, cat, stat, find, tree, df -h, du -sh, free -h, lsblk, blkid, mount, truncate, nginx -t, file, validar, clear, help'
    }
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const allEntries = [...history, ...externalLogs];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allEntries.length]);

  const resolveRelativePath = (cwd: string, target: string): string => {
    if (!target || target === '~') return '/home/alumno';
    if (target === '-') return '/';
    if (target.startsWith('/')) {
      return target.replace(/\/+$/, '') || '/';
    }
    const parts = cwd.split('/').filter(Boolean);
    const segments = target.split('/').filter(Boolean);
    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        parts.pop();
      } else {
        parts.push(seg);
      }
    }
    return parts.length === 0 ? '/' : '/' + parts.join('/');
  };

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

    if (raw === 'clear') {
      setHistory([]);
      return;
    }

    const parts = raw.split(/\s+/);
    const cmd = parts[0] === 'sudo' ? parts[1] || 'sudo' : parts[0];
    const arg1 = parts[0] === 'sudo' ? parts[2] : parts[1];

    let output = '';
    let isError = false;
    let isSuccess = false;

    if (
      raw === activeMission.remediationCommand ||
      raw === `sudo ${activeMission.remediationCommand}`
    ) {
      onExecuteRemediation();
      setHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          cwd: currentDirPath,
          command: raw,
          output: `[OK] ${activeMission.remediationEffect}`,
          isSuccess: true
        }
      ]);
      return;
    }

    switch (cmd) {
      case 'help':
        output = [
          'Comandos disponibles en el simulador FHS (soporta autocompletado con TAB y flechas ↑/↓):',
          '  pwd                  Muestra el directorio de trabajo actual',
          '  ls [-la] [ruta]      Lista el contenido e inodos del directorio',
          '  cd <ruta>            Cambia de directorio (sincronizado con el árbol visual)',
          '  cat <archivo>        Muestra el contenido de un archivo de configuración, log o /proc',
          '  stat <ruta>          Muestra permisos octales, SUID/Sticky Bit, inodo y propietario',
          '  find <ruta> -name X  Busca archivos por nombre dentro de la jerarquía FHS',
          '  tree [ruta]          Dibuja en ASCII las subramas del directorio actual',
          '  df -h / du -sh       Muestra uso de disco por partición o tamaño de logs',
          '  free -h              Muestra uso de memoria RAM y caché (leído de /proc/meminfo)',
          '  lsblk / blkid        Muestra dispositivos de bloques, particiones y UUIDs',
          '  mount / nginx -t     Monta dispositivos o verifica configuración de servicios',
          '  validar              Evalúa tu ubicación actual frente a la incidencia activa',
          '  clear                Limpia la pantalla de la terminal'
        ].join('\n');
        break;

      case 'pwd':
        output = currentDirPath;
        break;

      case 'whoami':
      case 'id':
        output = 'uid=0(root) gid=0(root) grupos=0(root),4(adm),27(sudo)';
        break;

      case 'validar':
        onValidatePath();
        output = `Evaluando ruta actual (${currentDirPath}) frente a la incidencia #${activeMission.number}...`;
        isSuccess = true;
        break;

      case 'cd': {
        const targetPath = resolveRelativePath(currentDirPath, arg1 || '/');
        const targetNode = findNodeByPath(tree, targetPath);
        if (!targetNode) {
          output = `bash: cd: ${arg1}: No existe el fichero o el directorio`;
          isError = true;
        } else if (
          targetNode.type === 'block' ||
          targetNode.type === 'char' ||
          targetNode.type === 'file'
        ) {
          output = `bash: cd: ${arg1}: No es un directorio (es un nodo de tipo ${
            targetNode.type === 'block' ? 'dispositivo de bloques' : 'fichero'
          })`;
          isError = true;
        } else {
          onNavigatePath(targetNode.path);
          output = `Directorio cambiado a ${targetNode.path}`;
        }
        break;
      }

      case 'ls': {
        const effectiveParts = parts[0] === 'sudo' ? parts.slice(1) : parts;
        const pathArg = effectiveParts.find((p, idx) => idx > 0 && !p.startsWith('-'));
        const targetPath = pathArg ? resolveRelativePath(currentDirPath, pathArg) : currentDirPath;
        const node = findNodeByPath(tree, targetPath);
        if (!node) {
          output = `ls: no se puede acceder a '${pathArg}': No existe el fichero o el directorio`;
          isError = true;
        } else if (!node.children) {
          output = `${node.permissions} 1 ${node.owner} ${node.size} ${node.modified} ${node.path}`;
        } else {
          const isLong =
            effectiveParts.includes('-l') ||
            effectiveParts.includes('-la') ||
            effectiveParts.includes('-al') ||
            effectiveParts.includes('-ld');
          if (isLong) {
            output = node.children
              .map(
                (c) =>
                  `${c.permissions.padEnd(11)} ${c.owner.padEnd(14)} ${c.size.padStart(8)}  ${
                    c.modified
                  }  ${c.name}${c.symlinkTarget ? ` -> ${c.symlinkTarget}` : ''}`
              )
              .join('\n');
          } else {
            output = node.children.map((c) => (c.type === 'dir' ? `${c.name}/` : c.name)).join('   ');
          }
        }
        break;
      }

      case 'stat': {
        const targetPath = arg1 ? resolveRelativePath(currentDirPath, arg1) : currentDirPath;
        const node = findNodeByPath(tree, targetPath);
        if (!node) {
          output = `stat: no se puede efectuar stat sobre '${arg1}': No existe el fichero o el directorio`;
          isError = true;
        } else {
          const decoded = decodePermissions(node.permissions);
          output = [
            `  Fichero: ${node.path}${node.symlinkTarget ? ` -> ${node.symlinkTarget}` : ''}`,
            `  Tamaño: ${node.size.padEnd(12)} Inodo: ${node.inode.toString().padEnd(10)} Tipo: ${decoded.fileTypeLabel}`,
            `  Acceso: (${decoded.octal}/${node.permissions})  Uid/Gid: (${node.owner})`,
            decoded.specialBit ? `  Bit Especial Activo: ${decoded.specialBit}` : null,
            `  Clasificación FHS: ${node.fhsCategory} · ${node.shareable}`
          ]
            .filter(Boolean)
            .join('\n');
        }
        break;
      }

      case 'find': {
        const query = parts[parts.length - 1]?.replace(/['"*]/g, '') || '';
        const allNodes = getAllPaths(tree);
        const matches = allNodes.filter((n) =>
          n.name.toLowerCase().includes(query.toLowerCase())
        );
        output =
          matches.length > 0
            ? matches.map((m) => m.path).join('\n')
            : `find: sin coincidencias para '${query}'`;
        break;
      }

      case 'tree': {
        const targetPath = arg1 ? resolveRelativePath(currentDirPath, arg1) : currentDirPath;
        const node = findNodeByPath(tree, targetPath);
        if (!node) {
          output = `tree: '${arg1}' no encontrado`;
          isError = true;
        } else {
          const lines: string[] = [node.path];
          node.children?.forEach((c, i, arr) => {
            const branch = i === arr.length - 1 ? '└── ' : '├── ';
            lines.push(`${branch}${c.name}${c.type === 'dir' ? '/' : ''}`);
          });
          output = lines.join('\n');
        }
        break;
      }

      case 'cat': {
        if (!arg1) {
          output = 'cat: falta el operando archivo. Ejemplo: cat /etc/fstab';
          isError = true;
          break;
        }
        const targetPath = resolveRelativePath(currentDirPath, arg1);
        const node = findNodeByPath(tree, targetPath);
        if (!node) {
          output = `cat: ${arg1}: No existe el fichero o el directorio`;
          isError = true;
        } else if (node.type === 'dir') {
          output = `cat: ${arg1}: Es un directorio`;
          isError = true;
        } else {
          onNavigatePath(node.path);
          output =
            node.content ||
            `[Inodo #${node.inode}] ${node.summary}\nPermisos: ${node.permissions} | Propietario: ${node.owner} | Tamaño: ${node.size}`;
        }
        break;
      }

      case 'file': {
        const targetPath = arg1 ? resolveRelativePath(currentDirPath, arg1) : currentDirPath;
        const node = findNodeByPath(tree, targetPath);
        if (!node) {
          output = `file: no se puede abrir '${arg1}' (No such file or directory)`;
          isError = true;
        } else {
          onNavigatePath(node.path);
          output = `${node.path}: ${node.summary}`;
        }
        break;
      }

      case 'free':
        output = [
          '               total        used        free      shared  buff/cache   available',
          'Mem:          15.6Gi       3.8Gi       3.9Gi        42Mi       7.9Gi      11.3Gi',
          'Swap:          2.0Gi          0B       2.0Gi'
        ].join('\n');
        break;

      case 'lsblk':
        output = [
          'NAME        MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS',
          'sda           8:0    0   50G  0 disk ',
          '└─sda1        8:1    0   50G  0 part /',
          'sdb           8:16   1   32G  0 disk ',
          '└─sdb1        8:17   1   32G  0 part ',
          'nvme0n1     259:0    0  500G  0 disk '
        ].join('\n');
        break;

      case 'df': {
        const syslogNode = findNodeByPath(tree, '/var/log/syslog');
        const isFull = syslogNode?.size === '42.8G';
        output = [
          'S.ficheros     Tamaño Usados  Disp Uso% Montado en',
          'udev             7.8G      0  7.8G   0% /dev',
          'tmpfs            1.6G   840K  1.6G   1% /run',
          isFull
            ? '/dev/sda1         50G  49.5G  112M  99% /'
            : '/dev/sda1         50G   6.7G  43.3G  14% /',
          'tmpfs            7.8G      0  7.8G   0% /dev/shm'
        ].join('\n');
        break;
      }

      case 'du': {
        const syslogNode = findNodeByPath(tree, '/var/log/syslog');
        output = [
          `${syslogNode?.size || '42.8G'}\t/var/log/syslog`,
          '4.2M\t/var/log/auth.log',
          '64.0K\t/var/tmp/recuperacion_editor.swp',
          '18.4K\t/var/log/nginx/error.log',
          '14.2M\t/boot/vmlinuz-6.8.0-45-generic'
        ].join('\n');
        break;
      }

      case 'blkid':
        output = [
          '/dev/sda1: UUID="8f4b2c10-9a11-4d3e-8b12-09a81f23e101" BLOCK_SIZE="4096" TYPE="ext4"',
          '/dev/sdb1: LABEL="USB_RESCATE" UUID="4A8F-9C21" BLOCK_SIZE="4096" TYPE="vfat"'
        ].join('\n');
        break;

      case 'nginx':
        output =
          'nginx: [emerg] unknown directive "keepalive_timout" in /etc/nginx/nginx.conf:17\nnginx: configuration file /etc/nginx/nginx.conf test failed';
        isError = true;
        break;

      case 'mount':
        if (raw.includes('/dev/sdb1') && raw.includes('/mnt/pendrive')) {
          onNavigatePath('/mnt/pendrive');
          onExecuteRemediation();
          output = '[OK] Dispositivo /dev/sdb1 montado correctamente en /mnt/pendrive.';
          isSuccess = true;
        } else {
          output = [
            '/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)',
            'proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)',
            'sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)',
            'devtmpfs on /dev type devtmpfs (rw,nosuid,size=8192000k,mode=755)'
          ].join('\n');
        }
        break;

      case 'truncate':
        if (raw.includes('/var/log/syslog')) {
          onNavigatePath('/var/log/syslog');
          onExecuteRemediation();
          output = '[OK] /var/log/syslog truncado a 0 bytes. Espacio liberado en /.';
          isSuccess = true;
        } else {
          output = 'Uso: truncate -s 0 /var/log/syslog';
        }
        break;

      case 'cd..':
        onNavigatePath(getParentPath(currentDirPath));
        output = `Directorio cambiado a ${getParentPath(currentDirPath)}`;
        break;

      default:
        output = `bash: ${cmd}: comando no reconocido en el simulador. Escribe 'help' para ver los comandos disponibles.`;
        isError = true;
    }

    setHistory((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        cwd: currentDirPath,
        command: raw,
        output,
        isError,
        isSuccess
      }
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
          <button
            type="button"
            onClick={() => setInput(activeMission.remediationCommand)}
            className="px-2 py-0.5 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors whitespace-nowrap shrink-0"
          >
            Cargar comando de solución
          </button>
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

      <div className="p-3 h-44 overflow-y-auto font-mono text-xs space-y-2">
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
              className={`whitespace-pre-wrap pl-2 leading-relaxed ${
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
        <div ref={bottomRef} />
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
