export interface FHSMission {
  id: string;
  number: string;
  title: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  category:
    | 'Almacenamiento y Logs'
    | 'Servicios y Configuración'
    | 'Dispositivos y Montaje'
    | 'Kernel y Procesos'
    | 'Seguridad y Usuarios';
  symptom: string;
  objective: string;
  targetPaths: string[];
  exactFileTarget: string;
  validBranchPrefixes: string[];
  clue: string;
  explanation: string;
  remediationCommand: string;
  remediationEffect: string;
  realWorldCommands: { cmd: string; desc: string }[];
  wrongBranchHints: Record<string, string>;
}

export const FHS_MISSIONS: FHSMission[] = [
  {
    id: 'mission-log-disk-full',
    number: '01',
    title: 'Un log descontrolado ha llenado el disco al 99%',
    difficulty: 'Básico',
    category: 'Almacenamiento y Logs',
    symptom:
      'Alerta crítica de monitorización: La partición raíz (/) está al 99% de capacidad (solo quedan 112 MB libres). Ningún usuario ha subido archivos nuevos, pero un servicio en bucle lleva horas escribiendo millones de líneas de error.',
    objective:
      'Navega desde la raíz (/) sin salirte de la rama lógica de datos variables hasta localizar el archivo de registro general del sistema que ocupa 42.8 GB.',
    targetPaths: ['/var/log/syslog', '/var/log'],
    exactFileTarget: '/var/log/syslog',
    validBranchPrefixes: ['/', '/var', '/var/log', '/var/log/syslog'],
    clue: 'Según el estándar FHS, todos los archivos que crecen dinámicamente durante la ejecución del servidor (logs, cachés, colas) cuelgan de /var.',
    explanation:
      '¡Correcto! En el estándar FHS, /var/log centraliza los registros del sistema y demonios. En distribuciones Debian/Ubuntu, /var/log/syslog almacena la actividad global del sistema. Para vaciar un archivo de log gigante sin romper el descriptor abierto por rsyslogd, se utiliza "truncate -s 0 /var/log/syslog" en lugar de borrarlo con rm.',
    remediationCommand: 'truncate -s 0 /var/log/syslog',
    remediationEffect: 'Archivo /var/log/syslog truncado en vivo de 42.8G a 0B. Espacio en / recuperado (uso actual: 14 %).',
    realWorldCommands: [
      { cmd: 'df -h', desc: 'Comprobar qué partición se ha quedado sin espacio libre' },
      { cmd: 'du -sh /var/log/* | sort -hr | head -n 5', desc: 'Identificar los archivos más pesados dentro de /var/log' },
      { cmd: 'sudo truncate -s 0 /var/log/syslog', desc: 'Vaciar el contenido del log sin cerrar el inodo abierto por rsyslog' }
    ],
    wrongBranchHints: {
      '/etc': '/etc almacena archivos estáticos de configuración que apenas ocupan kilobytes; nunca guarda registros ni logs.',
      '/usr': '/usr contiene programas y librerías estáticas de solo lectura; los logs jamás se escriben en /usr.',
      '/home': 'El problema indica que ningún usuario ha subido archivos; es un demonio del sistema llenando los registros en /var/log.',
      '/proc': '/proc es un sistema virtual en memoria RAM (ocupa 0 bytes en disco), por lo que nunca puede llenar el disco duro.',
      '/tmp': 'Aunque /tmp guarda temporales, los registros históricos de demonios del sistema siempre van en /var/log.'
    }
  },
  {
    id: 'mission-nginx-config-error',
    number: '02',
    title: 'El servicio web Nginx no arranca por un error de configuración',
    difficulty: 'Básico',
    category: 'Servicios y Configuración',
    symptom:
      'Al ejecutar "systemctl start nginx", el servicio falla inmediatamente con el estado "Failed to start A high performance web server". Un administrador editó la configuración global del servidor web hace 10 minutos y cometió una errata sintáctica.',
    objective:
      'Localiza el archivo principal de configuración global del servidor Nginx siguiendo la rama estática de configuración del sistema.',
    targetPaths: ['/etc/nginx/nginx.conf', '/etc/nginx'],
    exactFileTarget: '/etc/nginx/nginx.conf',
    validBranchPrefixes: ['/', '/etc', '/etc/nginx', '/etc/nginx/nginx.conf'],
    clue: 'Toda la configuración estática global de los servicios instalados en el servidor se encuentra dentro de /etc/<nombre-servicio>.',
    explanation:
      '¡Exacto! Según el FHS, /etc aloja todos los ficheros de configuración locales al sistema. El archivo maestro /etc/nginx/nginx.conf contenía la directiva mal escrita "keepalive_timout 65" sin punto y coma final en la línea 17. Con "nginx -t" puedes verificar la sintaxis antes de reiniciar el servicio.',
    remediationCommand: 'nginx -t && systemctl restart nginx',
    remediationEffect: 'Directiva corregida a "keepalive_timeout 65;" en /etc/nginx/nginx.conf. nginx: configuration file syntax is ok.',
    realWorldCommands: [
      { cmd: 'sudo nginx -t', desc: 'Validar la sintaxis de los archivos de configuración de Nginx e indicar línea exacta del fallo' },
      { cmd: 'sudo nano /etc/nginx/nginx.conf', desc: 'Editar el archivo principal de configuración para corregir la errata' },
      { cmd: 'sudo systemctl restart nginx', desc: 'Reiniciar el demonio una vez validada la configuración' }
    ],
    wrongBranchHints: {
      '/var': 'En /var/log/nginx puedes leer el log del error, pero el archivo de configuración que debes corregir reside en /etc/nginx.',
      '/srv': '/srv/www contiene las páginas HTML públicas de la web, no la configuración del demonio Nginx.',
      '/usr': '/usr/sbin/nginx es el binario ejecutable compilado, no su archivo de configuración.',
      '/boot': '/boot solo contiene el kernel Linux y el cargador GRUB.'
    }
  },
  {
    id: 'mission-mount-pendrive-manual',
    number: '03',
    title: 'Montar un pendrive manualmente por consola (Punto de Montaje)',
    difficulty: 'Básico',
    category: 'Dispositivos y Montaje',
    symptom:
      'Estás conectado por SSH a un servidor sin interfaz gráfica. Has conectado un pendrive USB de rescate (/dev/sdb1) y necesitas acoplarlo manualmente y de forma temporal al árbol de directorios cumpliendo estrictamente el estándar FHS.',
    objective:
      'Dirígete al directorio reservado por el estándar FHS para que el administrador realice montajes temporales manuales del pendrive.',
    targetPaths: ['/mnt/pendrive', '/mnt'],
    exactFileTarget: '/mnt/pendrive',
    validBranchPrefixes: ['/', '/mnt', '/mnt/pendrive'],
    clue: 'El estándar FHS distingue entre /media (montajes automáticos del entorno de escritorio) y /mnt (montajes manuales temporales hechos por el administrador).',
    explanation:
      '¡Perfecto! El estándar FHS 3.0 establece una distinción fundamental: /mnt es para montajes temporales realizados manualmente por el administrador del sistema en consola (ej. "sudo mount /dev/sdb1 /mnt/pendrive"), mientras que /media es utilizado por demonios automáticos de escritorio (como udisks2) y /dev/sdb1 es el nodo de bloques físico.',
    remediationCommand: 'mount /dev/sdb1 /mnt/pendrive',
    remediationEffect: 'Partición /dev/sdb1 (USB_RESCATE, 32GB vfat) montada correctamente en /mnt/pendrive.',
    realWorldCommands: [
      { cmd: 'lsblk -f', desc: 'Identificar el nombre del dispositivo de bloques (sdb1) y su sistema de archivos (vfat/ext4)' },
      { cmd: 'sudo mkdir -p /mnt/pendrive', desc: 'Asegurar que existe el directorio punto de montaje dentro de /mnt' },
      { cmd: 'sudo mount /dev/sdb1 /mnt/pendrive', desc: 'Acoplar el nodo de dispositivo /dev/sdb1 en el punto de montaje /mnt/pendrive' }
    ],
    wrongBranchHints: {
      '/dev': '¡Cuidado! /dev/sdb1 es el nodo del dispositivo de bloques (origen), pero NO puedes hacer "cd /dev/sdb1" para ver sus carpetas. Necesitas el directorio de destino donde montarlo (/mnt).',
      '/media': 'Según FHS, /media está reservado para el montaje automático de medios extraíbles por el entorno de escritorio (ej. /media/usuario/USB). Para montajes manuales temporales de administración se usa /mnt.',
      '/etc': '/etc/fstab sirve para configurar montajes permanentes en cada arranque, no es el directorio donde se monta el USB.'
    }
  },
  {
    id: 'mission-find-usb-block-device',
    number: '04',
    title: 'Localizar el nodo de dispositivo de bloques del pendrive USB',
    difficulty: 'Básico',
    category: 'Dispositivos y Montaje',
    symptom:
      'Antes de poder formatear o montar la memoria USB Kingston que acabas de enchufar al servidor, necesitas localizar el archivo especial de bloques que el kernel y udev han creado para su primera partición.',
    objective:
      'Navega hasta el directorio de dispositivos y selecciona el fichero especial de bloques correspondiente a la primera partición del segundo disco (USB).',
    targetPaths: ['/dev/sdb1', '/dev/sdb'],
    exactFileTarget: '/dev/sdb1',
    validBranchPrefixes: ['/', '/dev', '/dev/sdb1', '/dev/sdb'],
    clue: 'En Linux "todo es un fichero". Los discos SCSI/SATA/USB se nombran sd[a,b,c...] seguidos del número de partición dentro de /dev.',
    explanation:
      '¡Muy bien! En /dev residen los nodos de dispositivos gestionados por udev. El primer disco del sistema es /dev/sda (con su partición /dev/sda1), por lo que el segundo disco detectado (el pendrive USB) recibe /dev/sdb y su primera partición es /dev/sdb1, con permisos "brw-rw----" (donde la "b" inicial indica Block Device).',
    remediationCommand: 'blkid /dev/sdb1',
    remediationEffect: '/dev/sdb1: LABEL="USB_RESCATE" UUID="4A8F-9C21" TYPE="vfat" verificado correctamente.',
    realWorldCommands: [
      { cmd: 'ls -l /dev/sd*', desc: 'Listar nodos de dispositivos de disco y observar el tipo "b" (bloque) y números Major/Minor' },
      { cmd: 'sudo blkid /dev/sdb1', desc: 'Consultar el UUID, etiqueta (LABEL) y tipo de sistema de archivos de la partición' },
      { cmd: 'sudo fdisk -l /dev/sdb', desc: 'Inspeccionar la tabla de particiones del dispositivo USB' }
    ],
    wrongBranchHints: {
      '/mnt': '/mnt es el directorio vacío donde montarás el sistema de archivos, pero el reto pide encontrar el nodo especial de hardware creado por udev.',
      '/proc': 'Aunque /proc/partitions lista particiones, los ficheros especiales de bloques (brw-rw----) residen siempre en /dev.',
      '/sys': '/sys exporta la topología del bus en el kernel, pero los nodos de dispositivo para mount/fdisk están en /dev.'
    }
  },
  {
    id: 'mission-persistent-mount-fstab',
    number: '05',
    title: 'Hacer que una partición se monte automáticamente al reiniciar',
    difficulty: 'Intermedio',
    category: 'Almacenamiento y Logs',
    symptom:
      'El administrador montó ayer un disco secundario manualmente con el comando "mount", pero tras un corte eléctrico y reinicio del servidor esta mañana, el disco ya no aparece montado.',
    objective:
      'Localiza el archivo de configuración del sistema donde se declaran de forma estática las particiones y sus puntos de montaje para el arranque.',
    targetPaths: ['/etc/fstab'],
    exactFileTarget: '/etc/fstab',
    validBranchPrefixes: ['/', '/etc', '/etc/fstab'],
    clue: 'Su nombre es la abreviatura de "File Systems Table" y se encuentra en el directorio de configuración global del sistema.',
    explanation:
      '¡Correcto! Cualquier montaje realizado con el comando "mount" en terminal es efímero y se pierde al reiniciar. Para que systemd y mount lo acoplen automáticamente en cada arranque, debe añadirse su UUID, punto de montaje y tipo de sistema de archivos en /etc/fstab.',
    remediationCommand: 'mount -a && findmnt --verify',
    remediationEffect: 'Tabla /etc/fstab verificada con findmnt --verify: 0 errores. Montajes persistentes asegurados.',
    realWorldCommands: [
      { cmd: 'sudo blkid', desc: 'Obtener el UUID único de la partición (preferible a usar /dev/sdb1 que puede cambiar de letra)' },
      { cmd: 'sudo mkdir -p /srv/datos', desc: 'Crear un punto de montaje permanente fuera de /mnt (que el FHS reserva para montajes temporales)' },
      { cmd: 'sudo nano /etc/fstab', desc: 'Añadir la línea UUID=... /srv/datos ext4 defaults,nofail 0 2' },
      { cmd: 'sudo mount -a', desc: 'Probar inmediatamente el montaje de todas las entradas de /etc/fstab sin reiniciar (¡vital para evitar fallos de arranque!)' }
    ],
    wrongBranchHints: {
      '/proc': '/proc/mounts muestra qué está montado ahora mismo en RAM, pero es de solo lectura; no sirve para persistir montajes.',
      '/boot': '/boot/grub/grub.cfg solo monta la partición raíz inicial (/); el resto de discos se montan leyendo /etc/fstab.',
      '/mnt': '/mnt contiene los directorios de destino, no el archivo de configuración de arranque.'
    }
  },
  {
    id: 'mission-ssh-intrusion-audit',
    number: '06',
    title: 'Auditar intentos de intrusión por fuerza bruta en SSH',
    difficulty: 'Intermedio',
    category: 'Seguridad y Usuarios',
    symptom:
      'El firewall perimetral ha detectado miles de conexiones al puerto 22 desde una IP externa sospechosa (185.220.101.44). Necesitas verificar qué usuarios han intentado vulnerar y si algún inicio de sesión o comando sudo tuvo éxito.',
    objective:
      'Navega hasta el archivo de registro específico donde Linux guarda los eventos de autenticación, accesos SSH, PAM y uso de sudo.',
    targetPaths: ['/var/log/auth.log', '/var/log'],
    exactFileTarget: '/var/log/auth.log',
    validBranchPrefixes: ['/', '/var', '/var/log', '/var/log/auth.log'],
    clue: 'Es un archivo de registro (log) centrado específicamente en autenticación (auth).',
    explanation:
      '¡Excelente! En sistemas Debian/Ubuntu, /var/log/auth.log (y /var/log/secure en RedHat/Fedora) registra todos los eventos de seguridad: intentos fallidos y exitosos de sshd, elevaciones de privilegios con sudo y cambios de usuario con su.',
    remediationCommand: 'grep "Failed password" /var/log/auth.log',
    remediationEffect: 'Auditoría completada: detectados intentos desde 185.220.101.44 contra root y admin sin ningún acceso exitoso.',
    realWorldCommands: [
      { cmd: 'sudo grep "Failed password" /var/log/auth.log', desc: 'Filtrar todos los intentos fallidos de contraseña por SSH' },
      { cmd: 'sudo grep "Accepted" /var/log/auth.log', desc: 'Comprobar quién ha conseguido iniciar sesión con éxito' },
      { cmd: 'sudo tail -f /var/log/auth.log', desc: 'Monitorizar en tiempo real nuevos eventos de autenticación' }
    ],
    wrongBranchHints: {
      '/etc': 'En /etc/ssh/sshd_config se configura el servicio SSH, pero allí no se guardan los registros de quién ha intentado entrar.',
      '/root': '/root es la carpeta personal del administrador, no el registro de auditoría del sistema.'
    }
  },
  {
    id: 'mission-kernel-live-ram',
    number: '07',
    title: 'Inspeccionar el desglose de memoria RAM directamente del kernel',
    difficulty: 'Intermedio',
    category: 'Kernel y Procesos',
    symptom:
      'Estás depurando un contenedor minimalista que no tiene instalados los comandos "free" ni "htop". Necesitas leer directamente del pseudo-sistema de archivos del kernel cuánta memoria RAM física (MemTotal, MemAvailable, Cached) hay en este instante.',
    objective:
      'Localiza el archivo virtual en memoria RAM generado por el kernel que expone las estadísticas detalladas de memoria.',
    targetPaths: ['/proc/meminfo', '/proc'],
    exactFileTarget: '/proc/meminfo',
    validBranchPrefixes: ['/', '/proc', '/proc/meminfo'],
    clue: 'Busca en el sistema de ficheros virtual de procesos y estado del kernel cuyos archivos muestran tamaño 0B en disco.',
    explanation:
      '¡Exacto! /proc/meminfo es un archivo virtual generado al vuelo por el kernel Linux cuando un proceso lo lee. De hecho, herramientas como "free", "top", "htop" y "vmstat" obtienen sus datos leyendo exactamente este fichero dentro de /proc.',
    remediationCommand: 'cat /proc/meminfo | head -n 5',
    remediationEffect: 'Lectura directa del kernel completada: MemAvailable: 11,842,100 kB (~11.3 GB disponibles).',
    realWorldCommands: [
      { cmd: 'cat /proc/meminfo', desc: 'Leer directamente del kernel todas las métricas de RAM, buffers, caché y swap' },
      { cmd: 'cat /proc/cpuinfo', desc: 'Consultar modelo de CPU, núcleos e instrucciones soportadas directamente del kernel' },
      { cmd: 'cat /proc/loadavg', desc: 'Ver la carga media del sistema en los últimos 1, 5 y 15 minutos' }
    ],
    wrongBranchHints: {
      '/var': '/var almacena archivos variables en el disco físico; el estado instantáneo de la RAM reside en el sistema virtual /proc.',
      '/dev': '/dev contiene nodos de dispositivos, no las tablas informativas de memoria y procesos del kernel.',
      '/sys': 'Aunque /sys es virtual, se dedica a la topología de buses y drivers de hardware; meminfo y cpuinfo están en /proc.'
    }
  },
  {
    id: 'mission-secure-ssh-root',
    number: '08',
    title: 'Bloquear el acceso directo por SSH al superusuario root',
    difficulty: 'Intermedio',
    category: 'Seguridad y Usuarios',
    symptom:
      'Tras detectar ataques de diccionario contra la cuenta root por el puerto 22, el equipo de ciberseguridad exige deshabilitar inmediatamente el inicio de sesión directo de root por SSH ("PermitRootLogin no").',
    objective:
      'Navega hasta el archivo de configuración del demonio servidor OpenSSH.',
    targetPaths: ['/etc/ssh/sshd_config', '/etc/ssh'],
    exactFileTarget: '/etc/ssh/sshd_config',
    validBranchPrefixes: ['/', '/etc', '/etc/ssh', '/etc/ssh/sshd_config'],
    clue: 'Está dentro de /etc/ssh y contiene la letra "d" de daemon (servidor) en su nombre.',
    explanation:
      '¡Correcto! Es fundamental distinguir entre /etc/ssh/ssh_config (configuración del cliente SSH cuando te conectas hacia fuera) y /etc/ssh/sshd_config (configuración del demonio servidor SSH que recibe conexiones). Poner "PermitRootLogin no" en sshd_config obliga a entrar con un usuario normal y elevar privilegios con sudo. En Ubuntu revisa también /etc/ssh/sshd_config.d/: sshd aplica el primer valor que encuentra, y los ficheros de ahí se leen antes.',
    remediationCommand: "sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && sshd -t && systemctl reload ssh",
    remediationEffect: 'Directiva actualizada a "PermitRootLogin no" en /etc/ssh/sshd_config y servicio sshd recargado.',
    realWorldCommands: [
      { cmd: 'sudo nano /etc/ssh/sshd_config', desc: 'Establecer PermitRootLogin no en la configuración del demonio' },
      { cmd: 'sudo sshd -t', desc: 'Comprobar que la configuración de sshd no tiene errores antes de recargar' },
      { cmd: 'sudo systemctl reload ssh', desc: 'Aplicar los cambios sin cortar las sesiones SSH actuales' }
    ],
    wrongBranchHints: {
      '/root': 'En /root/.ssh/authorized_keys se guardan las claves públicas, pero la política que prohíbe el login directo de root se define en /etc/ssh/sshd_config.',
      '/var': '/var/log/auth.log registra los accesos, pero no permite configurar el comportamiento del servidor SSH.'
    }
  },
  {
    id: 'mission-systemd-unit-fix',
    number: '09',
    title: 'Un servicio propio (systemd) falla al arrancar con error 203/EXEC',
    difficulty: 'Avanzado',
    category: 'Servicios y Configuración',
    symptom:
      'Se ha creado un servicio personalizado llamado "webapp.service" para iniciar un demonio corporativo, pero "systemctl status webapp" devuelve "status=203/EXEC (No such file or directory)" porque la directiva ExecStart apunta a una ruta errónea.',
    objective:
      'Localiza el archivo de definición de la unidad systemd personalizada creada por el administrador.',
    targetPaths: ['/etc/systemd/system/webapp.service', '/etc/systemd/system'],
    exactFileTarget: '/etc/systemd/system/webapp.service',
    validBranchPrefixes: ['/', '/etc', '/etc/systemd', '/etc/systemd/system', '/etc/systemd/system/webapp.service'],
    clue: 'Las unidades systemd creadas o modificadas por el administrador del sistema se alojan bajo la jerarquía de configuración en /etc/systemd/system.',
    explanation:
      '¡Brillante! Mientras que los paquetes deb/rpm instalan sus unidades de fábrica en /lib/systemd/system, el estándar para unidades personalizadas del administrador es /etc/systemd/system/. En webapp.service, ExecStart apuntaba a /usr/bin/daemon_inexistente cuando el binario real estaba instalado en /opt/agente_seguridad/bin/daemon.',
    remediationCommand: 'systemctl daemon-reload && systemctl restart webapp.service',
    remediationEffect: 'ExecStart corregido a /opt/agente_seguridad/bin/daemon. webapp.service: active (running).',
    realWorldCommands: [
      { cmd: 'systemctl status webapp.service', desc: 'Ver la ruta exacta del archivo .service cargado y el código de salida' },
      { cmd: 'sudo systemctl edit --full webapp.service', desc: 'Editar la unidad en /etc/systemd/system/webapp.service' },
      { cmd: 'sudo systemctl daemon-reload && sudo systemctl restart webapp', desc: 'Recargar definiciones de systemd e iniciar el servicio' }
    ],
    wrongBranchHints: {
      '/opt': 'En /opt/agente_seguridad/bin/daemon se encuentra el binario ejecutable, pero el archivo que tiene la ruta ExecStart mal configurada es la unidad webapp.service en /etc/systemd/system.',
      '/run': '/run guarda únicamente los PIDs volátiles de servicios que ya han arrancado.'
    }
  },
  {
    id: 'mission-local-custom-script',
    number: '10',
    title: 'Instalar un script global sin que el gestor de paquetes lo sobrescriba',
    difficulty: 'Avanzado',
    category: 'Almacenamiento y Logs',
    symptom:
      'Has programado un script de copias de seguridad ("custom_backup.sh") que debe poder ser ejecutado por cualquier usuario del servidor escribiendo su nombre en terminal, pero que esté en una ruta garantizada por el FHS donde "apt upgrade" jamás lo borre ni modifique.',
    objective:
      'Navega hasta el directorio estándar FHS destinado a ejecutables y scripts locales instalados manualmente por el administrador.',
    targetPaths: ['/usr/local/bin/custom_backup.sh', '/usr/local/bin', '/usr/local'],
    exactFileTarget: '/usr/local/bin/custom_backup.sh',
    validBranchPrefixes: ['/', '/usr', '/usr/local', '/usr/local/bin', '/usr/local/bin/custom_backup.sh'],
    clue: 'Dentro de /usr existe una jerarquía terciaria ("local") reservada exclusivamente para el administrador local.',
    explanation:
      '¡Dominio total del FHS! /usr/bin y /bin son territorios exclusivos del gestor de paquetes de la distribución (dpkg/apt, rpm/dnf). Para scripts propios o software compilado localmente que deba estar en el $PATH de todos los usuarios, el estándar FHS 3.0 define /usr/local/bin.',
    remediationCommand: 'chmod 755 /usr/local/bin/custom_backup.sh && which custom_backup.sh',
    remediationEffect: 'Confirmado en $PATH global: /usr/local/bin/custom_backup.sh con permisos -rwxr-xr-x.',
    realWorldCommands: [
      { cmd: 'sudo install -m 755 custom_backup.sh /usr/local/bin/', desc: 'Copiar el script a /usr/local/bin asignando permisos de ejecución 755 en un solo paso' },
      { cmd: 'echo $PATH', desc: 'Comprobar que /usr/local/bin aparece antes que /usr/bin en la ruta de búsqueda' },
      { cmd: 'which custom_backup.sh', desc: 'Verificar desde qué ruta exacta resuelve la shell el comando' }
    ],
    wrongBranchHints: {
      '/bin': '/bin (y /usr/bin) están gestionados por los paquetes oficiales del sistema operativo; nunca debes mezclar scripts manuales ahí.',
      '/home': 'Si lo dejas en /home/alumno, el resto de usuarios del servidor no tendrán permiso ni lo tendrán en su $PATH global.',
      '/etc': '/etc es estrictamente para archivos de configuración estáticos, nunca para scripts ejecutables ni binarios.'
    }
  },
  {
    id: 'mission-kernel-ip-forward',
    number: '11',
    title: 'Activar el enrutamiento IPv4 (IP Forwarding) en caliente en el kernel',
    difficulty: 'Avanzado',
    category: 'Kernel y Procesos',
    symptom:
      'Esta máquina Linux tiene dos tarjetas de red y debe actuar inmediatamente como router/gateway para una subred de laboratorio sin reiniciar el servidor. Necesitas cambiar de 0 a 1 el parámetro del kernel que habilita el reenvío de paquetes IPv4.',
    objective:
      'Navega por el árbol de parámetros del kernel en tiempo de ejecución hasta el fichero virtual ip_forward.',
    targetPaths: ['/proc/sys/net/ipv4/ip_forward', '/proc/sys/net/ipv4'],
    exactFileTarget: '/proc/sys/net/ipv4/ip_forward',
    validBranchPrefixes: ['/', '/proc', '/proc/sys', '/proc/sys/net', '/proc/sys/net/ipv4', '/proc/sys/net/ipv4/ip_forward'],
    clue: 'Dentro de /proc existe el subdirectorio sys/, que mapea todos los parámetros sysctl del kernel (como net.ipv4.ip_forward).',
    explanation:
      '¡Impecable! La subjerarquía /proc/sys permite leer y modificar en caliente los parámetros del kernel Linux. La variable de sysctl "net.ipv4.ip_forward" se traduce directamente a la ruta /proc/sys/net/ipv4/ip_forward (sustituyendo los puntos por barras "/").',
    remediationCommand: 'sysctl -w net.ipv4.ip_forward=1',
    remediationEffect: 'net.ipv4.ip_forward = 1 aplicado en /proc/sys/net/ipv4/ip_forward. El kernel encamina paquetes IPv4.',
    realWorldCommands: [
      { cmd: 'cat /proc/sys/net/ipv4/ip_forward', desc: 'Comprobar el estado actual (0 = deshabilitado, 1 = habilitado)' },
      { cmd: 'echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward', desc: 'Activar inmediatamente el reenvío de paquetes en el kernel en vivo' },
      { cmd: 'sudo sysctl -w net.ipv4.ip_forward=1', desc: 'Forma equivalente mediante la utilidad administrativa sysctl' }
    ],
    wrongBranchHints: {
      '/etc': 'En /etc/sysctl.conf se hace persistente para futuros reinicios, pero el interruptor en vivo del kernel reside en /proc/sys/net/ipv4/ip_forward.',
      '/sys': 'A pesar del nombre parecido, los parámetros de red TCP/IP ajustables por sysctl residen en /proc/sys, no en /sys.'
    }
  },
  {
    id: 'mission-user-bashrc',
    number: '12',
    title: 'Personalizar alias permanentes solo para el usuario "alumno"',
    difficulty: 'Básico',
    category: 'Seguridad y Usuarios',
    symptom:
      'El usuario "alumno" quiere definir un alias personalizado (alias puertos="ss -tulnp") y ajustar su variable $PATH sin afectar al profesor ni al resto de cuentas del servidor.',
    objective:
      'Navega hasta el archivo de configuración de la shell Bash dentro del directorio personal del usuario alumno.',
    targetPaths: ['/home/alumno/.bashrc', '/home/alumno'],
    exactFileTarget: '/home/alumno/.bashrc',
    validBranchPrefixes: ['/', '/home', '/home/alumno', '/home/alumno/.bashrc'],
    clue: 'Las configuraciones individuales de cada usuario estándar se guardan en su carpeta dentro de /home.',
    explanation:
      '¡Muy bien! Mientras /etc/bash.bashrc aplica cambios a todos los usuarios del sistema, cada usuario tiene su propio archivo oculto ~/.bashrc (en /home/alumno/.bashrc) para personalizar alias, funciones y su prompt sin necesitar permisos de root.',
    remediationCommand: 'source /home/alumno/.bashrc',
    remediationEffect: 'Configuración /home/alumno/.bashrc recargada en la sesión del usuario alumno.',
    realWorldCommands: [
      { cmd: 'nano ~/.bashrc', desc: 'Editar el fichero de inicialización de Bash en el directorio personal del usuario' },
      { cmd: 'source ~/.bashrc', desc: 'Aplicar los cambios en la terminal actual sin necesidad de cerrar sesión' }
    ],
    wrongBranchHints: {
      '/etc': 'Modificar /etc afectaría a todos los usuarios del servidor y requeriría permisos de superusuario root.',
      '/root': '/root/.bashrc solo afecta al superusuario root, no al usuario alumno.',
      '/usr': 'En /usr no se guardan configuraciones ni archivos personales de usuarios.'
    }
  },
  {
    id: 'mission-fsck-lost-found',
    number: '13',
    title: 'Recuperar un archivo huérfano tras un apagón brusco y chequeo fsck',
    difficulty: 'Intermedio',
    category: 'Almacenamiento y Logs',
    symptom:
      'El servidor sufrió un corte eléctrico mientras se escribía un documento importante. Al arrancar, "fsck.ext4" reparó el sistema de archivos e informó de que el inodo #19402 quedó huérfano (sin referencia en su directorio original) pero fue salvado.',
    objective:
      'Localiza el directorio estándar en la raíz de la partición ext4 donde fsck deposita los inodos recuperados.',
    targetPaths: ['/lost+found/#19402', '/lost+found'],
    exactFileTarget: '/lost+found/#19402',
    validBranchPrefixes: ['/', '/lost+found', '/lost+found/#19402'],
    clue: 'Es un directorio con permisos 700 (drwx------) en la raíz de cada sistema de archivos ext4 cuyo nombre significa "objetos perdidos".',
    explanation:
      '¡Excelente! Cada partición ext2/ext3/ext4 tiene su propio directorio /lost+found. Cuando fsck encuentra bloques de datos con inodo válido pero desconectados de su carpeta original, los enlaza en /lost+found usando su número de inodo (#19402) para que el administrador pueda inspeccionarlos con el comando "file".',
    remediationCommand: 'file /lost+found/#19402',
    remediationEffect: '/lost+found/#19402: ASCII text. Es el documento perdido: ya puedes devolverlo a su sitio con mv.',
    realWorldCommands: [
      { cmd: 'sudo ls -la /lost+found', desc: 'Listar los inodos huérfanos recuperados por fsck (requiere root)' },
      { cmd: 'sudo file /lost+found/#19402', desc: 'Averiguar qué tipo de archivo es el inodo recuperado' },
      { cmd: 'sudo mv /lost+found/#19402 /home/alumno/informe.txt', desc: 'Devolverlo a su ubicación con un nombre nuevo (fsck no recuerda el original)' }
    ],
    wrongBranchHints: {
      '/tmp': '/tmp se vacía al reiniciar tras el corte eléctrico; fsck nunca guarda bloques recuperados en /tmp.',
      '/var': 'fsck coloca los inodos huérfanos en el directorio /lost+found de la raíz de la partición reparada.'
    }
  },
  {
    id: 'mission-etc-skel-template',
    number: '14',
    title: 'Definir la plantilla base para futuros usuarios creados con useradd',
    difficulty: 'Intermedio',
    category: 'Seguridad y Usuarios',
    symptom:
      'El próximo trimestre se darán de alta 40 alumnos nuevos con "useradd -m". Quieres que todos reciban automáticamente un archivo .bashrc preconfigurado con las normas y alias del laboratorio en el momento de crearse su cuenta.',
    objective:
      'Navega hasta el directorio "esqueleto" dentro de /etc que actúa como plantilla al crear nuevos directorios personales.',
    targetPaths: ['/etc/skel/.bashrc', '/etc/skel'],
    exactFileTarget: '/etc/skel/.bashrc',
    validBranchPrefixes: ['/', '/etc', '/etc/skel', '/etc/skel/.bashrc'],
    clue: 'Dentro de /etc existe un directorio llamado "skel" (de skeleton) cuyo contenido se copia íntegro a cada nuevo /home/<usuario>.',
    explanation:
      '¡Exacto! Cuando ejecutas "useradd -m nuevo_alumno", el sistema crea /home/nuevo_alumno y copia en su interior todo lo que exista en /etc/skel/. Es la forma limpia y profesional de aprovisionar dotfiles iniciales.',
    remediationCommand: 'ls -la /etc/skel',
    remediationEffect: 'Plantilla /etc/skel/.bashrc verificada para el aprovisionamiento automático con useradd -m.',
    realWorldCommands: [
      { cmd: 'ls -la /etc/skel/', desc: 'Ver los ficheros ocultos (.bashrc, .profile) que sirven de molde para nuevos usuarios' },
      { cmd: 'sudo useradd -m -s /bin/bash alumno02', desc: 'Crear un nuevo usuario copiando automáticamente /etc/skel a /home/alumno02' }
    ],
    wrongBranchHints: {
      '/home': 'Editar /home/alumno/.bashrc solo afecta al usuario actual, no a los 40 usuarios que aún no se han creado.',
      '/usr': 'La plantilla de creación de cuentas es configuración local del sistema y reside en /etc/skel.'
    }
  },
  {
    id: 'mission-persistent-var-tmp',
    number: '15',
    title: 'Recuperar un archivo temporal que debía sobrevivir al reinicio',
    difficulty: 'Intermedio',
    category: 'Almacenamiento y Logs',
    symptom:
      'Un editor de texto guardó automáticamente un archivo de respaldo temporal (.swp) antes de que el servidor se reiniciara. Como el programa necesitaba garantizar que el archivo temporal NO se borrara durante el reinicio, utilizó el directorio de temporales persistentes del FHS.',
    objective:
      'Localiza el directorio estándar FHS para archivos temporales que se conservan entre reinicios del sistema.',
    targetPaths: ['/var/tmp/recuperacion_editor.swp', '/var/tmp'],
    exactFileTarget: '/var/tmp/recuperacion_editor.swp',
    validBranchPrefixes: ['/', '/var', '/var/tmp', '/var/tmp/recuperacion_editor.swp'],
    clue: 'A diferencia de /tmp (que es volátil al reiniciar), existe otro directorio tmp dentro de la jerarquía de datos variables (/var).',
    explanation:
      '¡Muy bien! El estándar FHS 3.0 define dos directorios temporales con Sticky Bit (1777): /tmp (cuyo contenido se descarta al reiniciar) y /var/tmp (cuyo contenido debe ser preservado entre reinicios del sistema y suele limpiarse solo si los archivos tienen más de 30 días).',
    remediationCommand: 'ls -la /var/tmp/recuperacion_editor.swp',
    remediationEffect: 'Archivo /var/tmp/recuperacion_editor.swp localizado intacto tras el reinicio.',
    realWorldCommands: [
      { cmd: 'ls -ld /tmp /var/tmp', desc: 'Comprobar que ambos tienen permisos drwxrwxrwt (1777 con Sticky Bit)' },
      { cmd: 'ls -la /var/tmp', desc: 'Inspeccionar archivos temporales que han persistido tras el reinicio' }
    ],
    wrongBranchHints: {
      '/tmp': '/tmp se limpia automáticamente en cada arranque; los temporales que deben sobrevivir a un reinicio se guardan en /var/tmp.'
    }
  },
  {
    id: 'mission-logrotate-config',
    number: '16',
    title: 'Configurar la rotación automática de logs para evitar que llenen el disco',
    difficulty: 'Avanzado',
    category: 'Servicios y Configuración',
    symptom:
      'Tras solucionar el incidente en el que /var/log/syslog creció hasta 42.8 GB, necesitas ajustar la política de rotación automática de rsyslog para que rote a diario, se comprima con gzip y nunca supere los 100 MB por fichero.',
    objective:
      'Localiza el archivo de configuración de logrotate específico para el servicio rsyslog.',
    targetPaths: ['/etc/logrotate.d/rsyslog', '/etc/logrotate.d'],
    exactFileTarget: '/etc/logrotate.d/rsyslog',
    validBranchPrefixes: ['/', '/etc', '/etc/logrotate.d', '/etc/logrotate.d/rsyslog'],
    clue: 'Las políticas individuales de rotación de registros para cada paquete se almacenan en /etc/logrotate.d/.',
    explanation:
      '¡Excelente trabajo de prevención! En /etc/logrotate.d/ cada servicio instala su regla de rotación (daily, rotate 4, maxsize 100M, compress), evitando que los archivos en /var/log agoten el espacio de la partición.',
    remediationCommand: 'logrotate -d /etc/logrotate.d/rsyslog',
    remediationEffect: 'Política /etc/logrotate.d/rsyslog simulada y verificada (maxsize 100M, rotate 4, compress).',
    realWorldCommands: [
      { cmd: 'cat /etc/logrotate.d/rsyslog', desc: 'Revisar las directivas de rotación, compresión y postrotate de syslog' },
      { cmd: 'sudo logrotate -d /etc/logrotate.d/rsyslog', desc: 'Simular (modo debug) cómo actuará logrotate sin modificar aún los ficheros' },
      { cmd: 'sudo logrotate -f /etc/logrotate.d/rsyslog', desc: 'Forzar una rotación inmediata de los registros' }
    ],
    wrongBranchHints: {
      '/var': 'En /var/log están los archivos de registro en sí, pero las reglas que configuran cómo rotarlos están en /etc/logrotate.d.'
    }
  }
];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const FHS_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: '¿Qué directorio está reservado por el estándar FHS 3.0 para que el administrador realice montajes temporales manuales por consola?',
    options: ['/media', '/mnt', '/dev', '/opt'],
    correctAnswer: '/mnt',
    explanation: '/mnt es para montajes temporales manuales del administrador, mientras que /media lo usa el entorno de escritorio para montar automáticamente medios extraíbles.'
  },
  {
    id: 'q2',
    question: '¿Dónde se almacenan los hashes cifrados de las contraseñas de los usuarios locales en un sistema Linux moderno?',
    options: ['/etc/passwd', '/etc/shadow', '/var/log/auth.log', '/root/.passwd'],
    correctAnswer: '/etc/shadow',
    explanation: '/etc/passwd es legible por todos los usuarios y solo contiene una "x" en el campo de contraseña; los hashes reales están protegidos en /etc/shadow.'
  },
  {
    id: 'q3',
    question: 'Si deseas saber qué sistemas de ficheros están montados AHORA MISMO en tiempo real según el kernel, ¿qué archivo virtual debes consultar?',
    options: ['/etc/fstab', '/proc/mounts', '/boot/grub/grub.cfg', '/var/log/syslog'],
    correctAnswer: '/proc/mounts',
    explanation: '/etc/fstab define qué se debe montar al arrancar, pero /proc/mounts refleja en tiempo real qué tiene montado el kernel en este instante.'
  },
  {
    id: 'q4',
    question: '¿En qué directorio debes colocar un script propio para que todos los usuarios puedan ejecutarlo sin que una actualización de paquetes (apt/dnf) lo sobrescriba?',
    options: ['/bin', '/usr/bin', '/usr/local/bin', '/etc/init.d'],
    correctAnswer: '/usr/local/bin',
    explanation: 'La jerarquía /usr/local está garantizada por el FHS como libre de modificaciones por parte del gestor de paquetes de la distribución.'
  },
  {
    id: 'q5',
    question: '¿Cuál de los siguientes directorios NO ocupa espacio real en el disco duro porque es un pseudo-sistema de archivos en memoria RAM?',
    options: ['/var', '/opt', '/proc', '/srv'],
    correctAnswer: '/proc',
    explanation: '/proc (procfs) y /sys (sysfs) se generan dinámicamente en memoria RAM por el kernel Linux y sus archivos ocupan 0 bytes en disco.'
  },
  {
    id: 'q6',
    question: 'Un compañero intenta hacer "cd /dev/sdb1" para ver los archivos de su pendrive y recibe "Not a directory". ¿Por qué?',
    options: [
      'Porque /dev/sdb1 es un nodo de dispositivo de bloques que primero debe montarse en un directorio como /mnt/pendrive',
      'Porque los pendrives USB se crean dentro de /proc/usb',
      'Porque falta reiniciar el servidor con el pendrive conectado',
      'Porque solo el usuario www-data puede entrar en /dev'
    ],
    correctAnswer: 'Porque /dev/sdb1 es un nodo de dispositivo de bloques que primero debe montarse en un directorio como /mnt/pendrive',
    explanation: 'Los ficheros de bloques en /dev representan el hardware crudo. Para navegar por sus carpetas hay que acoplar su sistema de archivos en un punto de montaje con "mount".'
  },
  {
    id: 'q7',
    question: '¿Qué diferencia fundamental existe entre /tmp y /var/tmp según el estándar FHS?',
    options: [
      'En /tmp solo puede escribir root y en /var/tmp todos los usuarios',
      'Los archivos de /var/tmp deben conservarse entre reinicios del sistema, mientras que /tmp puede vaciarse al reiniciar',
      '/var/tmp está en memoria RAM y /tmp en disco duro siempre',
      'No existe ninguna diferencia en el estándar FHS'
    ],
    correctAnswer: 'Los archivos de /var/tmp deben conservarse entre reinicios del sistema, mientras que /tmp puede vaciarse al reiniciar',
    explanation: 'El estándar FHS especifica que los datos temporales almacenados en /var/tmp no deben ser eliminados cuando el sistema se reinicia.'
  },
  {
    id: 'q8',
    question: '¿Dónde residen las tablas y archivos de datos en vivo de un servidor de bases de datos como PostgreSQL o MySQL/MariaDB?',
    options: ['/lib', '/usr/share', '/var/lib', '/etc'],
    correctAnswer: '/var/lib',
    explanation: '/var/lib contiene la información de estado y datos variables que las aplicaciones modifican durante su ejecución, incluyendo bases de datos (/var/lib/postgresql, /var/lib/mysql) y contenedores Docker (/var/lib/docker).'
  },
  {
    id: 'q9',
    question: '¿Qué significa la letra "t" al final de los permisos de /tmp (drwxrwxrwt = 1777)?',
    options: [
      'Que es un directorio en memoria RAM (tmpfs)',
      'Sticky Bit: cualquiera puede crear archivos dentro, pero solo el propietario (o root) puede borrar los suyos',
      'Que su contenido se cifra automáticamente en disco',
      'Que solo los miembros del grupo wheel pueden ejecutar scripts dentro'
    ],
    correctAnswer: 'Sticky Bit: cualquiera puede crear archivos dentro, pero solo el propietario (o root) puede borrar los suyos',
    explanation: 'El Sticky Bit (octal 1000) es indispensable en directorios compartidos como /tmp y /var/tmp para evitar que un usuario elimine los archivos temporales de otro.'
  },
  {
    id: 'q10',
    question: 'Al crear un usuario nuevo con "useradd -m", ¿de qué directorio se copian automáticamente los archivos ocultos iniciales (.bashrc, .profile)?',
    options: ['/etc/default', '/etc/skel', '/usr/share/user', '/root'],
    correctAnswer: '/etc/skel',
    explanation: '/etc/skel (skeleton) contiene la plantilla de archivos que useradd copia dentro del nuevo directorio /home/usuario.'
  }
];
