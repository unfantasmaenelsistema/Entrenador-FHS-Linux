import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, ArrowRight, Download, Copy, Check } from 'lucide-react';
import { FHS_QUIZ_QUESTIONS, FHS_MISSIONS } from '../data/missionsData';

interface FhsQuizViewProps {
  completedMissionIds?: string[];
}

export const FhsQuizView: React.FC<FhsQuizViewProps> = ({ completedMissionIds = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  // Student report fields
  const [studentName, setStudentName] = useState('');
  const [studentGroup, setStudentGroup] = useState('1º ASIR / Sistemas Operativos');
  const [copiedReport, setCopiedReport] = useState(false);

  const currentQuestion = FHS_QUIZ_QUESTIONS[currentIndex];
  const totalQuestions = FHS_QUIZ_QUESTIONS.length;
  const correctCount = Object.values(answers).filter(Boolean).length;

  const handleSelectOption = (option: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    const isCorrect = option === currentQuestion.correctAnswer;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }));
  };

  const handleNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      setFinished(true);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswers({});
    setFinished(false);
  };

  const buildStudentReportText = () => {
    const dateStr = new Date().toLocaleString('es-ES');
    const solvedMissionsList = FHS_MISSIONS.filter((m) =>
      completedMissionIds.includes(m.id)
    )
      .map((m) => `  [OK] Caso #${m.number} (${m.difficulty}): ${m.title} -> ${m.exactFileTarget}`)
      .join('\n');

    return [
      '===================================================================',
      ' INFORME DE PRÁCTICA: JERARQUÍA DEL SISTEMA DE FICHEROS LINUX (FHS)',
      ' Plataforma: Un Fantasma en el Sistema (unfantasmaenelsistema.com)',
      '===================================================================',
      `Alumno/a: ${studentName.trim() || 'Sin especificar'}`,
      `Grupo / Módulo: ${studentGroup.trim() || 'Sistemas Informáticos'}`,
      `Fecha de generación: ${dateStr}`,
      '-------------------------------------------------------------------',
      `1. INCIDENCIAS PRÁCTICAS RESUELTAS EN ÁRBOL FHS: ${completedMissionIds.length} / ${FHS_MISSIONS.length}`,
      solvedMissionsList || '  (Ninguna incidencia completada aún)',
      '-------------------------------------------------------------------',
      `2. TEST DE CERTIFICACIÓN LPIC-1 (OBJETIVO 104.7): ${correctCount} / ${totalQuestions} (${Math.round(
        (correctCount / totalQuestions) * 100
      )}%)`,
      '==================================================================='
    ].join('\n');
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(buildStudentReportText());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDownloadReport = () => {
    const blob = new Blob([buildStudentReportText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-fhs-${(studentName || 'alumno').toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 7 Cols: Interactive LPIC-1 Quiz */}
      <div className="lg:col-span-7 bg-[#111722] border border-[#232D3F] rounded-lg p-6 space-y-6">
        {finished ? (
          <>
            <div className="flex items-center justify-between border-b border-[#232D3F] pb-4">
              <div className="space-y-1">
                <span className="text-xs text-emerald-400 font-medium">
                  Evaluación LPIC-1 · Tema 104.7 (FHS 3.0)
                </span>
                <h2 className="text-xl font-semibold text-white">
                  Resultado del Test de Certificación FHS
                </h2>
              </div>
              <Award className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center py-2">
              <div className="p-3 bg-[#0B0F17] border border-[#232D3F] rounded-md">
                <div className="text-2xl font-mono font-bold text-emerald-400">
                  {correctCount} / {totalQuestions}
                </div>
                <div className="text-xs text-slate-400 mt-1">Respuestas correctas</div>
              </div>
              <div className="p-3 bg-[#0B0F17] border border-[#232D3F] rounded-md">
                <div className="text-2xl font-mono font-bold text-white">
                  {Math.round((correctCount / totalQuestions) * 100)}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Precisión técnica</div>
              </div>
              <div className="p-3 bg-[#0B0F17] border border-[#232D3F] rounded-md">
                <div className="text-lg font-mono font-semibold text-sky-300">
                  {correctCount / totalQuestions >= 0.8 ? 'APTO (SysAdmin)' : 'EN PROGRESO'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Calificación LPIC-1</div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {FHS_QUIZ_QUESTIONS.map((q, idx) => {
                const ok = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-3 bg-[#0B0F17] border border-[#232D3F] rounded-md flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-slate-200">
                        {idx + 1}. {q.question}
                      </div>
                      <div className="font-mono text-emerald-300">
                        Respuesta correcta: {q.correctAnswer}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono">
                      {ok ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Correcto
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> Fallo
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repetir cuestionario</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#232D3F] pb-4">
              <div>
                <div className="text-xs text-slate-400">
                  Preparación LPIC-1 (Examen 101 · Objetivo 104.7) · CompTIA Linux+
                </div>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  Pregunta {currentIndex + 1} de {totalQuestions}
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-300">
                Aciertos: {correctCount} / {totalQuestions}
              </div>
            </div>

            <p className="text-base font-medium text-slate-100 leading-relaxed">
              {currentQuestion.question}
            </p>

            <div className="space-y-2.5">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedOption === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                let style =
                  'bg-[#0B0F17] border-[#232D3F] text-slate-200 hover:border-slate-500';
                if (selectedOption !== null) {
                  if (isCorrect) {
                    style = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200';
                  } else if (isSelected) {
                    style = 'bg-rose-500/15 border-rose-500/60 text-rose-200';
                  } else {
                    style = 'bg-[#0B0F17] border-[#232D3F] text-slate-500';
                  }
                }

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left p-3.5 rounded-md border font-mono text-xs transition-colors flex items-center justify-between gap-3 ${style}`}
                  >
                    <span>{option}</span>
                    {selectedOption !== null && isCorrect && (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-sans font-medium shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> Correcta
                      </span>
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-sans font-medium shrink-0">
                        <XCircle className="w-4 h-4" /> Incorrecta
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && (
              <div className="p-4 rounded-md bg-[#0B0F17] border border-[#232D3F] space-y-2">
                <div className="text-xs font-semibold text-slate-200">
                  Explicación según el estándar FHS 3.0:
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentQuestion.explanation}
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>
                      {currentIndex + 1 < totalQuestions
                        ? 'Siguiente pregunta'
                        : 'Ver resultados'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right 5 Cols: Exportable Lab Report for Moodle / Classroom */}
      <div className="lg:col-span-5 bg-[#111722] border border-[#232D3F] rounded-lg p-6 space-y-4">
        <div className="border-b border-[#232D3F] pb-3">
          <span className="text-xs text-emerald-400 font-medium">
            Entregable para Moodle / Classroom
          </span>
          <h3 className="text-base font-semibold text-white mt-0.5">
            Generador de Informe de Práctica del Alumno
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Exporta un resumen verificable con tus incidencias FHS resueltas y tu puntuación LPIC-1 para entregar al profesor.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Nombre y Apellidos del Alumno/a
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Ej. Laura Gómez Pérez"
              className="w-full bg-[#0B0F17] border border-[#232D3F] rounded-md px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Curso / Ciclo Formativo
            </label>
            <input
              type="text"
              value={studentGroup}
              onChange={(e) => setStudentGroup(e.target.value)}
              placeholder="Ej. 1º ASIR / 1º DAW / 2º SMR"
              className="w-full bg-[#0B0F17] border border-[#232D3F] rounded-md px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <pre className="p-3 rounded-md bg-[#080B11] border border-[#232D3F] font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-56">
          {buildStudentReportText()}
        </pre>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Informe (.txt)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 text-slate-200 border border-[#232D3F] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {copiedReport ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar texto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
