export type NodeType = 'dir' | 'file' | 'symlink' | 'block' | 'char' | 'proc';

export interface FHSNode {
  path: string;
  name: string;
  type: NodeType;
  permissions: string;
  owner: string;
  size: string;
  inode: number;
  modified: string;
  fhsCategory: 'Estático' | 'Variable' | 'Virtual (RAM)' | 'Dispositivos' | 'Montajes' | 'Usuarios';
  shareable: 'Compartible' | 'No compartible' | 'Virtual / Kernel';
  summary: string;
  fhsDescription: string;
  commonMistake?: string;
  symlinkTarget?: string;
  content?: string;
  children?: FHSNode[];
}

export interface PermissionBreakdown {
  fileTypeChar: string;
  fileTypeLabel: string;
  octal: string;
  userPerms: string;
  groupPerms: string;
  otherPerms: string;
  specialBit: string | null;
  specialBitExplanation: string | null;
}

export function decodePermissions(permStr: string): PermissionBreakdown {
  const clean = permStr.trim();
  const typeChar = clean[0] || '-';
  const typeMap: Record<string, string> = {
    d: 'Directorio (d)',
    '-': 'Fichero regular (-)',
    l: 'Enlace simbólico (l)',
    b: 'Dispositivo de bloques (b)',
    c: 'Dispositivo de caracteres (c)'
  };

  const u = clean.slice(1, 4);
  const g = clean.slice(4, 7);
  const o = clean.slice(7, 10);

  const calcTriad = (triad: string) => {
    let val = 0;
    if (triad[0] === 'r') val += 4;
    if (triad[1] === 'w') val += 2;
    if (triad[2] === 'x' || triad[2] === 's' || triad[2] === 't') val += 1;
    return val;
  };

  let specialVal = 0;
  let specialBit: string | null = null;
  let specialBitExplanation: string | null = null;

  if (u[2] === 's' || u[2] === 'S') {
    specialVal += 4;
    specialBit = 'SUID (Set User ID = 4000)';
    specialBitExplanation =
      'El bit SUID hace que cualquier usuario que ejecute este binario lo corra temporalmente con los permisos de su propietario (root). Esencial en comandos como /bin/mount o /usr/bin/passwd.';
  }
  if (g[2] === 's' || g[2] === 'S') {
    specialVal += 2;
    specialBit = 'SGID (Set Group ID = 2000)';
    specialBitExplanation =
      'En directorios, hace que los archivos nuevos hereden automáticamente el grupo del directorio padre.';
  }
  if (o[2] === 't' || o[2] === 'T') {
    specialVal += 1;
    specialBit = 'Sticky Bit (Bit de persistencia = 1000)';
    specialBitExplanation =
      'Presente en /tmp (drwxrwxrwt = 1777). Permite que todos los usuarios creen archivos en el directorio, pero impide que un usuario borre o renombre archivos que pertenezcan a otro usuario.';
  }

  const octal = `${specialVal}${calcTriad(u)}${calcTriad(g)}${calcTriad(o)}`;

  return {
    fileTypeChar: typeChar,
    fileTypeLabel: typeMap[typeChar] || 'Nodo especial',
    octal,
    userPerms: u,
    groupPerms: g,
    otherPerms: o,
    specialBit,
    specialBitExplanation
  };
}

