import React, { useState } from 'react';
import { Search, ArrowUpRight, BookOpen, Layers } from 'lucide-react';
import { FHS_REFERENCE_MATRIX, FHSMatrixRow } from '../data/fhsData';

interface FhsReferenceViewProps {
  onJumpToPath: (path: string) => void;
}

export const FhsReferenceView: React.FC<FhsReferenceViewProps> = ({ onJumpToPath }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  const categories = ['Todos', 'Estático', 'Variable', 'Virtual (RAM)', 'Dispositivos', 'Montajes', 'Usuarios'];

  const filteredRows = FHS_REFERENCE_MATRIX.filter((row: FHSMatrixRow) => {
    const matchesCategory = categoryFilter === 'Todos' || row.category === categoryFilter;
    const matchesSearch =
      row.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.examples.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.examTip.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Pedagogical FHS Matrix Header (2x2 taxonomy according to FHS 3.0) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-[#111722] border border-[#232D3F] rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
              <BookOpen className="w-4 h-4" />
              <span>Especificación Linux Foundation FHS 3.0</span>
            </div>
            <h2 className="text-lg font-semibold text-white">
              La Matriz Lógica del Sistema de Ficheros
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              El estándar FHS organiza el árbol de directorios cruzando dos ejes fundamentales de arquitectura de sistemas: si los datos son <strong className="text-slate-100">Estáticos vs. Variables</strong> y si son <strong className="text-slate-100">Compartibles vs. No compartibles</strong> entre máquinas o particiones.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[#232D3F] text-xs text-slate-400">
            Haz clic en cualquier ruta de la tabla inferior para inspeccionarla directamente en el árbol interactivo.
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#111722] border border-[#232D3F] rounded-lg p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-3">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Clasificación Ortogonal FHS 3.0 (Estático/Variable × Compartible/Local)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-md bg-[#0B0F17] border border-[#232D3F]">
              <div className="font-semibold text-emerald-300 mb-1">
                Estático + Compartible (Solo lectura posible)
              </div>
              <p className="text-slate-400 mb-2">
                Binarios, librerías y manuales que no cambian sin acción del administrador y pueden compartirse entre hosts.
              </p>
              <div className="font-mono text-slate-200">
                /usr · /bin · /sbin · /lib · /opt
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-[#0B0F17] border border-[#232D3F]">
              <div className="font-semibold text-sky-300 mb-1">
                Estático + No Compartible (Específico del host)
              </div>
              <p className="text-slate-400 mb-2">
                Configuración y arranque propios de esta máquina concreta; requieren acción del administrador para cambiar.
              </p>
              <div className="font-mono text-slate-200">
                /etc · /boot · /root
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-[#0B0F17] border border-[#232D3F]">
              <div className="font-semibold text-amber-300 mb-1">
                Variable + Compartible (Datos de usuario/red)
              </div>
              <p className="text-slate-400 mb-2">
                Datos que se modifican constantemente y pueden exportarse por red (NFS/SMB) a otras estaciones.
              </p>
              <div className="font-mono text-slate-200">
                /home · /srv · /var/mail
              </div>
            </div>

            <div className="p-3.5 rounded-md bg-[#0B0F17] border border-[#232D3F]">
              <div className="font-semibold text-rose-300 mb-1">
                Variable + No Compartible (Estado local dinámico)
              </div>
              <p className="text-slate-400 mb-2">
                Registros (logs), bloqueos, colas y temporales exclusivos del sistema operativo en ejecución.
              </p>
              <div className="font-mono text-slate-200">
                /var/log · /var/lib · /var/run (/run) · /tmp
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#111722] border border-[#232D3F] rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-[#0B0F17] text-slate-300 hover:text-white border border-[#232D3F]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por ruta, comando o uso (ej. fstab, logs, usb)..."
            aria-label="Buscar en la referencia FHS"
            className="w-full bg-[#0B0F17] border border-[#232D3F] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Reference Table */}
      <div className="bg-[#111722] border border-[#232D3F] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#232D3F] bg-[#0E131D] text-[11px] font-medium text-slate-400">
                <th className="py-3 px-4">Directorio</th>
                <th className="py-3 px-4">Naturaleza · Ámbito</th>
                <th className="py-3 px-4">Propósito según FHS 3.0</th>
                <th className="py-3 px-4">Ejemplos Clave</th>
                <th className="py-3 px-4">Clave Didáctica / Examen</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2636] text-xs">
              {filteredRows.map((row) => (
                <tr
                  key={row.path}
                  className="hover:bg-slate-800/35 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-300 whitespace-nowrap">
                    {row.path}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                    <span>{row.category}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="text-slate-400">{row.shareable}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 max-w-xs leading-relaxed">
                    {row.purpose}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-sky-300 max-w-xs">
                    {row.examples}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-sm leading-relaxed">
                    {row.examTip}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onJumpToPath(row.path)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>Abrir en árbol</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
