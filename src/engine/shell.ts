import { decodePermissions, findNodeByPath, getAllPaths, getParentPath, type FHSNode } from '../data/fhsData';
import type { FHSMission } from '../data/missionsData';

/** Efectos que la terminal pide a la aplicación. */
export type ShellEffect =
  | { type: 'navigate'; path: string }
  | { type: 'validate'; path: string }
  | { type: 'remediate' }
  | { type: 'mount_pendrive' }
  | { type: 'truncate_syslog' };

export interface ShellContext {
  tree: FHSNode;
  cwd: string;
  mission: FHSMission;
  /** La misión activa ya se ha localizado con «validar»: su solución está desbloqueada. */
  located: boolean;
  remediated: string[];
  pendriveMounted: boolean;
}

export interface ShellResult {
  output: string;
  isError?: boolean;
  isSuccess?: boolean;
  clear?: boolean;
  effects: ShellEffect[];
}

/** La consola es de root: ~ es /root (no /home/alumno). */
export function resolvePath(cwd: string, target: string): string {
  if (!target || target === '~') return '/root';
  if (target.startsWith('~/')) target = '/root/' + target.slice(2);
  const parts = target.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  for (const seg of target.split('/').filter(Boolean)) {
    if (seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.length === 0 ? '/' : '/' + parts.join('/');
}

/** Es un directorio (o un enlace a uno): se puede entrar con cd. */
export function isDirectory(node: FHSNode): boolean {
  return node.permissions.startsWith('d') || (node.type === 'symlink' && Boolean(node.children));
}

function longLine(n: FHSNode): string {
  const [user, group] = n.owner.split(':');
  const links = isDirectory(n) ? 2 : 1;
  return `${n.permissions} ${String(links).padStart(2)} ${user.padEnd(9)} ${(group ?? user).padEnd(9)} ${n.size.padStart(10)} ${n.modified} ${n.name}${n.symlinkTarget ? ` -> ${n.symlinkTarget.replace(/^\//, '')}` : ''}`;
}

const MISSION_FOR = {
  mount: 'mission-mount-pendrive-manual',
  truncate: 'mission-log-disk-full',
  nginx: 'mission-nginx-config-error',
} as const;

export const HELP = [
  'Comandos disponibles (autocompletado con TAB e historial con ↑/↓):',
  '  pwd                  Directorio de trabajo actual',
  '  ls [-l] [ruta]       Contenido de un directorio',
  '  cd <ruta>            Cambia de directorio (sincronizado con el árbol)',
  '  cat <archivo>        Muestra un archivo de configuración, un log o /proc',
  '  stat <ruta>          Permisos en octal, bits especiales, inodo y propietario',
  '  file <ruta>          Tipo de un archivo',
  '  find / -name X       Busca por nombre en todo el árbol',
  '  tree [ruta]          Subramas de un directorio',
  '  df -h | du -sh       Uso de disco por partición y tamaño de los logs',
  '  free -h              Memoria RAM y swap (lee /proc/meminfo)',
  '  lsblk | blkid        Discos, particiones, UUID y sistemas de archivos',
  '  mount [disp] [dir]   Lista los montajes o monta un dispositivo',
  '  validar              Comprueba si estás en el objetivo de la incidencia',
  '  clear                Limpia la pantalla',
].join('\n');

export function runShell(raw: string, ctx: ShellContext): ShellResult {
  const { tree, cwd, mission } = ctx;
  const line = raw.trim();
  const parts = line.split(/\s+/);
  const args = parts[0] === 'sudo' ? parts.slice(1) : parts;
  const cmd = args[0] ?? '';
  const arg1 = args[1];
  const res = (output: string, extra: Partial<ShellResult> = {}): ShellResult => ({ output, effects: [], ...extra });
  const remediationLine = line.replace(/^sudo\s+/, '');

  if (line === 'clear') return { output: '', clear: true, effects: [] };

  // El comando que resuelve la incidencia solo funciona una vez localizado su archivo
  if (remediationLine === mission.remediationCommand) {
    if (!ctx.located) {
      return res(
        `Antes de aplicar la solución, localiza en el árbol el archivo o directorio de la incidencia #${mission.number} y escribe «validar».`,
        { isError: true }
      );
    }
    const effects: ShellEffect[] = [{ type: 'remediate' }];
    if (mission.id === MISSION_FOR.mount) effects.push({ type: 'mount_pendrive' });
    if (mission.id === MISSION_FOR.truncate) effects.push({ type: 'truncate_syslog' });
    return res(`[OK] ${mission.remediationEffect}`, { isSuccess: true, effects });
  }

  switch (cmd) {
    case 'help':
      return res(HELP);
    case 'pwd':
      return res(cwd);
    case 'whoami':
      return res('root');
    case 'id':
      return res('uid=0(root) gid=0(root) grupos=0(root)');
    case 'validar': {
      // «validar» comprueba el directorio actual; «validar <ruta>» comprueba esa ruta (p. ej. un archivo)
      const target = arg1 ? resolvePath(cwd, arg1) : cwd;
      if (!findNodeByPath(tree, target)) {
        return res(`validar: ${arg1}: No existe el fichero o el directorio`, { isError: true });
      }
      return res(`Comprobando ${target} frente a la incidencia #${mission.number}...`, {
        effects: [{ type: 'validate', path: target }],
      });
    }

    case 'cd': {
      const target = resolvePath(cwd, arg1 ?? '~');
      const node = findNodeByPath(tree, target);
      if (!node) return res(`bash: cd: ${arg1}: No existe el fichero o el directorio`, { isError: true });
      if (!isDirectory(node)) return res(`bash: cd: ${arg1}: No es un directorio`, { isError: true });
      return res('', { effects: [{ type: 'navigate', path: node.path }] });
    }

    case 'ls': {
      const pathArg = args.slice(1).find((p) => !p.startsWith('-'));
      const flags = args.slice(1).filter((p) => p.startsWith('-')).join('');
      const node = findNodeByPath(tree, pathArg ? resolvePath(cwd, pathArg) : cwd);
      if (!node) return res(`ls: no se puede acceder a '${pathArg}': No existe el fichero o el directorio`, { isError: true });
      if (!isDirectory(node) || flags.includes('d')) return res(flags.includes('l') ? longLine(node) : node.name);
      const children = node.children ?? [];
      if (flags.includes('l')) {
        return res([`total ${children.length * 4}`, ...children.map(longLine)].join('\n'));
      }
      return res(children.map((c) => (isDirectory(c) ? `${c.name}/` : c.name)).join('   ') || '');
    }

    case 'stat': {
      const node = findNodeByPath(tree, resolvePath(cwd, arg1 ?? '.'));
      if (!node) return res(`stat: no se puede efectuar stat sobre '${arg1}': No existe el fichero o el directorio`, { isError: true });
      const d = decodePermissions(node.permissions);
      const [user, group] = node.owner.split(':');
      return res(
        [
          `  Fichero: ${node.path}${node.symlinkTarget ? ` -> ${node.symlinkTarget}` : ''}`,
          `   Tamaño: ${node.size.padEnd(12)} Nodo-i: ${String(node.inode).padEnd(10)} Tipo: ${d.fileTypeLabel}`,
          `   Acceso: (${d.octal}/${node.permissions})  Uid: (${user})  Gid: (${group ?? user})`,
          d.specialBit ? `   Bits especiales: ${d.specialBit}` : null,
          `   FHS: ${node.fhsCategory} · ${node.shareable}`,
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    case 'file': {
      const node = findNodeByPath(tree, resolvePath(cwd, arg1 ?? '.'));
      if (!node) return res(`${arg1}: cannot open \`${arg1}' (No such file or directory)`, { isError: true });
      const kind =
        node.type === 'block'
          ? 'block special'
          : node.type === 'char'
          ? 'character special'
          : node.type === 'symlink'
          ? `symbolic link to ${node.symlinkTarget?.replace(/^\//, '')}`
          : isDirectory(node)
          ? 'directory'
          : node.path === '/lost+found/#19402'
          ? 'ASCII text'
          : node.content?.startsWith('ELF')
          ? node.content.split('\n')[0]
          : node.content?.startsWith('#!')
          ? 'Bourne-Again shell script, ASCII text executable'
          : node.type === 'proc'
          ? 'empty'
          : 'ASCII text';
      return res(`${node.path}: ${kind}`, { effects: [{ type: 'navigate', path: isDirectory(node) ? node.path : getParentPath(node.path) }] });
    }

    case 'find': {
      const nameIdx = args.indexOf('-name');
      const query = (nameIdx >= 0 ? args[nameIdx + 1] : args[args.length - 1])?.replace(/['"*]/g, '') ?? '';
      const base = nameIdx > 1 ? resolvePath(cwd, args[1]) : '/';
      const matches = getAllPaths(tree).filter(
        (n) => (base === '/' || n.path === base || n.path.startsWith(base + '/')) && n.name.toLowerCase().includes(query.toLowerCase())
      );
      return res(matches.length ? matches.map((m) => m.path).join('\n') : '');
    }

    case 'tree': {
      const node = findNodeByPath(tree, resolvePath(cwd, arg1 ?? '.'));
      if (!node || !isDirectory(node)) return res(`${arg1} [error opening dir]`, { isError: true });
      const kids = node.children ?? [];
      return res([node.path, ...kids.map((c, i) => `${i === kids.length - 1 ? '└── ' : '├── '}${c.name}`), '', `${kids.filter(isDirectory).length} directories, ${kids.filter((c) => !isDirectory(c)).length} files`].join('\n'));
    }

    case 'cat': {
      if (!arg1) return res('cat: falta un operando. Ejemplo: cat /etc/fstab', { isError: true });
      const node = findNodeByPath(tree, resolvePath(cwd, arg1));
      if (!node) return res(`cat: ${arg1}: No existe el fichero o el directorio`, { isError: true });
      if (isDirectory(node)) return res(`cat: ${arg1}: Es un directorio`, { isError: true });
      if (node.type === 'block' || node.type === 'char') {
        return res(`(${node.path} es un dispositivo: cat leería sus datos crudos. Usa blkid o lsblk para ver qué contiene.)`);
      }
      return res(node.content || `[${node.summary}]`, { effects: [{ type: 'navigate', path: getParentPath(node.path) }] });
    }

    case 'free':
      return res(
        [
          '               total        usado       libre  compartido   búf/caché  disponible',
          'Mem:          15.6Gi       3.8Gi       3.9Gi        42Mi       7.9Gi      11.3Gi',
          'Inter:         2.0Gi          0B       2.0Gi',
        ].join('\n')
      );

    case 'lsblk':
      return res(
        [
          'NAME        MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS',
          'sda           8:0    0   50G  0 disk',
          '└─sda1        8:1    0   50G  0 part /',
          'sdb           8:16   1   32G  0 disk',
          `└─sdb1        8:17   1   32G  0 part ${ctx.pendriveMounted ? '/mnt/pendrive' : ''}`.trimEnd(),
          'nvme0n1     259:0    0   50G  0 disk',
        ].join('\n')
      );

    case 'df': {
      const syslog = findNodeByPath(tree, '/var/log/syslog');
      const full = syslog?.size === '42.8G';
      return res(
        [
          'S.ficheros     Tamaño Usados  Disp Uso% Montado en',
          'udev             7.8G      0  7.8G   0% /dev',
          'tmpfs            1.6G   840K  1.6G   1% /run',
          full ? '/dev/sda1         50G   50G  112M  99% /' : '/dev/sda1         50G  6.7G   43G  14% /',
          'tmpfs            7.8G      0  7.8G   0% /dev/shm',
          ...(ctx.pendriveMounted ? ['/dev/sdb1         32G  1.2G   31G   4% /mnt/pendrive'] : []),
        ].join('\n')
      );
    }

    case 'du': {
      const syslog = findNodeByPath(tree, '/var/log/syslog');
      return res(
        [
          `${syslog?.size ?? '42.8G'}\t/var/log/syslog`,
          '4.2M\t/var/log/auth.log',
          '18K\t/var/log/nginx/error.log',
        ].join('\n')
      );
    }

    case 'blkid': {
      const lines = [
        '/dev/sda1: UUID="8f4b2c10-9a11-4d3e-8b12-09a81f23e101" BLOCK_SIZE="4096" TYPE="ext4" PARTUUID="5c2f1e8a-01"',
        '/dev/sdb1: LABEL="USB_RESCATE" UUID="4A8F-9C21" BLOCK_SIZE="512" TYPE="vfat" PARTUUID="a1b2c3d4-01"',
      ];
      // Con un dispositivo como argumento, blkid solo muestra ese (y nada si no lo reconoce)
      return res((arg1 ? lines.filter((l) => l.startsWith(arg1 + ':')) : lines).join('\n'));
    }

    case 'nginx':
      if (!args.includes('-t')) return res('Uso en el laboratorio: nginx -t (comprueba la configuración)');
      return ctx.remediated.includes(MISSION_FOR.nginx)
        ? res('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful', { isSuccess: true })
        : res('nginx: [emerg] unknown directive "keepalive_timout" in /etc/nginx/nginx.conf:17\nnginx: configuration file /etc/nginx/nginx.conf test failed', { isError: true });

    case 'mount': {
      if (args.length === 1) {
        return res(
          [
            '/dev/sda1 on / type ext4 (rw,relatime,errors=remount-ro)',
            'proc on /proc type proc (rw,nosuid,nodev,noexec,relatime)',
            'sysfs on /sys type sysfs (rw,nosuid,nodev,noexec,relatime)',
            'devtmpfs on /dev type devtmpfs (rw,nosuid,size=8192000k,mode=755)',
            'tmpfs on /run type tmpfs (rw,nosuid,nodev,size=1632124k,mode=755)',
            ...(ctx.pendriveMounted ? ['/dev/sdb1 on /mnt/pendrive type vfat (rw,relatime,fmask=0022,dmask=0022)'] : []),
          ].join('\n')
        );
      }
      const dev = args.find((a, i) => i > 0 && a.startsWith('/dev/'));
      const dir = args.find((a, i) => i > 0 && !a.startsWith('-') && !a.startsWith('/dev/'));
      if (dev === '/dev/sdb1' && dir && resolvePath(cwd, dir) === '/mnt/pendrive') {
        if (ctx.pendriveMounted) return res('mount: /mnt/pendrive: /dev/sdb1 ya está montado en /mnt/pendrive.', { isError: true });
        const effects: ShellEffect[] = [{ type: 'mount_pendrive' }, { type: 'navigate', path: '/mnt/pendrive' }];
        if (mission.id === MISSION_FOR.mount && ctx.located) effects.push({ type: 'remediate' });
        return res('', { isSuccess: true, effects });
      }
      if (dev === '/dev/sdb1' && dir) {
        return res(`mount: ${dir}: el punto de montaje no existe.`, { isError: true });
      }
      return res('mount: solo el pendrive (/dev/sdb1) está libre para montar en este laboratorio.', { isError: true });
    }

    case 'truncate': {
      if (!/-s\s*0\b/.test(line) || !line.includes('/var/log/syslog')) return res('Uso: truncate -s 0 /var/log/syslog');
      const effects: ShellEffect[] = [{ type: 'truncate_syslog' }];
      if (mission.id === MISSION_FOR.truncate && ctx.located) effects.push({ type: 'remediate' });
      return res('', { isSuccess: true, effects });
    }

    default:
      return res(`bash: ${cmd}: orden no encontrada en el simulador. Escribe help para ver la lista.`, { isError: true });
  }
}
