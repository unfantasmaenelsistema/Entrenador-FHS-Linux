import React from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  HardDrive,
  Cpu,
  CornerDownRight,
  ChevronRight,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { FHSNode } from '../data/fhsData';

interface FhsTreePanelProps {
  tree: FHSNode;
  currentDirPath: string;
  selectedNodePath: string;
  expandedPaths: Set<string>;
  deviatedPaths: Set<string>;
  onSelectNode: (node: FHSNode) => void;
  onToggleExpand: (path: string) => void;
}

export const FhsTreePanel: React.FC<FhsTreePanelProps> = ({
  tree,
  currentDirPath,
  selectedNodePath,
  expandedPaths,
  deviatedPaths,
  onSelectNode,
  onToggleExpand
}) => {
  const renderNodeIcon = (node: FHSNode, isExpanded: boolean, isCurrent: boolean) => {
    if (node.type === 'proc') {
      return <Cpu className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-sky-300' : 'text-sky-400/80'}`} />;
    }
    if (node.type === 'block' || node.type === 'char') {
      return <HardDrive className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-amber-300' : 'text-amber-400/80'}`} />;
    }
    if (node.type === 'dir' || node.type === 'symlink') {
      return isExpanded ? (
        <FolderOpen className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-emerald-300' : 'text-emerald-400/85'}`} />
      ) : (
        <Folder className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-emerald-300' : 'text-slate-400'}`} />
      );
    }
    return <FileText className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-emerald-300' : 'text-slate-400'}`} />;
  };

  const renderTree = (node: FHSNode, depth = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedNodePath === node.path;
    const isInActiveBranch =
      currentDirPath === node.path ||
      (node.path !== '/' && currentDirPath.startsWith(node.path + '/'));
    const isDeviated = deviatedPaths.has(node.path);
    const hasChildren = Boolean(node.children && node.children.length > 0);

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => onSelectNode(node)}
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={hasChildren ? isExpanded : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectNode(node);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2.5 text-xs font-mono cursor-pointer transition-colors border-b border-transparent ${
            isSelected
              ? 'bg-emerald-500/15 text-emerald-200 font-semibold'
              : isInActiveBranch
              ? 'bg-slate-800/70 text-slate-100'
              : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(node.path);
                }}
                aria-label={isExpanded ? `Contraer ${node.name}` : `Expandir ${node.name}`}
                className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4 inline-block shrink-0" />
            )}

            {renderNodeIcon(node, isExpanded, isSelected)}

            <span className="truncate">
              {node.path === '/' ? '/ (raíz)' : node.name}
            </span>

            {node.symlinkTarget && (
              <span className="text-[11px] text-slate-500 flex items-center gap-0.5 shrink-0">
                <CornerDownRight className="w-3 h-3 inline" />
                {node.symlinkTarget}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {isDeviated && (
              <span
                title="Rama fuera de la ruta lógica del problema actual"
                className="text-amber-400 flex items-center"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
            {node.path === '/var/log/syslog' && node.size === '42.8G' && (
              <span className="text-[10px] text-rose-400 font-mono">42.8G</span>
            )}
            {depth === 1 && (
              <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                {node.fhsCategory === 'Virtual (RAM)'
                  ? 'RAM'
                  : node.fhsCategory === 'Dispositivos'
                  ? 'dev'
                  : node.fhsCategory === 'Variable'
                  ? 'var'
                  : node.fhsCategory === 'Montajes'
                  ? 'mnt'
                  : ''}
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-800/80 ml-4">
            {node.children!.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="flex flex-col h-full bg-[#111722] border border-[#232D3F] rounded-lg overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[#232D3F] flex items-center justify-between bg-[#0E131D]">
        <div>
          <h2 className="text-xs font-semibold text-slate-200 tracking-tight">
            Árbol Jerárquico FHS 3.0
          </h2>
          <p className="text-[11px] text-slate-400">
            Haz clic para navegar sin salirte de la rama lógica
          </p>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">
          ext4 / procfs
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5" role="tree" aria-label="Jerarquía FHS Linux">
        {renderTree(tree, 0)}
      </div>

      <div className="px-3.5 py-2 border-t border-[#232D3F] bg-[#0E131D] text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <span>Dir: {currentDirPath}</span>
        <span>Sel: {selectedNodePath}</span>
      </div>
    </aside>
  );
};
