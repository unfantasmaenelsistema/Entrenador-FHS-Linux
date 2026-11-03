import React, { useState } from 'react';
import { HardDrive, Cpu, FolderGit2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface MountSimulatorViewProps {
  onJumpToPath: (path: string) => void;
}

export const MountSimulatorView: React.FC<MountSimulatorViewProps> = ({ onJumpToPath }) => {
  const [usbMounted, setUsbMounted] = useState(false);
  const [varSeparated, setVarSeparated] = useState(false);
  const [syslogCleaned, setSyslogCleaned] = useState(false);

  const rootUsagePercent = syslogCleaned ? 14 : varSeparated ? 14 : 99;
  const varUsagePercent = syslogCleaned ? 4 : 88;

  return (
    <div className="space-y-6">
      {/* Top Explanation & Interactive Controls */}
      <div className="bg-[#111722] border border-[#232D3F] rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#232D3F] pb-4">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-medium text-emerald-400">
              Laboratorio Interactivo de Almacenamiento · Bloques (/dev) ↔ Puntos de Montaje FHS
            </div>
            <h2 className="text-lg font-semibold text-white">
              Arquitectura de Montajes, Particiones y Aislamiento de /var en Producción
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              En Linux no existen letras de unidad (`C:`, `D:`). Todo disco físico (`/dev/sda1`, `/dev/sdb1`, `/dev/nvme0n1p1`) o sistema virtual en RAM (`procfs`, `tmpfs`) se acopla como una rama dentro del árbol único que nace en `/`. Experimenta con los interruptores inferiores para ver cómo cambian `lsblk`, `df -h` y la protección frente a llenado de disco.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setUsbMounted((v) => !v)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                usbMounted
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
                  : 'bg-[#0B0F17] border-[#232D3F] text-slate-200 hover:border-slate-500'
              }`}
            >
              {usbMounted
                ? 'Desmontar USB (umount /mnt/pendrive)'
                : 'Montar USB (mount /dev/sdb1 /mnt/pendrive)'}
            </button>

            <button
              type="button"
              onClick={() => setVarSeparated((v) => !v)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                varSeparated
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-200'
                  : 'bg-[#0B0F17] border-[#232D3F] text-slate-200 hover:border-slate-500'
              }`}
            >
              {varSeparated
                ? 'Quitar partición /var separada'
                : 'Aislar /var en disco NVMe (/dev/nvme0n1p1)'}
            </button>

            <button
              type="button"
              onClick={() => setSyslogCleaned((v) => !v)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                syslogCleaned
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                  : 'bg-[#0B0F17] border-[#232D3F] text-slate-200 hover:border-slate-500'
              }`}
            >
              {syslogCleaned
                ? 'Simular log gigante (42.8 GB en syslog)'
                : 'Truncar /var/log/syslog (0 B)'}
            </button>
          </div>
        </div>

        {/* Status Banner showing why separating /var matters */}
        <div
          className={`p-3.5 rounded-md border text-xs flex items-start gap-3 ${
            rootUsagePercent >= 95
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-100'
              : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-100'
          }`}
        >
          {rootUsagePercent >= 95 ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold">
              {rootUsagePercent >= 95
                ? 'PELIGRO EN PRODUCCIÓN: /var comparte partición con / y el archivo /var/log/syslog (42.8 GB) ha saturado la raíz al 99%'
                : varSeparated && !syslogCleaned
                ? 'PROTECCIÓN ACTIVA: Aunque /var/log/syslog ocupa 42.8 GB, como /var está montado en su propia partición (/dev/nvme0n1p1), la partición raíz (/) permanece sana al 14%.'
                : 'ESTADO NOMINAL: La partición raíz (/) está al 14% de uso y todos los puntos de montaje operan con normalidad.'}
            </div>
            <p className="text-slate-300">
              Por esta razón el estándar FHS separa todos los archivos variables en <code className="text-emerald-300">/var</code>: permite montar <code className="text-emerald-300">/var</code> en un volumen independiente para que un ataque o bucle de logs nunca deje inoperativo el sistema raíz (<code className="text-emerald-300">/</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Live Output: lsblk + df -h */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Block Devices Tree (`lsblk -f`) */}
        <div className="bg-[#111722] border border-[#232D3F] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">
                Dispositivos de Bloques en /dev (salida de lsblk -f)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onJumpToPath('/dev')}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Ver /dev</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* sda */}
            <div className="p-3 rounded bg-[#0B0F17] border border-[#232D3F] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-semibold text-amber-300">
                  /dev/sda (Disco Principal SATA · 50 GB)
                </span>
                <span className="text-slate-400">brw-rw---- (8, 0)</span>
              </div>
              <div className="pl-4 border-l-2 border-emerald-500/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300">└─ /dev/sda1 (ext4)</span>
                  <span className="text-white font-semibold">Montado en: /</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      rootUsagePercent > 85 ? 'bg-rose-500' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${rootUsagePercent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>UUID: 8f4b2c10-9a11...</span>
                  <span>Uso: {rootUsagePercent}% de 50 GB</span>
                </div>
              </div>
            </div>

            {/* sdb (USB) */}
            <div className="p-3 rounded bg-[#0B0F17] border border-[#232D3F] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-semibold text-amber-300">
                  /dev/sdb (Kingston USB 3.0 · 32 GB)
                </span>
                <span className="text-slate-400">brw-rw---- (8, 16)</span>
              </div>
              <div className="pl-4 border-l-2 border-amber-500/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-200">└─ /dev/sdb1 (vfat · USB_RESCATE)</span>
                  <span
                    className={
                      usbMounted ? 'text-emerald-300 font-semibold' : 'text-slate-500'
                    }
                  >
                    {usbMounted ? 'Montado en: /mnt/pendrive' : '[No montado]'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>UUID: 4A8F-9C21</span>
                  <button
                    type="button"
                    onClick={() => onJumpToPath('/mnt/pendrive')}
                    className="text-emerald-400 hover:underline"
                  >
                    Ir a /mnt/pendrive →
                  </button>
                </div>
              </div>
            </div>

            {/* nvme0n1 */}
            <div className="p-3 rounded bg-[#0B0F17] border border-[#232D3F] space-y-2">
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-semibold text-sky-300">
                  /dev/nvme0n1 (Disco NVMe Dedicado · 50 GB)
                </span>
                <span className="text-slate-400">brw-rw---- (259, 0)</span>
              </div>
              <div className="pl-4 border-l-2 border-sky-500/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sky-200">└─ /dev/nvme0n1p1 (ext4)</span>
                  <span
                    className={
                      varSeparated ? 'text-emerald-300 font-semibold' : 'text-slate-500'
                    }
                  >
                    {varSeparated ? 'Montado en: /var' : '[Disponible para aislar /var]'}
                  </span>
                </div>
                {varSeparated && (
                  <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        varUsagePercent > 80 ? 'bg-amber-400' : 'bg-sky-400'
                      }`}
                      style={{ width: `${varUsagePercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pseudo-filesystems in RAM & df -h table */}
        <div className="bg-[#111722] border border-[#232D3F] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232D3F] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">
                Sistemas Montados (df -h y Pseudo-Sistemas en RAM)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onJumpToPath('/proc/mounts')}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Ver /proc/mounts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[#232D3F] text-slate-400 text-[11px]">
                  <th className="py-2 px-2">S.ficheros</th>
                  <th className="py-2 px-2">Tipo</th>
                  <th className="py-2 px-2 text-right">Tamaño</th>
                  <th className="py-2 px-2 text-right">Uso%</th>
                  <th className="py-2 px-2">Montado en</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2636]">
                <tr>
                  <td className="py-2 px-2 text-amber-300">/dev/sda1</td>
                  <td className="py-2 px-2 text-slate-400">ext4</td>
                  <td className="py-2 px-2 text-right">50G</td>
                  <td
                    className={`py-2 px-2 text-right font-bold ${
                      rootUsagePercent > 90 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {rootUsagePercent}%
                  </td>
                  <td className="py-2 px-2 font-semibold text-white">/</td>
                </tr>
                {varSeparated && (
                  <tr>
                    <td className="py-2 px-2 text-sky-300">/dev/nvme0n1p1</td>
                    <td className="py-2 px-2 text-slate-400">ext4</td>
                    <td className="py-2 px-2 text-right">50G</td>
                    <td className="py-2 px-2 text-right text-amber-300 font-bold">
                      {varUsagePercent}%
                    </td>
                    <td className="py-2 px-2 font-semibold text-emerald-300">/var</td>
                  </tr>
                )}
                {usbMounted && (
                  <tr>
                    <td className="py-2 px-2 text-amber-300">/dev/sdb1</td>
                    <td className="py-2 px-2 text-slate-400">vfat</td>
                    <td className="py-2 px-2 text-right">32G</td>
                    <td className="py-2 px-2 text-right text-emerald-400">12%</td>
                    <td className="py-2 px-2 font-semibold text-emerald-300">
                      /mnt/pendrive
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 px-2 text-sky-400">devtmpfs</td>
                  <td className="py-2 px-2 text-slate-400">RAM (udev)</td>
                  <td className="py-2 px-2 text-right">7.8G</td>
                  <td className="py-2 px-2 text-right text-slate-400">0%</td>
                  <td className="py-2 px-2 text-slate-200">/dev</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-sky-400">proc</td>
                  <td className="py-2 px-2 text-slate-400">procfs (RAM)</td>
                  <td className="py-2 px-2 text-right">0B</td>
                  <td className="py-2 px-2 text-right text-slate-400">-</td>
                  <td className="py-2 px-2 text-slate-200">/proc</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-sky-400">sysfs</td>
                  <td className="py-2 px-2 text-slate-400">sysfs (RAM)</td>
                  <td className="py-2 px-2 text-right">0B</td>
                  <td className="py-2 px-2 text-right text-slate-400">-</td>
                  <td className="py-2 px-2 text-slate-200">/sys</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 text-sky-400">tmpfs</td>
                  <td className="py-2 px-2 text-slate-400">tmpfs (RAM)</td>
                  <td className="py-2 px-2 text-right">1.6G</td>
                  <td className="py-2 px-2 text-right text-slate-400">1%</td>
                  <td className="py-2 px-2 text-slate-200">/run</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded bg-[#0B0F17] border border-[#232D3F] text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Concepto Clave de Examen: ¿Por qué /proc y /sys muestran 0B?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Porque no existen en ningún disco físico. Sus archivos se generan dinámicamente en memoria RAM en el preciso milisegundo en que un programa ejecuta una llamada al sistema <code className="text-sky-300">read()</code> sobre ellos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
