import { useState, useRef } from "react";
import { Project } from "../types";
import { 
  Folder, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Clock,
  Check,
  X
} from "lucide-react";
import { exportWorkspaceAsJSON, importWorkspaceFromJSON } from "../utils/localPersistence";

interface HistoryPanelProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onImportWorkspace: (importedList: Project[]) => void;
  onStartNewProjectClick: () => void;
}

export default function HistoryPanel({
  projects,
  activeProjectId,
  onSelectProject,
  onDeleteProject,
  onImportWorkspace,
  onStartNewProjectClick
}: HistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Filter projects based on search query
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const mergedProjects = importWorkspaceFromJSON(text);
        onImportWorkspace(mergedProjects);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 4000);
      } catch (err: any) {
        setImportError(err.message || "Ficheiro inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getOverallProgress = (p: Project) => {
    let completed = 0;
    if (p.status.phase1 === "completed") completed++;
    if (p.status.phase2 === "completed") completed++;
    if (p.status.phase3 === "completed") completed++;
    return completed;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Data indisponível";
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full text-left">
      
      {/* Workspace Actions Control */}
      <div className="border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono block">
              Projetos Ativos (Offline)
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {projects.length} projeto(s) no navegador
            </span>
          </div>
          
          <button
            onClick={onStartNewProjectClick}
            className="flex items-center space-x-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer shadow-2xs transition-all active:scale-95"
            title="Iniciar novo projeto com processamento sequencial"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo</span>
          </button>
        </div>

        {/* Global JSON Export / Import Toolbar */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => exportWorkspaceAsJSON(projects, "juris_orquestrador_trabalho")}
            disabled={projects.length === 0}
            className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              projects.length === 0
                ? "bg-slate-50 border-slate-200 text-slate-350 cursor-not-allowed"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            }`}
            title="Guardar todos os projetos num ficheiro JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descarregar JSON</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold border bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
            title="Carregar um ficheiro JSON previamente descarregado"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carregar JSON</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />
        </div>

        {importError && (
          <div className="mt-2 text-[10px] sm:text-xs bg-red-50 border border-red-150 p-2 rounded-lg text-red-700 font-semibold flex items-start space-x-1.5 leading-relaxed">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {importSuccess && (
          <div className="mt-2 text-[10px] sm:text-xs bg-emerald-50 border border-emerald-150 p-2 rounded-lg text-emerald-800 font-semibold flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Workspace importado com sucesso!</span>
          </div>
        )}
      </div>

      {/* Projects Search Bar */}
      <div className="relative mb-3.5">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar projeto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg pl-8.5 pr-3 py-2 outline-none focus:border-slate-420 focus:bg-white transition-all font-sans"
        />
      </div>

      {/* Project Index List Container */}
      <div className="flex-1 overflow-y-auto max-h-[500px] pr-1.5 scrollbar-thin space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Folder className="w-10 h-10 mx-auto text-slate-200 mb-2.5" />
            <p className="text-xs font-bold text-slate-500">Nenhum projeto registado</p>
            <p className="text-[10px] mt-1.5 max-w-[185px] mx-auto leading-relaxed font-semibold">
              Toque em "Novo" para começar a analisar, pesquisar acórdãos e gerar pareceres automáticos!
            </p>
          </div>
        ) : (
          filteredProjects.map((p) => {
            const isActive = activeProjectId === p.id;
            const progress = getOverallProgress(p);
            const isProcessingAny = 
              p.status.phase1 === "running" || 
              p.status.phase2 === "running" || 
              p.status.phase3 === "running";

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`group border rounded-xl p-3 text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-150 hover:bg-slate-50 hover:border-slate-250 text-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <h5 className="text-xs font-bold leading-snug truncate" title={p.name}>
                      {p.name}
                    </h5>
                    
                    {/* Progress indicators as badges */}
                    <div className="flex items-center space-x-1.5 mt-1.5 flex-wrap gap-y-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? "bg-white/10 text-white/92" : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.files.length} doc(s)
                      </span>

                      {p.provider && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          isActive 
                            ? (p.provider === "glm" ? "bg-indigo-500/80 text-white" : "bg-amber-500/80 text-white")
                            : (p.provider === "glm" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-amber-50 text-amber-800 border border-amber-200")
                        }`}>
                          {p.provider === "glm" ? "GLM" : "Gemini"}
                        </span>
                      )}
                      
                      {isProcessingAny ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white flex items-center animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                          <span>A processar...</span>
                        </span>
                      ) : progress === 3 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white flex items-center">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                          <span>Completo</span>
                        </span>
                      ) : (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isActive ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-500"
                        }`}>
                          Fase {progress}/3
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Delete Trigger Icon with inline iframe-safe confirmation */}
                  {deletingId === p.id ? (
                    <div className="flex items-center space-x-1 self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onDeleteProject(p.id);
                          setDeletingId(null);
                        }}
                        className="p-1 rounded-md bg-rose-600 hover:bg-rose-750 text-white cursor-pointer transition-colors"
                        title="Sim, apagar projeto definitivamente"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className={`p-1 rounded-md cursor-pointer transition-colors ${
                          isActive 
                            ? "bg-slate-700 hover:bg-slate-600 text-slate-200" 
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                        }`}
                        title="Cancelar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(p.id);
                      }}
                      className={`p-1.5 rounded-md self-center cursor-pointer transition-colors shrink-0 ${
                        isActive 
                          ? "text-slate-400 hover:text-red-400 hover:bg-white/10" 
                          : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                      }`}
                      title="Remover este projeto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] opacity-75 border-t border-slate-100/10 pt-2 shrink-0">
                  <span className="flex items-center font-medium font-mono">
                    <Clock className="w-3 h-3 mr-0.5 text-slate-400" />
                    {formatDate(p.createdAt)}
                  </span>
                  {p.files.length > 0 && (
                    <span className="truncate max-w-[130px] italic">
                      {p.files[0].name}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
