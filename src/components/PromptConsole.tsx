import { useState, useRef } from "react";
import { Agent, RunOptions, UploadedFile } from "../types";
import { Send, Settings2, HelpCircle, FileText, Upload, Trash2, Shield, Info } from "lucide-react";

interface PromptConsoleProps {
  selectedAgent: Agent;
  onRun: (prompt: string, options: RunOptions, files: UploadedFile[]) => void;
  isLoading: boolean;
  uploadedFiles: UploadedFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
}

export default function PromptConsole({
  selectedAgent,
  onRun,
  isLoading,
  uploadedFiles,
  setUploadedFiles,
  prompt,
  setPrompt,
}: PromptConsoleProps) {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Custom running options for local lawyers defaults
  const [tone, setTone] = useState("altamente formal");
  const [audience, setAudience] = useState("profissionais advogados e juízes");
  const [length, setLength] = useState("longa");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onRun(prompt, { tone, audience, length }, uploadedFiles);
  };

  const loadSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processFiles(e.target.files);
  };

  const processFiles = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach((file) => {
      const isPdf = file.name.endsWith(".pdf") || file.type === "application/pdf";
      const isDocx = file.name.endsWith(".docx") || file.type.includes("word") || file.type.includes("officedocument");

      if (isPdf || isDocx) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const base64String = reader.result.split(",")[1];
            const newFile: UploadedFile = {
              name: file.name,
              size: file.size,
              mimeType: isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              contentBase64: base64String,
            };
            // Prevent duplicate file names
            setUploadedFiles((prev) => {
              if (prev.some((f) => f.name === file.name)) return prev;
              return [...prev, newFile];
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert("Apenas ficheiros PDF ou Word (.docx) são permitidos para análise do agente.");
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag-and-drop mechanics
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{selectedAgent.avatarEmoji}</span>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase font-mono block">
              Consola de Decisões
            </span>
            <span className="text-xs font-medium text-gray-500">
              Instruir o <span className="text-gray-950 font-bold">{selectedAgent.name}</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            showOptions
              ? "bg-neutral-900 text-white"
              : "text-gray-500 hover:text-gray-950 hover:bg-gray-100"
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Opções Litigiosas</span>
        </button>
      </div>

      {/* Options Dropdown */}
      {showOptions && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
          <div>
            <label className="block text-[10px] font-bold text-gray-550 uppercase tracking-wider mb-1">
              Rigores de Estilo (Tom)
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg p-1.5 text-gray-800 outline-none focus:border-neutral-900"
            >
              <option value="altamente formal">Profissional & Formal</option>
              <option value="estritamente forense e técnico">Forense & Académico</option>
              <option value="diplomático e pragmático">Diplomático / Negocial</option>
              <option value="curto e direto">Sumário e Conciso</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-550 uppercase tracking-wider mb-1">
              Destinatário (Público)
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg p-1.5 text-gray-800 outline-none focus:border-neutral-905"
            >
              <option value="advogados, magistrados e juízes">Magistrados / Juízes</option>
              <option value="diretores jurídicos de corporações">Direção Jurídica</option>
              <option value="clientes finais e o cidadão comum">Clientes / Leigos</option>
              <option value="académicos e investigadores">Doutrinadores / Juristas</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-550 uppercase tracking-wider mb-1">
              Extensão de Redação
            </label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg p-1.5 text-gray-800 outline-none focus:border-neutral-905"
            >
              <option value="sumária">Sumária (Rápida)</option>
              <option value="média">Equilibrada (Padrão)</option>
              <option value="longa">Desenvolvida & Detalhada</option>
            </select>
          </div>
        </div>
      )}

      {/* Upload segment - Render only for analisador agent */}
      {selectedAgent.id === "analisador" && (
        <div className="mb-4 text-left">
          <label className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            <Upload className="w-3.5 h-3.5 mr-1" />
            Carregar Peças Processuais ou Contratos (.PDF ou .DOCX)
          </label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150 ${
              dragging
                ? "border-neutral-900 bg-neutral-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx"
              multiple
              className="hidden"
            />
            <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1.5" />
            <p className="text-xs font-semibold text-gray-700 leading-none">
              Arraste e solte ou toque para carregar
            </p>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">
              Suporta múltiplos PDF ou Word simultâneos
            </p>
          </div>

          {/* List of uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3 space-y-2 bg-gray-50 border border-gray-150 rounded-xl p-3 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase font-mono block mb-1">
                Ficheiros em fila ({uploadedFiles.length})
              </span>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 p-2 rounded-lg text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className={`w-4 h-4 shrink-0 ${file.name.endsWith(".pdf") ? "text-red-500" : "text-blue-500"}`} />
                    <div className="truncate text-left">
                      <p className="font-semibold text-gray-800 truncate leading-snug">{file.name}</p>
                      <p className="text-[9px] text-gray-400 leading-none">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors cursor-pointer"
                    title="Remover ficheiro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested prompts pills section */}
      <div className="mb-4 text-left">
        <label className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 mr-1 text-gray-400" />
          Roteiro de Diligências e Sugestões
        </label>
        <div className="flex flex-col gap-1.5">
          {selectedAgent.suggestedPrompts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => loadSuggestion(s)}
              className="text-[11px] font-medium bg-neutral-50 border border-gray-200 hover:bg-neutral-100 hover:border-gray-300 text-gray-700 rounded-lg px-3.5 py-2 text-left transition-colors cursor-pointer max-w-full leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Instructing form block */}
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={selectedAgent.placeholder}
          className="w-full text-xs sm:text-sm placeholder:text-gray-400 bg-gray-50/50 border border-gray-200 rounded-xl p-4 pr-12 focus:bg-white focus:border-neutral-900 outline-none transition-all block resize-none leading-relaxed"
        />

        <div className="absolute bottom-3 right-3 flex items-center space-x-2">
          {selectedAgent.id === "analisador" && uploadedFiles.length > 0 && (
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded mr-1">
              +{uploadedFiles.length} doc(s)
            </span>
          )}
          <span className="text-[10px] text-gray-400 font-medium select-none">
            {prompt.length} carateres
          </span>
          <button
            type="submit"
            disabled={(!prompt.trim() && uploadedFiles.length === 0) || isLoading}
            className={`p-2 rounded-lg cursor-pointer transition-all ${
              (prompt.trim() || uploadedFiles.length > 0) && !isLoading
                ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </form>

      {/* Informative warning on system design limits */}
      {selectedAgent.id === "pesquisador" && (
        <div className="mt-3 flex items-start text-[10px] text-gray-400 bg-neutral-50 rounded-xl p-2 text-left space-x-1.5 font-medium border border-gray-150">
          <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
          <span>
            A pesquisa do CSM utiliza <strong>Grounding de Pesquisa Google</strong>. O agente consultará julgados reais online para assegurar integridade factual das referências judiciais.
          </span>
        </div>
      )}
    </div>
  );
}
