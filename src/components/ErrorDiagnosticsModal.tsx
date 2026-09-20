import { useState } from "react";
import { ErrorLogEntry, AIProvider } from "../types";
import {
  X,
  Copy,
  Check,
  Trash2,
  Bug,
  Cpu,
  Sparkles,
  Info,
  Clock,
  Terminal,
  Activity
} from "lucide-react";

interface ErrorDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorLogs: ErrorLogEntry[];
  onClearLogs: () => void;
  currentProvider: AIProvider;
  currentGlmModel: string;
  currentDeepSeekModel?: string;
  hasGeminiKey: boolean;
  hasGlmKey: boolean;
  hasDeepSeekKey?: boolean;
  hasServerKey: boolean;
  activeProjectName?: string;
}

export default function ErrorDiagnosticsModal({
  isOpen,
  onClose,
  errorLogs,
  onClearLogs,
  currentProvider,
  currentGlmModel,
  currentDeepSeekModel = "deepseek-chat",
  hasGeminiKey,
  hasGlmKey,
  hasDeepSeekKey,
  hasServerKey,
  activeProjectName
}: ErrorDiagnosticsModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateDiagnosticReport = (specificLog?: ErrorLogEntry) => {
    const now = new Date().toISOString();
    const systemInfo = [
      `=== RELATÓRIO DE DIAGNÓSTICO JURIS-CSM ===`,
      `Data/Hora: ${now}`,
      `URL Aplicação: ${window.location.href}`,
      `Motor Ativo: ${currentProvider.toUpperCase()}`,
      `Modelo GLM Selecionado: ${currentGlmModel}`,
      `Modelo DeepSeek Selecionado: ${currentDeepSeekModel}`,
      `Modelo Gemini Padrão: gemini-3.8-flash`,
      `Chave Gemini do Utilizador: ${hasGeminiKey ? "Configurada" : "Não configurada"}`,
      `Chave GLM do Utilizador: ${hasGlmKey ? "Configurada" : "Não configurada"}`,
      `Chave DeepSeek do Utilizador: ${hasDeepSeekKey ? "Configurada" : "Não configurada"}`,
      `Chave do Servidor/Ambiente: ${hasServerKey ? "Disponível" : "Não disponível"}`,
      `Caso Ativo: ${activeProjectName || "Nenhum"}`,
      `Navegador: ${navigator.userAgent}`,
      `===========================================\n`
    ].join("\n");

    if (specificLog) {
      return `${systemInfo}REGISTO DO ERRO SELECIONADO:
- ID: ${specificLog.id}
- Timestamp: ${specificLog.timestamp}
- Agente / Fase: ${specificLog.phase || specificLog.agentId || "Geral"}
- Motor / Modelo: ${specificLog.provider || currentProvider} (${specificLog.model || "N/A"})
- Mensagem de Erro:
${specificLog.errorMessage}
${specificLog.technicalDetails ? `\nDetalhes Técnicos / Stack:\n${specificLog.technicalDetails}` : ""}
===========================================`;
    }

    if (errorLogs.length === 0) {
      return `${systemInfo}Nenhum erro registado até ao momento na sessão atual.`;
    }

    const errorsBody = errorLogs.map((log, idx) => {
      return `[ERRO #${idx + 1}]
- Timestamp: ${log.timestamp}
- Fase/Agente: ${log.phase || log.agentId || "Geral"}
- Motor: ${log.provider || currentProvider} | Modelo: ${log.model || "N/A"}
- Mensagem: ${log.errorMessage}
${log.technicalDetails ? `- Detalhes: ${log.technicalDetails}\n` : ""}`;
    }).join("\n-------------------------------------------\n");

    return `${systemInfo}HISTÓRICO DE ERROS REGISTADOS (${errorLogs.length}):\n\n${errorsBody}\n===========================================`;
  };

  const handleCopyAll = async () => {
    const report = generateDiagnosticReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 3000);
    } catch (err) {
      console.error("Falha ao copiar diagnóstico:", err);
    }
  };

  const handleCopySingle = async (log: ErrorLogEntry) => {
    const report = generateDiagnosticReport(log);
    try {
      await navigator.clipboard.writeText(report);
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error("Falha ao copiar log:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Registo de Erros & Diagnóstico</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {errorLogs.length} {errorLogs.length === 1 ? "erro" : "erros"}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Copie o relatório com 1 clique para partilhar com o assistente AI para rápida resolução.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Diagnostic Status Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-4 flex-wrap gap-y-1">
            <div className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Motor:</span>
              <span className="font-bold text-white flex items-center gap-1">
                {currentProvider === "deepseek" ? (
                  <>
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    DeepSeek ({currentDeepSeekModel})
                  </>
                ) : currentProvider === "glm" ? (
                  <>
                    <Cpu className="w-3 h-3 text-indigo-400" />
                    GLM ({currentGlmModel})
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Gemini
                  </>
                )}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-slate-400">Chaves: </span>
              <span className="font-bold text-slate-200">
                Gemini: {hasGeminiKey || hasServerKey ? "✓" : "✗"} / GLM: {hasGlmKey ? "✓" : "✗"} / DeepSeek: {hasDeepSeekKey ? "✓" : "✗"}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyAll}
            className={`px-3 py-1.5 rounded-lg font-sans font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
              copiedAll
                ? "bg-emerald-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            }`}
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Relatório Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Diagnóstico Completo (1-Clique)</span>
              </>
            )}
          </button>
        </div>

        {/* Error Logs List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Sem erros registados</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Todas as operações recentes dos agentes juristas foram concluídas sem falhas detetadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {errorLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-red-50/50 border border-red-200 rounded-2xl p-4 text-left transition-all hover:border-red-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-mono">
                        {log.phase || log.agentId || "Erro Geral"}
                      </span>
                      {log.provider && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono">
                          {log.provider.toUpperCase()} {log.model ? `(${log.model})` : ""}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString("pt-PT")}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopySingle(log)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-sans flex items-center space-x-1 transition-all cursor-pointer shrink-0 ${
                        copiedId === log.id
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
                      }`}
                      title="Copiar este erro específico"
                    >
                      {copiedId === log.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-2.5 text-xs font-mono text-red-900 bg-white/80 p-3 rounded-xl border border-red-150 whitespace-pre-wrap leading-relaxed break-words">
                    {log.errorMessage}
                  </div>

                  {log.technicalDetails && (
                    <div className="mt-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {log.technicalDetails}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            {errorLogs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico de Erros</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Fechar
            </button>
            {errorLogs.length > 0 && (
              <button
                onClick={handleCopyAll}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? "Copiado!" : "Copiar Diagnóstico Completo"}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