export const INITIAL_FHS_TREE: FHSNode = {
  path: '/',
  name: '/',
  type: 'dir',
  permissions: 'drwxr-xr-x',
  owner: 'root:root',
  size: '4.0K',
  inode: 2,
  modified: 'Oct 14 09:00',
  fhsCategory: 'Estático',
  shareable: 'No compartible',
  summary: 'Directorio raíz (Root Filesystem): origen jerárquico de todo el árbol Linux.',
  fhsDescription:
    'Según el estándar FHS 3.0 (Filesystem Hierarchy Standard), el directorio raíz (/) es el punto de partida único del cual cuelgan todos los demás directorios, particiones y dispositivos montados. En Linux no existen letras de unidad (como C: o D:); cualquier disco o partición adicional se integra como un subdirectorio dentro de este árbol único.',
  commonMistake:
    'No confundir "/" (el directorio raíz del sistema de ficheros) con "/root" (el directorio personal del superusuario administrador root).',
  children: [
    {
      path: '/bin',
      name: 'bin',
      type: 'symlink',
      symlinkTarget: '/usr/bin',
      permissions: 'lrwxrwxrwx',
      owner: 'root:root',
      size: '7B',
      inode: 12,
      modified: 'Oct 14 09:00',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Binarios esenciales de usuario disponibles incluso en modo monousuario.',
      fhsDescription:
        'Contiene los ejecutables de comandos fundamentales requeridos tanto por el administrador como por usuarios sin privilegios (ls, cp, mv, bash, cat, mount) cuando no hay otras particiones montadas. En distribuciones modernas con UsrMerge (Debian, Ubuntu, Fedora, Arch), /bin es un enlace simbólico a /usr/bin.',
      commonMistake:
        'Los programas compilados manualmente por el administrador no deben copiarse en /bin (que es gestionado por paquetes del sistema), sino en /usr/local/bin.',
      children: [
        {
          path: '/bin/bash',
          name: 'bash',
          type: 'file',
          permissions: '-rwxr-xr-x',
          owner: 'root:root',
          size: '1.4M',
          inode: 1041,
          modified: 'Sep 20 12:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Intérprete de comandos GNU Bourne-Again SHell.',
          fhsDescription: 'Ejecutable binario ELF de 64 bits que proporciona la shell interactiva por defecto para usuarios y scripts del sistema.',
          content: 'ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2\nGNU bash, versión 5.2.21(1)-release (x86_64-pc-linux-gnu)'
        },
        {
          path: '/bin/ls',
          name: 'ls',
          type: 'file',
          permissions: '-rwxr-xr-x',
          owner: 'root:root',
          size: '142K',
          inode: 1042,
          modified: 'Sep 20 12:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Lista el contenido de directorios e información de inodos.',
          fhsDescription: 'Utilidad parte de GNU coreutils para listar archivos, permisos, propietarios y tamaños.'
        },
        {
          path: '/bin/mount',
          name: 'mount',
          type: 'file',
          permissions: '-rwsr-xr-x',
          owner: 'root:root',
          size: '55K',
          inode: 1045,
          modified: 'Sep 20 12:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Comando para acoplar sistemas de ficheros al árbol jerárquico (con bit SUID).',
          fhsDescription: 'Permite asociar un dispositivo de bloques (ej. /dev/sdb1) a un directorio punto de montaje (ej. /mnt/pendrive). Nota el bit SUID (s) en sus permisos (-rwsr-xr-x = 4755).'
        }
      ]
    },
    {
      path: '/boot',
      name: 'boot',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 128,
      modified: 'Oct 28 07:15',
      fhsCategory: 'Estático',
      shareable: 'No compartible',
      summary: 'Ficheros estáticos del gestor de arranque (GRUB) y la imagen del kernel Linux.',
      fhsDescription:
        'Almacena todo lo necesario para el proceso de arranque antes de que el kernel inicie el primer proceso de espacio de usuario (systemd / init): imágenes comprimidas del núcleo (vmlinuz), discos RAM iniciales (initrd / initramfs) y configuración de GRUB.',
      commonMistake:
        'La configuración general de servicios del sistema NO está en /boot (va en /etc). /boot solo interviene en los primeros segundos del encendido del equipo.',
      children: [
        {
          path: '/boot/vmlinuz-6.8.0-45-generic',
          name: 'vmlinuz-6.8.0-45-generic',
          type: 'file',
          permissions: '-rw-------',
          owner: 'root:root',
          size: '14.2M',
          inode: 2010,
          modified: 'Oct 28 07:14',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Imagen ejecutable y comprimida del núcleo (Kernel) de Linux.',
          fhsDescription: 'Archivo binario que contiene el kernel Linux compilado y comprimido con zstd/lz4, cargado en memoria RAM por GRUB al arrancar.',
          content: 'Linux kernel x86 boot executable bzImage, version 6.8.0-45-generic (buildd@lcy02-amd64-044) #45-Ubuntu SMP PREEMPT_DYNAMIC'
        },
        {
          path: '/boot/initrd.img-6.8.0-45-generic',
          name: 'initrd.img-6.8.0-45-generic',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '68.5M',
          inode: 2011,
          modified: 'Oct 28 07:15',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Initial RAM Disk: sistema de archivos temporal en memoria para montar la raíz real.',
          fhsDescription: 'Contiene los módulos de kernel (drivers ext4, nvme, LVM, RAID) necesarios para que el kernel pueda acceder al disco duro donde reside /.'
        },
        {
          path: '/boot/grub',
          name: 'grub',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 2020,
          modified: 'Oct 28 07:15',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Módulos y fichero de configuración del gestor de arranque GNU GRUB 2.',
          fhsDescription: 'Contiene grub.cfg, generado automáticamente mediante el comando update-grub a partir de /etc/default/grub.',
          children: [
            {
              path: '/boot/grub/grub.cfg',
              name: 'grub.cfg',
              type: 'file',
              permissions: '-r--r--r--',
              owner: 'root:root',
              size: '12.4K',
              inode: 2025,
              modified: 'Oct 28 07:15',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Menú de arranque generado por update-grub (no editar directamente).',
              fhsDescription: 'Define las entradas del menú de inicio y parámetros del kernel (como root=UUID=... ro quiet splash).',
              content: `# DO NOT EDIT THIS FILE\n# It is automatically generated by grub-mkconfig using templates from /etc/grub.d\n# and settings from /etc/default/grub\n\nmenuentry 'Ubuntu GNU/Linux, con Linux 6.8.0-45-generic' {\n    insmod gzio\n    insmod part_gpt\n    insmod ext2\n    linux /boot/vmlinuz-6.8.0-45-generic root=UUID=8f4b2c10-9a11-4d3e-8b12-09a81f23e101 ro quiet\n    initrd /boot/initrd.img-6.8.0-45-generic\n}`
            }
          ]
        }
      ]
    },
    {
      path: '/dev',
      name: 'dev',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.2K',
      inode: 3,
      modified: 'Nov 03 08:00',
      fhsCategory: 'Dispositivos',
      shareable: 'No compartible',
      summary: 'Nodos de dispositivos de bloques y caracteres gestionados dinámicamente por udev.',
      fhsDescription:
        'En Unix/Linux rige el principio "todo es un fichero". /dev expone el hardware físico y dispositivos virtuales como ficheros especiales de bloques (b: discos SATA/USB/NVMe, particiones) o de caracteres (c: terminales, puertos serie, generadores de entropía). Es mantenido en tiempo real por systemd-udevd sobre devtmpfs.',
      commonMistake:
        'Un nodo en /dev (como /dev/sdb1) representa el hardware crudo de la partición, NO el directorio donde puedes leer sus carpetas. Para ver sus archivos debes montarlo en /mnt o /media.',
      children: [
        {
          path: '/dev/sda',
          name: 'sda',
          type: 'block',
          permissions: 'brw-rw----',
          owner: 'root:disk',
          size: '8, 0 (120G)',
          inode: 301,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Primer disco duro SATA/SCSI principal del sistema (120 GB).',
          fhsDescription: 'Dispositivo de bloques completo que contiene la tabla de particiones GPT del disco del sistema.'
        },
        {
          path: '/dev/sda1',
          name: 'sda1',
          type: 'block',
          permissions: 'brw-rw----',
          owner: 'root:disk',
          size: '8, 1 (119G)',
          inode: 302,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Primera partición del disco principal montada actualmente en /.',
          fhsDescription: 'Partición formateada en ext4 que aloja el sistema de ficheros raíz.'
        },
        {
          path: '/dev/sdb',
          name: 'sdb',
          type: 'block',
          permissions: 'brw-rw----',
          owner: 'root:disk',
          size: '8, 16 (32G)',
          inode: 310,
          modified: 'Nov 03 08:38',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Segundo disco de bloques detectado: Memoria USB Kingston DataTraveler (32 GB).',
          fhsDescription: 'Representa el dispositivo físico USB completo recién conectado al puerto USB 3.0. Su primera partición utilizable es /dev/sdb1.',
          content: `Dispositivo de bloques: Major 8, Minor 16\nModelo: Kingston DataTraveler 3.0\nCapacidad: 32.0 GB (62521344 sectores de 512 bytes)\nTabla de particiones: dos (MBR)\nParticiones detectadas: /dev/sdb1 (FAT32 / exFAT)`
        },
        {
          path: '/dev/sdb1',
          name: 'sdb1',
          type: 'block',
          permissions: 'brw-rw----',
          owner: 'root:disk',
          size: '8, 17 (32G)',
          inode: 311,
          modified: 'Nov 03 08:38',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Primera partición del pendrive USB externo (lista para ser montada).',
          fhsDescription: 'Nodo de dispositivo de bloques correspondiente a la partición de datos dentro del pendrive USB (/dev/sdb). Para acceder a sus ficheros debe ejecutarse: mount /dev/sdb1 /mnt/pendrive.',
          commonMistake: 'Intentar hacer "cd /dev/sdb1" devuelve el error "Not a directory". /dev/sdb1 es el nodo de bloque que se pasa como origen al comando mount.',
          content: `LABEL="USB_RESCATE" UUID="4A8F-9C21" BLOCK_SIZE="4096" TYPE="vfat" PARTUUID="a1b2c3d4-01"\nEstado actual: Listo para montaje manual en /mnt/pendrive.`
        },
        {
          path: '/dev/nvme0n1',
          name: 'nvme0n1',
          type: 'block',
          permissions: 'brw-rw----',
          owner: 'root:disk',
          size: '259, 0 (500G)',
          inode: 315,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Unidad SSD NVMe PCIe secundaria de alto rendimiento (controladora 0, namespace 1).',
          fhsDescription: 'En discos NVMe las particiones llevan una "p" antes del número (ej. /dev/nvme0n1p1) para distinguir el número de namespace del número de partición.'
        },
        {
          path: '/dev/null',
          name: 'null',
          type: 'char',
          permissions: 'crw-rw-rw-',
          owner: 'root:root',
          size: '1, 3',
          inode: 320,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Sumidero de datos ("agujero negro"): descarta todo lo que se escribe en él.',
          fhsDescription: 'Dispositivo especial de caracteres muy utilizado en redirecciones (ej. comando 2> /dev/null) para silenciar salidas o errores.'
        },
        {
          path: '/dev/zero',
          name: 'zero',
          type: 'char',
          permissions: 'crw-rw-rw-',
          owner: 'root:root',
          size: '1, 5',
          inode: 321,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Generador infinito de bytes nulos (0x00), usado para inicializar discos o ficheros swap.',
          fhsDescription: 'Proporciona tantos caracteres nulos como se lean de él (ej. dd if=/dev/zero of=/swapfile bs=1M count=2048).'
        },
        {
          path: '/dev/urandom',
          name: 'urandom',
          type: 'char',
          permissions: 'crw-rw-rw-',
          owner: 'root:root',
          size: '1, 9',
          inode: 322,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Dispositivos',
          shareable: 'No compartible',
          summary: 'Generador criptográfico no bloqueante de números pseudoaleatorios del kernel.',
          fhsDescription: 'Utilizado por OpenSSL, SSH y herramientas de cifrado para generar claves y tokens seguros.'
        }
      ]
    },
    {
      path: '/etc',
      name: 'etc',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '12.0K',
      inode: 400,
      modified: 'Nov 03 08:15',
      fhsCategory: 'Estático',
      shareable: 'No compartible',
      summary: 'Configuración global del sistema y de los servicios instalados en el host.',
      fhsDescription:
        'Originalmente "et cetera", en el estándar FHS aloja exclusivamente ficheros de configuración estáticos de texto plano locales a la máquina. Ningún binario ejecutable ni ningún log variable debe almacenarse en /etc.',
      commonMistake:
        'Las configuraciones personales de cada usuario NO van en /etc (que afecta a todo el servidor), sino en ficheros ocultos (dotfiles) dentro de /home/usuario/.',
      children: [
        {
          path: '/etc/fstab',
          name: 'fstab',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '684B',
          inode: 401,
          modified: 'Oct 18 11:20',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Tabla estática de sistemas de ficheros que se montan automáticamente al arrancar.',
          fhsDescription: 'Define qué particiones (por UUID, LABEL o dispositivo), recursos de red NFS o particiones swap deben montarse durante el arranque o mediante "mount -a".',
          commonMistake: 'Para ver qué está montado ahora mismo en memoria se consulta /proc/mounts; para hacer que un montaje sea permanente tras reiniciar se edita /etc/fstab.',
          content: `# /etc/fstab: static file system information.\n# <file system>                           <mount point>   <type>  <options>          <dump> <pass>\nUUID=8f4b2c10-9a11-4d3e-8b12-09a81f23e101 /               ext4    errors=remount-ro  0      1\nUUID=3e12-89ab                            /boot/efi       vfat    umask=0077         0      1\n/swapfile                                 none            swap    sw                 0      0\n# Añadir debajo nuevas particiones para montaje persistente en arranque:`
        },
        {
          path: '/etc/passwd',
          name: 'passwd',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '1.9K',
          inode: 402,
          modified: 'Oct 25 16:40',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Base de datos de cuentas de usuario (UID, GID, directorio home y shell).',
          fhsDescription: 'Archivo legible por todos los usuarios que asocia nombres de usuario con su UID numérico, directorio personal y shell de inicio. Los hashes de contraseñas se guardan por seguridad en /etc/shadow.',
          content: `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nsyslog:x:104:110::/home/syslog:/usr/sbin/nologin\nalumno:x:1000:1000:Alumno ASIR/DAW,,,:/home/alumno:/bin/bash\nprofesor:x:1001:1001:Profesor Sistemas,,,:/home/profesor:/bin/bash`
        },
        {
          path: '/etc/shadow',
          name: 'shadow',
          type: 'file',
          permissions: '-rw-r-----',
          owner: 'root:shadow',
          size: '1.2K',
          inode: 403,
          modified: 'Oct 25 16:40',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Hashes cifrados de contraseñas de usuarios y políticas de caducidad.',
          fhsDescription: 'Accesible únicamente por root y el grupo shadow (0640). Protege los hashes yescrypt/SHA-512 frente a ataques de diccionario locales.',
          content: `root:$y$j9T$8K1mP9vL2xQ...:19980:0:99999:7:::\nalumno:$y$j9T$4R9dF2wN7zB...:19985:0:99999:7:::\nprofesor:$y$j9T$1M5cK8pT3vX...:19985:0:99999:7:::`
        },
        {
          path: '/etc/group',
          name: 'group',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '890B',
          inode: 407,
          modified: 'Oct 25 16:40',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Definición de grupos del sistema (GID) y lista de usuarios miembros.',
          fhsDescription: 'Define los grupos primarios y suplementarios del servidor (root, sudo, adm, www-data, docker).',
          content: `root:x:0:\nadm:x:4:syslog,alumno\nsudo:x:27:alumno,profesor\nwww-data:x:33:\ndocker:x:998:alumno\nalumno:x:1000:\nprofesor:x:1001:`
        },
        {
          path: '/etc/hostname',
          name: 'hostname',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '8B',
          inode: 408,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Nombre de máquina local (hostname) asignado a este servidor.',
          fhsDescription: 'Leído al arrancar para configurar el nombre del host en el kernel (gestionado con hostnamectl).',
          content: `lab-fhs`
        },
        {
          path: '/etc/hosts',
          name: 'hosts',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '245B',
          inode: 404,
          modified: 'Oct 14 09:05',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Resolución estática local de nombres de dominio a direcciones IP.',
          fhsDescription: 'Permite resolver nombres de host sin necesidad de consultar un servidor DNS externo (tiene prioridad según /etc/nsswitch.conf).',
          content: `127.0.0.1\tlocalhost\n127.0.1.1\tlab-fhs.unfantasmaenelsistema.local\tlab-fhs\n192.168.10.50\tnas-backups.local\n\n# IPv6\n::1\tip6-localhost ip6-loopback`
        },
        {
          path: '/etc/resolv.conf',
          name: 'resolv.conf',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '182B',
          inode: 405,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Configuración de los servidores DNS utilizados por el resolvedor del sistema.',
          fhsDescription: 'Especifica las directivas nameserver (IPs de servidores DNS) y dominios de búsqueda.',
          content: `# Gestionado por systemd-resolved\nnameserver 1.1.1.1\nnameserver 8.8.8.8\nsearch unfantasmaenelsistema.local`
        },
        {
          path: '/etc/sudoers',
          name: 'sudoers',
          type: 'file',
          permissions: '-r--r-----',
          owner: 'root:root',
          size: '1.6K',
          inode: 406,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Reglas de delegación de privilegios administrativos mediante sudo.',
          fhsDescription: 'Define qué usuarios o grupos pueden ejecutar comandos como root. Siempre debe editarse mediante el comando "visudo" para validar la sintaxis.',
          content: `Defaults\tenv_reset\nDefaults\tmail_badpass\nDefaults\tsecure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"\n\nroot\tALL=(ALL:ALL) ALL\n%sudo\tALL=(ALL:ALL) ALL`
        },
        {
          path: '/etc/sysctl.conf',
          name: 'sysctl.conf',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '2.1K',
          inode: 409,
          modified: 'Oct 20 11:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Parámetros del kernel que se aplican de forma persistente en cada arranque.',
          fhsDescription: 'Mientras que escribir en /proc/sys/ cambia parámetros del kernel en caliente (y se pierden al apagar), añadir la directiva en /etc/sysctl.conf hace que el ajuste sea permanente tras reiniciar.',
          content: `# /etc/sysctl.conf - Configuration file for setting system variables\n# Descomentar la siguiente línea para activar IPv4 forwarding de forma permanente:\n# net.ipv4.ip_forward=1\nvm.swappiness=10`
        },
        {
          path: '/etc/crontab',
          name: 'crontab',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '1.0K',
          inode: 410,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Tabla global de tareas programadas del sistema (incluye columna de usuario).',
          fhsDescription: 'A diferencia del crontab personal de cada usuario (crontab -e, guardado en /var/spool/cron/crontabs), /etc/crontab incluye un sexto campo para especificar con qué usuario se ejecuta la tarea.',
          content: `SHELL=/bin/sh\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n# m h dom mon dow user\tcommand\n17 *\t* * *\troot    cd / && run-parts --report /etc/cron.hourly\n25 6\t* * *\troot\ttest -x /usr/sbin/anacron || run-parts --report /etc/cron.daily`
        },
        {
          path: '/etc/skel',
          name: 'skel',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 412,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Directorio "esqueleto" (plantilla base) para las carpetas personales de nuevos usuarios.',
          fhsDescription: 'Cuando se crea un usuario nuevo con "useradd -m", el sistema copia automáticamente todos los archivos de /etc/skel (.bashrc, .profile, .bash_logout) dentro del nuevo /home/usuario.',
          children: [
            {
              path: '/etc/skel/.bashrc',
              name: '.bashrc',
              type: 'file',
              permissions: '-rw-r--r--',
              owner: 'root:root',
              size: '3.5K',
              inode: 413,
              modified: 'Oct 14 09:00',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Plantilla .bashrc que heredarán automáticamente todas las cuentas de usuario nuevas.',
              fhsDescription: 'Si un administrador quiere que todos los futuros usuarios tengan un alias o variable por defecto al crearse su cuenta, debe añadirlo en /etc/skel/.bashrc.',
              content: `# /etc/skel/.bashrc: Plantilla base copiada a /home/<nuevo_usuario> al ejecutar useradd -m\nalias ll='ls -alF'\nalias la='ls -A'\n# Añade aquí políticas o alias corporativos para futuros usuarios:`
            }
          ]
        },
        {
          path: '/etc/netplan',
          name: 'netplan',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 415,
          modified: 'Oct 19 08:30',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Archivos YAML de configuración declarativa de interfaces de red (IP, máscara, gateway, DNS).',
          fhsDescription: 'Utilizado en Ubuntu Server/Debian modernos para generar la configuración de NetworkManager o systemd-networkd mediante "netplan apply".',
          children: [
            {
              path: '/etc/netplan/01-netcfg.yaml',
              name: '01-netcfg.yaml',
              type: 'file',
              permissions: '-rw-------',
              owner: 'root:root',
              size: '340B',
              inode: 416,
              modified: 'Oct 19 08:30',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Configuración de direccionamiento IP estático de la tarjeta de red eth0.',
              fhsDescription: 'Define la IP fija, puerta de enlace (routes) y servidores DNS de la interfaz de red principal.',
              content: `network:\n  version: 2\n  renderer: networkd\n  ethernets:\n    eth0:\n      dhcp4: no\n      addresses:\n        - 192.168.10.10/24\n      routes:\n        - to: default\n          via: 192.168.10.1\n      nameservers:\n        addresses: [1.1.1.1, 8.8.8.8]`
            }
          ]
        },
        {
          path: '/etc/logrotate.d',
          name: 'logrotate.d',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 418,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Políticas de rotación, compresión y purgado automático de archivos de log.',
          fhsDescription: 'Evita que los archivos de /var/log crezcan indefinidamente y llenen el disco.',
          children: [
            {
              path: '/etc/logrotate.d/rsyslog',
              name: 'rsyslog',
              type: 'file',
              permissions: '-rw-r--r--',
              owner: 'root:root',
              size: '520B',
              inode: 419,
              modified: 'Oct 14 09:00',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Regla de rotación para /var/log/syslog y /var/log/auth.log.',
              fhsDescription: 'Especifica frecuencia de rotación (daily/weekly), límite de tamaño (maxsize 100M), número de históricos (rotate 4) y compresión (compress).',
              content: `/var/log/syslog\n/var/log/auth.log\n{\n\trotate 4\n\tdaily\n\tmaxsize 100M\n\tmissingok\n\tnotifempty\n\tcompress\n\tdelaycompress\n\tsharedscripts\n\tpostrotate\n\t\t/usr/lib/rsyslog/rsyslog-rotate\n\tendscript\n}`
            }
          ]
        },
        {
          path: '/etc/nginx',
          name: 'nginx',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 420,
          modified: 'Nov 03 08:12',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Directorio de configuración del servidor web y proxy inverso Nginx.',
          fhsDescription: 'Contiene el fichero maestro nginx.conf, definiciones de tipos MIME y los directorios sites-available y sites-enabled.',
          children: [
            {
              path: '/etc/nginx/nginx.conf',
              name: 'nginx.conf',
              type: 'file',
              permissions: '-rw-r--r--',
              owner: 'root:root',
              size: '1.5K',
              inode: 421,
              modified: 'Nov 03 08:12',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Archivo principal de configuración global del servicio Nginx.',
              fhsDescription: 'Controla los procesos worker, rutas de logs, directivas HTTP globales e inclusión de virtual hosts. Un error de sintaxis aquí impide que el servicio nginx arranque.',
              content: `user www-data;\nworker_processes auto;\npid /run/nginx.pid;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    sendfile on;\n    tcp_nopush on;\n    include /etc/nginx/mime.types;\n    default_type application/octet-stream;\n\n    # ERROR DETECTADO EN LÍNEA 17: Directiva mal escrita ("keepalive_timout" sin 'e' y falta ';')\n    keepalive_timout 65\n\n    access_log /var/log/nginx/access.log;\n    error_log /var/log/nginx/error.log;\n\n    include /etc/nginx/sites-enabled/*;\n}`
            },
            {
              path: '/etc/nginx/sites-enabled',
              name: 'sites-enabled',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'root:root',
              size: '4.0K',
              inode: 422,
              modified: 'Oct 20 10:00',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Sitios web (VirtualHosts) activos actualmente en Nginx.',
              fhsDescription: 'Contiene enlaces simbólicos hacia /etc/nginx/sites-available para activar sitios web individuales.',
              children: [
                {
                  path: '/etc/nginx/sites-enabled/default.conf',
                  name: 'default.conf',
                  type: 'file',
                  permissions: '-rw-r--r--',
                  owner: 'root:root',
                  size: '512B',
                  inode: 423,
                  modified: 'Oct 20 10:00',
                  fhsCategory: 'Estático',
                  shareable: 'No compartible',
                  summary: 'Configuración del VirtualHost por defecto en el puerto 80.',
                  fhsDescription: 'Apunta el DocumentRoot a /srv/www/html.',
                  content: `server {\n    listen 80 default_server;\n    server_name _;\n    root /srv/www/html;\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ =404;\n    }\n}`
                }
              ]
            }
          ]
        },
        {
          path: '/etc/ssh',
          name: 'ssh',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 440,
          modified: 'Nov 01 19:30',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Claves de host y configuración del cliente y servidor OpenSSH.',
          fhsDescription: 'Albergado en /etc/ssh, contiene tanto ssh_config (cliente) como sshd_config (demonio servidor).',
          children: [
            {
              path: '/etc/ssh/sshd_config',
              name: 'sshd_config',
              type: 'file',
              permissions: '-rw-r--r--',
              owner: 'root:root',
              size: '3.2K',
              inode: 441,
              modified: 'Nov 01 19:30',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Configuración del demonio servidor OpenSSH (puerto, autenticación, root login).',
              fhsDescription: 'Controla la seguridad del acceso remoto por SSH. Aquí se deshabilita el login directo de root (PermitRootLogin no) y se exige autenticación por clave pública.',
              content: `# OpenSSH Server daemon configuration (/etc/ssh/sshd_config)\nPort 22\nAddressFamily any\nListenAddress 0.0.0.0\n\n# ALERTA DE SEGURIDAD: PermitRootLogin está activado permitiendo ataques directos a root\nPermitRootLogin yes\nMaxAuthTries 4\nPubkeyAuthentication yes\nPasswordAuthentication yes\nUsePAM yes\nX11Forwarding no`
            }
          ]
        },
        {
          path: '/etc/systemd',
          name: 'systemd',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 460,
          modified: 'Nov 02 14:20',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Unidades de servicios (.service, .timer, .mount) personalizadas por el administrador.',
          fhsDescription: 'Mientras que los paquetes del sistema instalan sus unidades en /lib/systemd/system, el administrador crea o sobrescribe servicios propios en /etc/systemd/system.',
          children: [
            {
              path: '/etc/systemd/system',
              name: 'system',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'root:root',
              size: '4.0K',
              inode: 461,
              modified: 'Nov 02 14:20',
              fhsCategory: 'Estático',
              shareable: 'No compartible',
              summary: 'Directorio de unidades systemd locales con máxima prioridad.',
              fhsDescription: 'Cualquier archivo .service colocado aquí prevalece sobre las unidades por defecto del sistema.',
              children: [
                {
                  path: '/etc/systemd/system/webapp.service',
                  name: 'webapp.service',
                  type: 'file',
                  permissions: '-rw-r--r--',
                  owner: 'root:root',
                  size: '420B',
                  inode: 462,
                  modified: 'Nov 02 14:20',
                  fhsCategory: 'Estático',
                  shareable: 'No compartible',
                  summary: 'Unidad systemd de un servicio interno que falla al arrancar (status=203/EXEC).',
                  fhsDescription: 'Define cómo systemd arranca y supervisa el demonio webapp. Tras editarlo se requiere ejecutar "systemctl daemon-reload".',
                  content: `[Unit]\nDescription=Servicio Interno de Monitorización WebApp\nAfter=network.target\n\n[Service]\nType=simple\nUser=www-data\nWorkingDirectory=/opt/agente_seguridad\n# FALLO: La ruta apunta a /usr/bin/daemon_inexistente en lugar de /opt/agente_seguridad/bin/daemon\nExecStart=/usr/bin/daemon_inexistente --port 8080\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target`
                }
              ]
            }
          ]
        }
      ]
    },
    {
      path: '/home',
      name: 'home',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 500,
      modified: 'Oct 15 10:00',
      fhsCategory: 'Usuarios',
      shareable: 'Compartible',
      summary: 'Directorios personales de los usuarios estándar del sistema.',
      fhsDescription:
        'Contiene una carpeta por cada usuario regular (ej. /home/alumno), donde se almacenan sus documentos, descargas, proyectos y ficheros ocultos de configuración personal (.bashrc, .profile, .ssh/). Suele ubicarse en una partición separada o exportarse por NFS.',
      commonMistake:
        'El superusuario root NO tiene su carpeta personal dentro de /home/root, sino directamente en /root para que esté disponible aunque /home esté en otra partición sin montar.',
      children: [
        {
          path: '/home/alumno',
          name: 'alumno',
          type: 'dir',
          permissions: 'drwxr-x---',
          owner: 'alumno:alumno',
          size: '4.0K',
          inode: 501,
          modified: 'Nov 03 08:30',
          fhsCategory: 'Usuarios',
          shareable: 'Compartible',
          summary: 'Directorio personal del usuario "alumno" (UID 1000).',
          fhsDescription: 'Espacio de trabajo donde el usuario alumno tiene permisos completos de lectura, escritura y ejecución.',
          children: [
            {
              path: '/home/alumno/.bashrc',
              name: '.bashrc',
              type: 'file',
              permissions: '-rw-r--r--',
              owner: 'alumno:alumno',
              size: '3.7K',
              inode: 502,
              modified: 'Oct 29 18:12',
              fhsCategory: 'Usuarios',
              shareable: 'Compartible',
              summary: 'Script de configuración personal de la shell Bash del usuario alumno.',
              fhsDescription: 'Se ejecuta cada vez que el usuario abre una sesión interactiva de terminal. Define alias, el prompt PS1 y variables de entorno locales.',
              content: `# ~/.bashrc: ejecutado por bash(1) para shells interactivas.\nalias ll='ls -alF --color=auto'\nalias puertos='ss -tulnp'\nexport PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '\nexport PATH="$HOME/.local/bin:$PATH"`
            },
            {
              path: '/home/alumno/proyectos',
              name: 'proyectos',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'alumno:alumno',
              size: '4.0K',
              inode: 505,
              modified: 'Nov 03 08:25',
              fhsCategory: 'Usuarios',
              shareable: 'Compartible',
              summary: 'Carpeta de prácticas y scripts desarrollados por el alumno.',
              fhsDescription: 'Contiene código fuente, artefactos de compilación y scripts de automatización propios del usuario.',
              children: [
                {
                  path: '/home/alumno/proyectos/deploy.sh',
                  name: 'deploy.sh',
                  type: 'file',
                  permissions: '-rwxr-xr-x',
                  owner: 'alumno:alumno',
                  size: '1.1K',
                  inode: 506,
                  modified: 'Nov 03 08:25',
                  fhsCategory: 'Usuarios',
                  shareable: 'Compartible',
                  summary: 'Script de automatización creado por el alumno en su carpeta personal.',
                  fhsDescription: 'Script local en el directorio personal del usuario.',
                  content: `#!/usr/bin/env bash\nset -euo pipefail\necho "Comprobando espacio en disco y desplegando entorno de laboratorio..."\ndf -h /\n`
                }
              ]
            }
          ]
        },
        {
          path: '/home/profesor',
          name: 'profesor',
          type: 'dir',
          permissions: 'drwxr-x---',
          owner: 'profesor:profesor',
          size: '4.0K',
          inode: 520,
          modified: 'Nov 01 11:00',
          fhsCategory: 'Usuarios',
          shareable: 'Compartible',
          summary: 'Directorio personal del usuario "profesor" (UID 1001).',
          fhsDescription: 'Protegido con permisos 750 para que otros usuarios no puedan listar su contenido.'
        }
      ]
    },
    {
      path: '/lib',
      name: 'lib',
      type: 'symlink',
      symlinkTarget: '/usr/lib',
      permissions: 'lrwxrwxrwx',
      owner: 'root:root',
      size: '7B',
      inode: 600,
      modified: 'Oct 14 09:00',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Bibliotecas compartidas (.so) esenciales y módulos del kernel (/lib/modules).',
      fhsDescription:
        'Contiene las librerías dinámicas (como libc.so.6) indispensables para ejecutar los binarios de /bin y /sbin durante el arranque, además de los módulos cargables del kernel (.ko) en /lib/modules/$(uname -r).',
      children: [
        {
          path: '/lib/modules',
          name: 'modules',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 605,
          modified: 'Oct 28 07:15',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Módulos cargables del kernel (drivers de hardware, sistemas de archivos, red).',
          fhsDescription: 'Organizados por versión del kernel (ej. 6.8.0-45-generic). Se cargan con modprobe o insmod.'
        }
      ]
    },
    {
      path: '/lost+found',
      name: 'lost+found',
      type: 'dir',
      permissions: 'drwx------',
      owner: 'root:root',
      size: '16.0K',
      inode: 11,
      modified: 'Nov 03 07:55',
      fhsCategory: 'Estático',
      shareable: 'No compartible',
      summary: 'Fragmentos de archivos e inodos huérfanos recuperados por fsck tras un cierre abrupto.',
      fhsDescription:
        'Cada partición formateada con un sistema de archivos tipo ext2/ext3/ext4 posee su propio directorio lost+found en su raíz. Cuando ocurre un corte de luz y fsck repara el sistema de archivos encontrando inodos válidos que han perdido su nombre en el directorio original, los enlaza aquí numerados por su inodo (#19402).',
      commonMistake:
        'No debe borrarse nunca; es creado automáticamente por mkfs.ext4 al formatear la partición y solo es accesible por root (0700).',
      children: [
        {
          path: '/lost+found/#19402',
          name: '#19402',
          type: 'file',
          permissions: '-rw-------',
          owner: 'root:root',
          size: '24.0K',
          inode: 19402,
          modified: 'Nov 03 07:55',
          fhsCategory: 'Estático',
          shareable: 'No compartible',
          summary: 'Inodo huérfano #19402 recuperado automáticamente por fsck tras un corte eléctrico.',
          fhsDescription: 'El administrador puede inspeccionar su tipo con "file /lost+found/#19402" para restaurarlo a su ruta original.',
          content: `Inodo #19402 recuperado por e2fsck 1.47.0\nContenido detectado: ASCII text, documento de configuración recuperado tras apagado forzado.`
        }
      ]
    },
    {
      path: '/media',
      name: 'media',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 700,
      modified: 'Nov 02 17:00',
      fhsCategory: 'Montajes',
      shareable: 'No compartible',
      summary: 'Puntos de montaje automáticos para medios extraíbles en entornos de escritorio.',
      fhsDescription:
        'El estándar FHS designa /media como el directorio donde los demonios de escritorio (como udisks2 en GNOME/KDE) crean subcarpetas automáticamente (ej. /media/alumno/ETIQUETA_USB) cuando un usuario inserta un pendrive, tarjeta SD o DVD.',
      commonMistake:
        'Diferencia clave de examen FHS: /media es para montajes automáticos de dispositivos extraíbles gestionados por el sistema; /mnt es para montajes temporales realizados manualmente por el administrador por consola.',
      children: [
        {
          path: '/media/alumno',
          name: 'alumno',
          type: 'dir',
          permissions: 'drwxr-x---',
          owner: 'root:root',
          size: '4.0K',
          inode: 701,
          modified: 'Nov 02 17:00',
          fhsCategory: 'Montajes',
          shareable: 'No compartible',
          summary: 'Subdirectorio con ACL para montajes automáticos de medios extraíbles del usuario alumno.',
          fhsDescription: 'Gestionado automáticamente por udisks2 cuando hay entorno gráfico activo.'
        }
      ]
    },
    {
      path: '/mnt',
      name: 'mnt',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 800,
      modified: 'Nov 03 08:35',
      fhsCategory: 'Montajes',
      shareable: 'No compartible',
      summary: 'Punto de montaje temporal para que el administrador monte sistemas de ficheros manualmente.',
      fhsDescription:
        'Según el FHS 3.0, /mnt está reservado específicamente para que los administradores de sistemas monten manualmente y de forma temporal un sistema de ficheros (por ejemplo, un pendrive de rescate en /mnt/pendrive, una imagen ISO o una partición en mantenimiento) desde la terminal mediante el comando mount.',
      commonMistake:
        'Nunca guardes archivos ordinarios en /mnt cuando no haya nada montado, ya que al montar un dispositivo encima, el contenido previo de la carpeta quedará oculto hasta que se desmonte (umount).',
      children: [
        {
          path: '/mnt/pendrive',
          name: 'pendrive',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 801,
          modified: 'Nov 03 08:35',
          fhsCategory: 'Montajes',
          shareable: 'No compartible',
          summary: 'Directorio preparado como punto de montaje manual para el pendrive USB (/dev/sdb1).',
          fhsDescription: 'Directorio destino donde el administrador acopla la partición /dev/sdb1 ejecutando: sudo mount /dev/sdb1 /mnt/pendrive.',
          content: `Estado del punto de montaje: /mnt/pendrive\nListo para acoplar el dispositivo de bloques /dev/sdb1 (USB_RESCATE, vfat 32GB).\nComando estándar FHS: sudo mount /dev/sdb1 /mnt/pendrive`
        },
        {
          path: '/mnt/backup_nfs',
          name: 'backup_nfs',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 802,
          modified: 'Oct 22 09:00',
          fhsCategory: 'Montajes',
          shareable: 'No compartible',
          summary: 'Punto de montaje temporal para cabinas de red NFS durante mantenimientos.',
          fhsDescription: 'Usado para montar recursos remotos puntuales sin incluirlos permanentemente en /etc/fstab.'
        }
      ]
    },
    {
      path: '/opt',
      name: 'opt',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 900,
      modified: 'Oct 30 13:10',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Paquetes de software adicional de terceros autocontenidos (Optional Application Software).',
      fhsDescription:
        'Reservado para aplicaciones adicionales o propietarias que no siguen la división estándar en /usr/bin y /usr/lib, sino que empaquetan todos sus ejecutables, librerías y recursos dentro de su propia subcarpeta /opt/<proveedor> o /opt/<aplicacion> (ej. /opt/google/chrome, /opt/prometheus).',
      children: [
        {
          path: '/opt/agente_seguridad',
          name: 'agente_seguridad',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 901,
          modified: 'Oct 30 13:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Suite de monitorización de terceros instalada como paquete autocontenido en /opt.',
          fhsDescription: 'Contiene su propio subárbol bin/ y lib/ independiente de los repositorios oficiales de la distribución.',
          children: [
            {
              path: '/opt/agente_seguridad/bin',
              name: 'bin',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'root:root',
              size: '4.0K',
              inode: 902,
              modified: 'Oct 30 13:10',
              fhsCategory: 'Estático',
              shareable: 'Compartible',
              summary: 'Binarios ejecutables del paquete opcional instalado en /opt/agente_seguridad.',
              fhsDescription: 'Ubicación real del ejecutable daemon requerido por webapp.service.',
              children: [
                {
                  path: '/opt/agente_seguridad/bin/daemon',
                  name: 'daemon',
                  type: 'file',
                  permissions: '-rwxr-xr-x',
                  owner: 'root:root',
                  size: '8.4M',
                  inode: 903,
                  modified: 'Oct 30 13:10',
                  fhsCategory: 'Estático',
                  shareable: 'Compartible',
                  summary: 'Binario real del demonio de monitorización WebApp.',
                  fhsDescription: 'Ejecutable ELF autónomo ubicado en /opt/agente_seguridad/bin/daemon.'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      path: '/proc',
      name: 'proc',
      type: 'proc',
      permissions: 'dr-xr-xr-x',
      owner: 'root:root',
      size: '0B',
      inode: 1,
      modified: 'Nov 03 08:00',
      fhsCategory: 'Virtual (RAM)',
      shareable: 'Virtual / Kernel',
      summary: 'Sistema de ficheros virtual (procfs) en RAM con información en vivo del kernel y procesos.',
      fhsDescription:
        '/proc NO existe en el disco duro (sus archivos ocupan 0 bytes en disco). Es una ventana generada al vuelo en memoria RAM por el kernel Linux que expone cada proceso en ejecución mediante un directorio con su PID numérico (/proc/1, /proc/1842) y el estado interno del hardware y memoria (/proc/cpuinfo, /proc/meminfo, /proc/sys).',
      commonMistake:
        'Nunca intentes hacer copias de seguridad de /proc ni borrar sus archivos para liberar espacio en disco: todo su contenido es generado dinámicamente en memoria por el kernel.',
      children: [
        {
          path: '/proc/1',
          name: '1',
          type: 'proc',
          permissions: 'dr-xr-xr-x',
          owner: 'root:root',
          size: '0B',
          inode: 40100,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Directorio virtual en RAM del proceso con PID 1 (proceso padre inicial del sistema).',
          fhsDescription: 'Cada proceso activo tiene un subdirectorio /proc/<PID> con su línea de comandos (cmdline), descriptores abiertos (fd/), variables de entorno (environ) y nombre (comm).',
          children: [
            {
              path: '/proc/1/comm',
              name: 'comm',
              type: 'proc',
              permissions: '-rw-r--r--',
              owner: 'root:root',
              size: '0B',
              inode: 40101,
              modified: 'Nov 03 08:00',
              fhsCategory: 'Virtual (RAM)',
              shareable: 'Virtual / Kernel',
              summary: 'Nombre del ejecutable del proceso con PID 1 (systemd).',
              fhsDescription: 'Permite verificar qué gestor de inicio (systemd, init, runit) gobierna el espacio de usuario como PID 1.',
              content: `systemd`
            }
          ]
        },
        {
          path: '/proc/cpuinfo',
          name: 'cpuinfo',
          type: 'proc',
          permissions: '-r--r--r--',
          owner: 'root:root',
          size: '0B',
          inode: 40001,
          modified: 'Nov 03 08:42',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Información detallada en tiempo real sobre el procesador, núcleos, caché y flags.',
          fhsDescription: 'Generado al instante por el kernel cuando se lee con "cat /proc/cpuinfo" o "lscpu".',
          content: `processor\t: 0\nvendor_id\t: AuthenticAMD\ncpu family\t: 25\nmodel name\t: AMD EPYC 7763 64-Core Processor\ncpu MHz\t\t: 2450.000\ncache size\t: 512 KB\ncpu cores\t: 4\nflags\t\t: fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36 clflush mmx fxsr sse sse2 ht syscall nx mmxext fxsr_opt pdpe1gb rdtscp lm constant_tsc rep_good nopl nonstop_tsc cpuid extd_apicid aperfmperf pni pclmulqdq monitor ssse3 fma cx16 pcid sse4_1 sse4_2 x2apic movbe popcnt aes xsave avx f16c rdrand hypervisor`
        },
        {
          path: '/proc/meminfo',
          name: 'meminfo',
          type: 'proc',
          permissions: '-r--r--r--',
          owner: 'root:root',
          size: '0B',
          inode: 40002,
          modified: 'Nov 03 08:42',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Estadísticas en tiempo real de uso de memoria RAM física, buffers, caché y swap.',
          fhsDescription: 'Es la fuente de datos que leen comandos como "free -h", "top" y "htop" para mostrar cuánta RAM libre y disponible tiene el servidor.',
          content: `MemTotal:       16384256 kB\nMemFree:         4128512 kB\nMemAvailable:   11842100 kB\nBuffers:          612480 kB\nCached:          7410220 kB\nSwapCached:            0 kB\nActive:          6821400 kB\nInactive:        4102340 kB\nSwapTotal:       2097148 kB\nSwapFree:        2097148 kB\nDirty:               148 kB`
        },
        {
          path: '/proc/mounts',
          name: 'mounts',
          type: 'proc',
          permissions: 'lrwxrwxrwx',
          owner: 'root:root',
          size: '0B',
          inode: 40003,
          modified: 'Nov 03 08:42',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Lista exacta mantenida por el kernel de todos los sistemas de ficheros montados actualmente.',
          fhsDescription: 'A diferencia de /etc/fstab (que muestra lo configurado para el arranque), /proc/mounts refleja lo que el kernel tiene montado en este preciso instante.',
          content: `sysfs /sys sysfs rw,nosuid,nodev,noexec,relatime 0 0\nproc /proc proc rw,nosuid,nodev,noexec,relatime 0 0\ndevtmpfs /dev devtmpfs rw,nosuid,size=8192000k,nr_inodes=2048000,mode=755 0 0\n/dev/sda1 / ext4 rw,relatime,errors=remount-ro 0 0\ntmpfs /run tmpfs rw,nosuid,nodev,noexec,relatime,size=1638400k,mode=755 0 0`
        },
        {
          path: '/proc/version',
          name: 'version',
          type: 'proc',
          permissions: '-r--r--r--',
          owner: 'root:root',
          size: '0B',
          inode: 40004,
          modified: 'Nov 03 08:42',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Versión exacta del kernel Linux en ejecución y compilador GCC empleado.',
          fhsDescription: 'Fuente de datos del comando "uname -a".',
          content: `Linux version 6.8.0-45-generic (buildd@lcy02-amd64-044) (x86_64-linux-gnu-gcc-13 (Ubuntu 13.2.0-23ubuntu4) 13.2.0, GNU ld (GNU Binutils for Ubuntu) 2.42) #45-Ubuntu SMP PREEMPT_DYNAMIC`
        },
        {
          path: '/proc/sys',
          name: 'sys',
          type: 'proc',
          permissions: 'dr-xr-xr-x',
          owner: 'root:root',
          size: '0B',
          inode: 40010,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Parámetros del kernel modificables en caliente en tiempo de ejecución (sysctl).',
          fhsDescription: 'Permite no solo leer sino también modificar el comportamiento del núcleo Linux en vivo (red, memoria virtual, seguridad) escribiendo valores en sus ficheros virtuales o mediante el comando sysctl.',
          children: [
            {
              path: '/proc/sys/net',
              name: 'net',
              type: 'proc',
              permissions: 'dr-xr-xr-x',
              owner: 'root:root',
              size: '0B',
              inode: 40011,
              modified: 'Nov 03 08:00',
              fhsCategory: 'Virtual (RAM)',
              shareable: 'Virtual / Kernel',
              summary: 'Subárbol de parámetros de la pila de red TCP/IP del kernel.',
              fhsDescription: 'Controla buffers de sockets, firewall, IPv4 e IPv6.',
              children: [
                {
                  path: '/proc/sys/net/ipv4',
                  name: 'ipv4',
                  type: 'proc',
                  permissions: 'dr-xr-xr-x',
                  owner: 'root:root',
                  size: '0B',
                  inode: 40012,
                  modified: 'Nov 03 08:00',
                  fhsCategory: 'Virtual (RAM)',
                  shareable: 'Virtual / Kernel',
                  summary: 'Ajustes en tiempo real del protocolo IPv4 (ICMP, reenvío de paquetes, SYN cookies).',
                  fhsDescription: 'Equivalente a la rama net.ipv4.* de sysctl.',
                  children: [
                    {
                      path: '/proc/sys/net/ipv4/ip_forward',
                      name: 'ip_forward',
                      type: 'proc',
                      permissions: '-rw-r--r--',
                      owner: 'root:root',
                      size: '0B',
                      inode: 40013,
                      modified: 'Nov 03 08:00',
                      fhsCategory: 'Virtual (RAM)',
                      shareable: 'Virtual / Kernel',
                      summary: 'Controla si el kernel encamina paquetes entre interfaces de red (0 = desactivado, 1 = router).',
                      fhsDescription: 'Escribir un "1" en este archivo virtual (echo 1 > /proc/sys/net/ipv4/ip_forward) convierte inmediatamente al sistema Linux en un enrutador IPv4 sin reiniciar.',
                      content: `0`
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      path: '/root',
      name: 'root',
      type: 'dir',
      permissions: 'drwx------',
      owner: 'root:root',
      size: '4.0K',
      inode: 1000,
      modified: 'Nov 02 22:10',
      fhsCategory: 'Usuarios',
      shareable: 'No compartible',
      summary: 'Directorio personal exclusivo del superusuario administrador (root, UID 0).',
      fhsDescription:
        'Separado deliberadamente de /home para garantizar que el superusuario pueda iniciar sesión y disponer de sus herramientas y claves incluso si la partición /home falla o no se ha montado en modo rescate.',
      commonMistake:
        'Sus permisos son 700 (drwx------): ningún usuario normal puede entrar ni listar su contenido.',
      children: [
        {
          path: '/root/.bashrc',
          name: '.bashrc',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '3.1K',
          inode: 1001,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Usuarios',
          shareable: 'No compartible',
          summary: 'Configuración de shell del superusuario root.',
          fhsDescription: 'Define el entorno de terminal cuando se accede como root.'
        }
      ]
    },
    {
      path: '/run',
      name: 'run',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '840B',
      inode: 1100,
      modified: 'Nov 03 08:00',
      fhsCategory: 'Virtual (RAM)',
      shareable: 'No compartible',
      summary: 'Datos volátiles de tiempo de ejecución del sistema desde el último arranque (tmpfs).',
      fhsDescription:
        'Introducido en FHS 3.0 para reemplazar a /var/run. Montado en memoria RAM (tmpfs), almacena ficheros PID de demonios activos (nginx.pid, sshd.pid), sockets Unix de comunicación entre procesos y bloqueos que desaparecen automáticamente al apagar el equipo.',
      children: [
        {
          path: '/run/sshd.pid',
          name: 'sshd.pid',
          type: 'file',
          permissions: '-rw-r--r--',
          owner: 'root:root',
          size: '5B',
          inode: 1101,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'No compartible',
          summary: 'Identificador de proceso (PID) del demonio OpenSSH actualmente en ejecución.',
          fhsDescription: 'Archivo volátil que contiene el PID del proceso maestro sshd.',
          content: `842`
        }
      ]
    },
    {
      path: '/sbin',
      name: 'sbin',
      type: 'symlink',
      symlinkTarget: '/usr/sbin',
      permissions: 'lrwxrwxrwx',
      owner: 'root:root',
      size: '9B',
      inode: 15,
      modified: 'Oct 14 09:00',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Binarios esenciales de administración del sistema (exclusivos para root).',
      fhsDescription:
        'Contiene utilidades críticas para el arranque, reparación de sistemas de archivos y configuración de red de bajo nivel: fsck, mkfs.ext4, fdisk, blkid, iptables, sysctl, reboot.',
      children: [
        {
          path: '/sbin/fsck',
          name: 'fsck',
          type: 'file',
          permissions: '-rwxr-xr-x',
          owner: 'root:root',
          size: '43K',
          inode: 1201,
          modified: 'Sep 20 12:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Comprobador y reparador de integridad de sistemas de ficheros Linux.',
          fhsDescription: 'Debe ejecutarse siempre sobre particiones desmontadas para reparar inodos huérfanos o bloques dañados.'
        },
        {
          path: '/sbin/fdisk',
          name: 'fdisk',
          type: 'file',
          permissions: '-rwxr-xr-x',
          owner: 'root:root',
          size: '118K',
          inode: 1202,
          modified: 'Sep 20 12:10',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Herramienta de manipulación de tablas de particiones MBR y GPT.',
          fhsDescription: 'Utilidad administrativa para listar (fdisk -l) y particionar discos de bloques en /dev.'
        }
      ]
    },
    {
      path: '/srv',
      name: 'srv',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 1300,
      modified: 'Oct 20 10:00',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Datos específicos servidos por este sistema al exterior (Web, FTP, Git, rsync).',
      fhsDescription:
        'El estándar FHS especifica /srv (Service Data) como la ubicación limpia para alojar los archivos de datos que los servicios de red del servidor ofrecen a los clientes (por ejemplo, /srv/www para páginas web o /srv/ftp para descargas FTP).',
      children: [
        {
          path: '/srv/www',
          name: 'www',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'www-data:www-data',
          size: '4.0K',
          inode: 1301,
          modified: 'Oct 20 10:00',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Raíz de documentos públicos servidos por el servidor HTTP.',
          fhsDescription: 'Aloja los activos estáticos y aplicaciones web publicadas por el servidor.'
        }
      ]
    },
    {
      path: '/sys',
      name: 'sys',
      type: 'proc',
      permissions: 'dr-xr-xr-x',
      owner: 'root:root',
      size: '0B',
      inode: 1400,
      modified: 'Nov 03 08:00',
      fhsCategory: 'Virtual (RAM)',
      shareable: 'Virtual / Kernel',
      summary: 'Sistema virtual sysfs que exporta la topología de dispositivos, buses y drivers del kernel.',
      fhsDescription:
        'Introducido con el kernel 2.6 y estandarizado en FHS 3.0. Mientras /proc se centra en procesos y estadísticas generales, /sys ofrece una jerarquía estructurada de todos los dispositivos físicos conectados (PCI, USB, discos de bloques, tarjetas de red) y sus controladores.',
      children: [
        {
          path: '/sys/class/net',
          name: 'class/net',
          type: 'proc',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '0B',
          inode: 1401,
          modified: 'Nov 03 08:00',
          fhsCategory: 'Virtual (RAM)',
          shareable: 'Virtual / Kernel',
          summary: 'Interfaces de red registradas en el kernel (eth0, lo, wlan0) y sus estados de enlace.',
          fhsDescription: 'Permite consultar la dirección MAC, velocidad del enlace y estadísticas de paquetes de cada tarjeta de red.'
        }
      ]
    },
    {
      path: '/tmp',
      name: 'tmp',
      type: 'dir',
      permissions: 'drwxrwxrwt',
      owner: 'root:root',
      size: '4.0K',
      inode: 1500,
      modified: 'Nov 03 08:40',
      fhsCategory: 'Variable',
      shareable: 'No compartible',
      summary: 'Ficheros temporales volátiles creados por aplicaciones y usuarios (con Sticky Bit t).',
      fhsDescription:
        'Espacio temporal donde cualquier usuario o proceso puede crear archivos de trabajo (permisos 1777, representados como drwxrwxrwt). El bit "t" final (Sticky Bit) impide que un usuario borre los archivos temporales de otro usuario. Su contenido se vacía automáticamente al reiniciar el sistema.',
      commonMistake:
        'Si un programa necesita guardar datos temporales que DEBEN sobrevivir a un reinicio del servidor, debe usar /var/tmp en lugar de /tmp.',
      children: [
        {
          path: '/tmp/sess_89a7f6c',
          name: 'sess_89a7f6c',
          type: 'file',
          permissions: '-rw-------',
          owner: 'www-data:www-data',
          size: '128B',
          inode: 1501,
          modified: 'Nov 03 08:40',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Archivo temporal de sesión web que se eliminará en el próximo reinicio.',
          fhsDescription: 'Ejemplo de fichero efímero en /tmp.'
        }
      ]
    },
    {
      path: '/usr',
      name: 'usr',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 1600,
      modified: 'Oct 14 09:00',
      fhsCategory: 'Estático',
      shareable: 'Compartible',
      summary: 'Unix System Resources: jerarquía secundaria de solo lectura con todo el software del sistema.',
      fhsDescription:
        '/usr (Unix System Resources, no "user") contiene la inmensa mayoría de utilidades multiusuario, aplicaciones, librerías y documentación instaladas por el gestor de paquetes (apt, dnf, pacman). Su contenido es estático y compartible en modo solo lectura.',
      commonMistake:
        'No confundir /usr con /home. En /usr van los programas instalados en el sistema; en /home van los archivos personales de los usuarios.',
      children: [
        {
          path: '/usr/bin',
          name: 'bin',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '36.0K',
          inode: 1601,
          modified: 'Oct 28 07:15',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Directorio principal de comandos y aplicaciones ejecutables instaladas por paquetes oficiales.',
          fhsDescription: 'Contiene miles de ejecutables gestionados por el gestor de paquetes (python3, git, curl, vim, ssh, top, find).',
          commonMistake: 'Si colocas un script propio directamente en /usr/bin, una actualización de paquetes con "apt upgrade" podría sobrescribirlo o entrar en conflicto. Usa /usr/local/bin para scripts propios.'
        },
        {
          path: '/usr/local',
          name: 'local',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 1610,
          modified: 'Nov 01 12:00',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Jerarquía terciaria para software y scripts instalados localmente por el administrador.',
          fhsDescription:
            'El FHS garantiza que el gestor de paquetes de la distribución (apt/dpkg, rpm) NUNCA tocará ni sobrescribirá nada dentro de /usr/local. Replica la estructura bin/, sbin/, etc/, lib/, share/ para que el administrador instale scripts globales o programas compilados desde código fuente.',
          children: [
            {
              path: '/usr/local/bin',
              name: 'bin',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'root:root',
              size: '4.0K',
              inode: 1611,
              modified: 'Nov 01 12:00',
              fhsCategory: 'Estático',
              shareable: 'Compartible',
              summary: 'Ubicación estándar FHS para scripts y ejecutables propios disponibles para todos los usuarios.',
              fhsDescription: 'Incluido por defecto en la variable $PATH de todos los usuarios antes que /usr/bin, garantizando que los scripts del administrador sean accesibles globalmente sin riesgo de ser borrados por actualizaciones del sistema.',
              children: [
                {
                  path: '/usr/local/bin/custom_backup.sh',
                  name: 'custom_backup.sh',
                  type: 'file',
                  permissions: '-rwxr-xr-x',
                  owner: 'root:root',
                  size: '940B',
                  inode: 1612,
                  modified: 'Nov 01 12:00',
                  fhsCategory: 'Estático',
                  shareable: 'Compartible',
                  summary: 'Script global de copias de seguridad creado por el administrador del sistema.',
                  fhsDescription: 'Al estar en /usr/local/bin con permisos 755, cualquier usuario puede invocar "custom_backup.sh" desde cualquier ruta y las actualizaciones de apt no lo alterarán.',
                  content: `#!/usr/bin/env bash\n# Script corporativo de respaldo local instalado en /usr/local/bin\n# Ubicación protegida según FHS 3.0 frente a actualizaciones del gestor de paquetes\n\nDEST="/mnt/backup_nfs/$(hostname)-$(date +%F).tar.gz"\ntar -czf "$DEST" /etc /home /srv/www\necho "Respaldo completado en $DEST"`
                }
              ]
            }
          ]
        },
        {
          path: '/usr/share',
          name: 'share',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 1620,
          modified: 'Oct 14 09:00',
          fhsCategory: 'Estático',
          shareable: 'Compartible',
          summary: 'Datos estáticos independientes de la arquitectura de CPU (páginas man, iconos, documentación).',
          fhsDescription: 'Contiene las páginas del manual (/usr/share/man), documentación (/usr/share/doc), zonas horarias (/usr/share/zoneinfo) y diccionarios.'
        }
      ]
    },
    {
      path: '/var',
      name: 'var',
      type: 'dir',
      permissions: 'drwxr-xr-x',
      owner: 'root:root',
      size: '4.0K',
      inode: 1700,
      modified: 'Nov 03 08:42',
      fhsCategory: 'Variable',
      shareable: 'No compartible',
      summary: 'Datos variables que cambian y crecen continuamente durante la operación del servidor.',
      fhsDescription:
        'Para permitir que /usr pueda montarse en modo solo lectura, todo fichero cuyo tamaño cambie durante el funcionamiento normal del sistema (registros de eventos, bases de datos SQL, contenedores Docker, colas de impresión/correo y cachés de paquetes) se almacena bajo /var. En servidores de producción suele montarse en su propia partición para evitar que un log descontrolado llene la partición raíz (/).',
      commonMistake:
        'Cuando un servidor se queda sin espacio en disco de forma repentina sin que ningún usuario haya subido archivos a /home, el primer lugar a auditar con "du -sh /var/*" es siempre /var/log, /var/lib o /var/cache.',
      children: [
        {
          path: '/var/log',
          name: 'log',
          type: 'dir',
          permissions: 'drwxrwxr-x',
          owner: 'root:syslog',
          size: '4.0K',
          inode: 1710,
          modified: 'Nov 03 08:42',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Archivos de registro (logs) del sistema operativo, auditoría de seguridad y servicios.',
          fhsDescription: 'Centraliza todos los ficheros de bitácora del kernel, demonios del sistema y aplicaciones. Gestionado por rsyslogd, systemd-journald y logrotate.',
          children: [
            {
              path: '/var/log/syslog',
              name: 'syslog',
              type: 'file',
              permissions: '-rw-r-----',
              owner: 'syslog:adm',
              size: '42.8G',
              inode: 1711,
              modified: 'Nov 03 08:42',
              fhsCategory: 'Variable',
              shareable: 'No compartible',
              summary: '¡ALERTA DE TAMAÑO (42.8 GB)! Registro general de actividad del sistema y demonios.',
              fhsDescription: 'Registra cronológicamente los mensajes globales del sistema operativo y servicios en Debian/Ubuntu (equivalente a /var/log/messages en RedHat/Rocky). En este escenario ha crecido hasta 42.8 GB por un bucle de errores, agotando el espacio del disco raíz.',
              commonMistake: 'Borrar un archivo de log abierto por un demonio con "rm /var/log/syslog" no libera espacio hasta reiniciar el demonio porque el descriptor de archivo sigue abierto. Lo correcto en administración de sistemas es truncarlo en vivo con "truncate -s 0 /var/log/syslog".',
              content: `Nov 03 08:41:58 lab-fhs kernel: [14820.112] usb 1-1: new high-speed USB device number 3 using xhci_hcd\nNov 03 08:42:01 lab-fhs rsyslogd: [origin software="rsyslogd"] file '/var/log/syslog' sizereached 42.8GB\nNov 03 08:42:01 lab-fhs sensor-loop[1922]: ERROR: Connection timeout retrying in 1ms (repeated 84,920,114 times)\nNov 03 08:42:02 lab-fhs systemd[1]: Disk space on / critically low (99% used - only 112MB free)`
            },
            {
              path: '/var/log/auth.log',
              name: 'auth.log',
              type: 'file',
              permissions: '-rw-r-----',
              owner: 'syslog:adm',
              size: '4.2M',
              inode: 1712,
              modified: 'Nov 03 08:41',
              fhsCategory: 'Variable',
              shareable: 'No compartible',
              summary: 'Registro de eventos de autenticación, inicios de sesión SSH, uso de sudo y PAM.',
              fhsDescription: 'Archivo crítico para auditoría de ciberseguridad y detección de ataques de fuerza bruta (leído por herramientas como Fail2Ban). En familias RHEL se denomina /var/log/secure.',
              content: `Nov 03 08:39:12 lab-fhs sshd[3410]: Failed password for root from 185.220.101.44 port 51922 ssh2\nNov 03 08:39:14 lab-fhs sshd[3410]: Failed password for root from 185.220.101.44 port 51922 ssh2\nNov 03 08:39:17 lab-fhs sshd[3412]: Invalid user admin from 185.220.101.44 port 51980 ssh2\nNov 03 08:40:05 lab-fhs sudo:   alumno : TTY=pts/0 ; PWD=/home/alumno ; USER=root ; COMMAND=/usr/bin/df -h`
            },
            {
              path: '/var/log/nginx',
              name: 'nginx',
              type: 'dir',
              permissions: 'drwxr-xr-x',
              owner: 'www-data:adm',
              size: '4.0K',
              inode: 1715,
              modified: 'Nov 03 08:12',
              fhsCategory: 'Variable',
              shareable: 'No compartible',
              summary: 'Registros de accesos HTTP (access.log) y errores de arranque/ejecución (error.log) de Nginx.',
              fhsDescription: 'Permite diagnosticar tanto tráfico web como fallos de sintaxis o permisos del servidor Nginx.',
              children: [
                {
                  path: '/var/log/nginx/error.log',
                  name: 'error.log',
                  type: 'file',
                  permissions: '-rw-r-----',
                  owner: 'www-data:adm',
                  size: '18.4K',
                  inode: 1716,
                  modified: 'Nov 03 08:12',
                  fhsCategory: 'Variable',
                  shareable: 'No compartible',
                  summary: 'Bitácora de errores del servidor web Nginx.',
                  fhsDescription: 'Registra el motivo exacto por el que Nginx no pudo arrancar.',
                  content: `2026/11/03 08:12:04 [emerg] 2190#2190: unknown directive "keepalive_timout" in /etc/nginx/nginx.conf:17`
                }
              ]
            }
          ]
        },
        {
          path: '/var/lib',
          name: 'lib',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 1730,
          modified: 'Oct 29 15:00',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Datos de estado persistente de aplicaciones y bases de datos (PostgreSQL, MySQL, Docker, dpkg).',
          fhsDescription: 'A diferencia de /lib (que guarda librerías de código .so), /var/lib almacena los ficheros de datos internos que las aplicaciones modifican mientras funcionan: tablas de bases de datos (/var/lib/postgresql, /var/lib/mysql), volúmenes e imágenes de contenedores (/var/lib/docker) y estado de paquetes instalados (/var/lib/dpkg).'
        },
        {
          path: '/var/cache',
          name: 'cache',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 1740,
          modified: 'Oct 28 07:10',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Datos en caché generados por aplicaciones (como paquetes .deb descargados en /var/cache/apt).',
          fhsDescription: 'El contenido de /var/cache puede borrarse de forma segura (ej. apt clean) sin pérdida de datos ni configuración, ya que las aplicaciones pueden regenerarlo.'
        },
        {
          path: '/var/spool',
          name: 'spool',
          type: 'dir',
          permissions: 'drwxr-xr-x',
          owner: 'root:root',
          size: '4.0K',
          inode: 1750,
          modified: 'Oct 25 09:00',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Colas de tareas pendientes de ser procesadas (tareas cron de usuarios, colas de correo y de impresión CUPS).',
          fhsDescription: 'Almacena datos en espera de procesamiento secuencial, como /var/spool/cron/crontabs o /var/spool/cups.'
        },
        {
          path: '/var/tmp',
          name: 'tmp',
          type: 'dir',
          permissions: 'drwxrwxrwt',
          owner: 'root:root',
          size: '4.0K',
          inode: 1760,
          modified: 'Nov 03 07:50',
          fhsCategory: 'Variable',
          shareable: 'No compartible',
          summary: 'Archivos temporales que DEBEN conservarse entre reinicios del sistema (con Sticky Bit t).',
          fhsDescription: 'Según el estándar FHS 3.0, /var/tmp aloja datos temporales que las aplicaciones necesitan preservar incluso si el servidor se reinicia (a diferencia de /tmp, que se limpia en cada arranque).',
          children: [
            {
              path: '/var/tmp/recuperacion_editor.swp',
              name: 'recuperacion_editor.swp',
              type: 'file',
              permissions: '-rw-------',
              owner: 'alumno:alumno',
              size: '64.0K',
              inode: 1761,
              modified: 'Nov 03 07:50',
              fhsCategory: 'Variable',
              shareable: 'No compartible',
              summary: 'Copia de respaldo temporal de una sesión de edición conservada tras el reinicio.',
              fhsDescription: 'Guardada por el editor en /var/tmp para que el usuario pueda recuperar su trabajo tras un corte eléctrico.',
              content: `Archivo swap de recuperación de Vim/Nano preservado en /var/tmp tras reinicio del sistema.`
            }
          ]
        }
      ]
    }
  ]
};

export interface FHSMatrixRow {
  path: string;
  category: 'Estático' | 'Variable' | 'Virtual (RAM)' | 'Dispositivos' | 'Montajes' | 'Usuarios';
  shareable: 'Compartible' | 'No compartible' | 'Virtual / Kernel';
  purpose: string;
  examples: string;
  examTip: string;
}

export const FHS_REFERENCE_MATRIX: FHSMatrixRow[] = [
  {
    path: '/bin',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Comandos esenciales de usuario requeridos en modo rescate / monousuario.',
    examples: 'bash, ls, cp, mv, cat, mount, grep',
    examTip: 'En sistemas modernos con UsrMerge es un enlace simbólico a /usr/bin.'
  },
  {
    path: '/sbin',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Binarios esenciales de administración del sistema (superusuario root).',
    examples: 'fsck, fdisk, mkfs, iptables, reboot, sysctl',
    examTip: 'Herramientas críticas para reparar o montar el sistema antes de montar /usr.'
  },
  {
    path: '/boot',
    category: 'Estático',
    shareable: 'No compartible',
    purpose: 'Archivos estáticos del cargador de arranque y núcleo del sistema.',
    examples: 'vmlinuz, initrd.img, grub/grub.cfg',
    examTip: 'No contiene configuraciones de demonios; solo interviene al encender la máquina.'
  },
  {
    path: '/dev',
    category: 'Dispositivos',
    shareable: 'No compartible',
    purpose: 'Nodos especiales de dispositivos de bloques (b) y caracteres (c).',
    examples: '/dev/sda1, /dev/sdb1, /dev/nvme0n1, /dev/null, /dev/zero',
    examTip: 'Representa el dispositivo crudo, NO es un directorio donde ver los ficheros del USB.'
  },
  {
    path: '/etc',
    category: 'Estático',
    shareable: 'No compartible',
    purpose: 'Ficheros de configuración estáticos locales al sistema y sus servicios.',
    examples: 'fstab, passwd, shadow, skel, netplan, ssh/sshd_config, nginx/nginx.conf',
    examTip: 'Nunca debe contener ejecutables binarios ni archivos de log que crezcan.'
  },
  {
    path: '/home',
    category: 'Usuarios',
    shareable: 'Compartible',
    purpose: 'Directorios personales de los usuarios regulares y sus dotfiles.',
    examples: '/home/alumno/.bashrc, /home/profesor',
    examTip: 'El usuario root NO está aquí; su carpeta personal es /root.'
  },
  {
    path: '/root',
    category: 'Usuarios',
    shareable: 'No compartible',
    purpose: 'Directorio personal exclusivo del superusuario administrador (UID 0).',
    examples: '/root/.bashrc, /root/.ssh/authorized_keys',
    examTip: 'Ubicado en la raíz (/) para ser accesible incluso si /home está en otra partición dañada.'
  },
  {
    path: '/lib',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Librerías compartidas (.so) esenciales para /bin y /sbin, y módulos del kernel.',
    examples: 'libc.so.6, /lib/modules/$(uname -r)',
    examTip: 'No confundir con /var/lib (que guarda bases de datos y estados variables).'
  },
  {
    path: '/lost+found',
    category: 'Estático',
    shareable: 'No compartible',
    purpose: 'Inodos y bloques huérfanos recuperados por fsck tras un apagón o fallo de disco.',
    examples: '/lost+found/#19402',
    examTip: 'Existe uno en la raíz de cada partición ext2/ext3/ext4 con permisos 0700 (drwx------).'
  },
  {
    path: '/mnt',
    category: 'Montajes',
    shareable: 'No compartible',
    purpose: 'Punto de montaje temporal usado manualmente por el administrador de sistemas.',
    examples: 'mount /dev/sdb1 /mnt/pendrive',
    examTip: 'FHS reserva /mnt para montajes manuales temporales por terminal.'
  },
  {
    path: '/media',
    category: 'Montajes',
    shareable: 'No compartible',
    purpose: 'Punto de montaje automático para medios extraíbles (USB, SD, DVD).',
    examples: '/media/alumno/USB_DATOS',
    examTip: 'Gestionado automáticamente por demonios como udisks2 al insertar un USB en escritorio.'
  },
  {
    path: '/opt',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Paquetes de software adicional o de terceros autocontenidos.',
    examples: '/opt/google/chrome, /opt/agente_seguridad',
    examTip: 'Cada aplicación en /opt mantiene sus propios binarios y librerías en una sola carpeta.'
  },
  {
    path: '/proc',
    category: 'Virtual (RAM)',
    shareable: 'Virtual / Kernel',
    purpose: 'Pseudo-sistema de ficheros en RAM con información de procesos y kernel en vivo.',
    examples: '/proc/1/comm, /proc/cpuinfo, /proc/meminfo, /proc/mounts, /proc/sys',
    examTip: 'Ocupa 0 bytes en disco. Se genera al vuelo en memoria RAM.'
  },
  {
    path: '/sys',
    category: 'Virtual (RAM)',
    shareable: 'Virtual / Kernel',
    purpose: 'Pseudo-sistema sysfs en RAM que expone buses, dispositivos y drivers del kernel.',
    examples: '/sys/class/net/eth0, /sys/block/sdb',
    examTip: 'Estandarizado en FHS 3.0 para separar la topología de hardware de /proc.'
  },
  {
    path: '/run',
    category: 'Virtual (RAM)',
    shareable: 'No compartible',
    purpose: 'Datos volátiles de ejecución desde el arranque (PIDs, sockets Unix).',
    examples: '/run/sshd.pid, /run/nginx.pid',
    examTip: 'Sustituye al antiguo /var/run sobre un sistema tmpfs en RAM.'
  },
  {
    path: '/srv',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Datos específicos servidos por los servicios de red de esta máquina.',
    examples: '/srv/www/html, /srv/ftp',
    examTip: 'Ubicación recomendada por FHS para los datos publicados por servidores web o FTP.'
  },
  {
    path: '/tmp',
    category: 'Variable',
    shareable: 'No compartible',
    purpose: 'Archivos temporales volátiles con Sticky Bit (1777) eliminados al reiniciar.',
    examples: '/tmp/sess_89a7f6c',
    examTip: 'Para temporales que deban persistir tras un reinicio se utiliza /var/tmp.'
  },
  {
    path: '/usr',
    category: 'Estático',
    shareable: 'Compartible',
    purpose: 'Unix System Resources: aplicaciones, comandos, librerías y manuales del sistema.',
    examples: '/usr/bin, /usr/lib, /usr/local/bin, /usr/share/man',
    examTip: '/usr/local/bin es el lugar correcto para scripts globales propios del administrador.'
  },
  {
    path: '/var',
    category: 'Variable',
    shareable: 'No compartible',
    purpose: 'Datos variables dinámicos: logs, bases de datos, cachés, temporales persistentes y colas.',
    examples: '/var/log/syslog, /var/lib/postgresql, /var/tmp, /var/cache/apt',
    examTip: 'Primer lugar a revisar cuando el disco se llena inesperadamente en un servidor.'
  }
];

export function findNodeByPath(root: FHSNode, targetPath: string): FHSNode | null {
  const normalized = targetPath === '' ? '/' : targetPath.replace(/\/+$/, '') || '/';
  if (root.path === normalized) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findNodeByPath(child, normalized);
    if (found) return found;
  }
  return null;
}

export function getParentPath(path: string): string {
  if (path === '/' || !path) return '/';
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length === 0 ? '/' : '/' + parts.join('/');
}

export function getAllPaths(node: FHSNode): FHSNode[] {
  const result: FHSNode[] = [node];
  if (node.children) {
    for (const child of node.children) {
      result.push(...getAllPaths(child));
    }
  }
  return result;
}
