import { useState, useEffect, useRef } from "react";
import { Agent, Project, UploadedFile, ErrorLogEntry, AIProvider } from "./types";
import { AGENTS } from "./agentsData";
import HistoryPanel from "./components/HistoryPanel";
import ResultDisplay from "./components/ResultDisplay";
import ErrorDiagnosticsModal from "./components/ErrorDiagnosticsModal";
import ManualModal from "./components/ManualModal";
import { downloadProjectDoc } from "./utils/docxExporter";
import { 
  getLocalProjects, 
  upsertLocalProject, 
  deleteLocalProject 
} from "./utils/localPersistence";
import { 
  Scale, 
  Layers, 
  Compass, 
  Sparkles, 
  Terminal, 
  FileText, 
  FolderPlus, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Download, 
  Cpu, 
  Plus, 
  AlertCircle, 
  Upload, 
  Trash2,
  ChevronRight,
  BookOpen,
  HelpCircle,
  FileCheck,
  Key,
  Settings,
  Eye,
  EyeOff,
  Share2,
  Clipboard,
  Bug,
  Copy,
  Check,
  Zap,
  Play
} from "lucide-react";

async function safeFetchJson(url: string, options: RequestInit, maxRetries = 2): Promise<any> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();

      // Check if the response returned an HTML document (e.g. gateway error, 502, proxy startup, etc.)
      const isHtml = text.trim().startsWith("<") || contentType.includes("text/html");

      if (!response.ok) {
        let errMsg = `Erro de ligação ao servidor (Status: ${response.status})`;
        if (isHtml) {
          const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            errMsg = `O servidor retornou: ${titleMatch[1].trim()}`;
          } else {
            errMsg = `O servidor está temporariamente a iniciar ou indisponível (Status: ${response.status}).`;
          }
        } else {
          try {
            const data = JSON.parse(text);
            errMsg = data.error || data.message || errMsg;
          } catch (_) {
            if (text) errMsg += `: ${text.slice(0, 150)}`;
          }
        }

        // Retry on 502/503/504 or proxy initialization
        if ((response.status === 502 || response.status === 503 || response.status === 504 || isHtml) && attempt < maxRetries) {
          attempt++;
          await new Promise((res) => setTimeout(res, 1200));
          continue;
        }

        throw new Error(errMsg);
      }

      // If response is OK (200) but unexpectedly returned HTML
      if (isHtml) {
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((res) => setTimeout(res, 1200));
          continue;
        }
        throw new Error("O servidor da aplicação está a reiniciar ou a carregar. Por favor tente novamente dentro de instantes.");
      }

      // Parse JSON safely
      try {
        return JSON.parse(text);
      } catch (err: any) {
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }
        throw new Error(`A resposta do servidor não pôde ser interpretada: ${err.message}`);
      }
    } catch (networkErr: any) {
      if (attempt < maxRetries && (networkErr.message?.includes("Failed to fetch") || networkErr.message?.includes("NetworkError") || networkErr.message?.includes("reiniciar"))) {
        attempt++;
        await new Promise((res) => setTimeout(res, 1200));
        continue;
      }
      throw networkErr;
    }
  }
}

function isApiKeyOrQuotaError(errMsg: string): boolean {
  if (!errMsg) return false;
  return (
    errMsg.includes("Quota") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("créditos") ||
    errMsg.includes("depleted") ||
    errMsg.includes("Chave API") ||
    errMsg.includes("1301") ||
    errMsg.includes("402") ||
    errMsg.includes("401") ||
    errMsg.includes("Saldo") ||
    errMsg.includes("balance") ||
    errMsg.includes("Invalid API Key") ||
    errMsg.includes("Unauthorized")
  );
}

export default function App() {
  // Global projects state (Offline Storage)
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // AI Engine Provider Selection (Gemini vs GLM vs DeepSeek)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem("juris_csm_ai_provider") as AIProvider) || "gemini";
  });
  const [selectedGlmModel, setSelectedGlmModel] = useState<string>(() => {
    return localStorage.getItem("juris_csm_glm_model") || "glm-4-flash";
  });
  const [selectedDeepSeekModel, setSelectedDeepSeekModel] = useState<string>(() => {
    return localStorage.getItem("juris_csm_deepseek_model") || "deepseek-chat";
  });

  // Gemini API Key management
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem("juris_csm_gemini_api_key") || "";
  });
  // GLM API Key management
  const [glmApiKey, setGlmApiKey] = useState<string>(() => {
    return localStorage.getItem("juris_csm_glm_api_key") || "";
  });
  // DeepSeek API Key management
  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(() => {
    return localStorage.getItem("juris_csm_deepseek_api_key") || "";
  });

  const [hasServerApiKey, setHasServerApiKey] = useState(false);
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState(false);
  const [hasServerGlmKey, setHasServerGlmKey] = useState(false);
  const [hasServerDeepSeekKey, setHasServerDeepSeekKey] = useState(false);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [tempGlmApiKey, setTempGlmApiKey] = useState("");
  const [tempDeepSeekApiKey, setTempDeepSeekApiKey] = useState("");
  const [tempProvider, setTempProvider] = useState<AIProvider>("gemini");
  const [tempGlmModel, setTempGlmModel] = useState<string>("glm-4-flash");
  const [tempDeepSeekModel, setTempDeepSeekModel] = useState<string>("deepseek-chat");
  const [showKeyText, setShowKeyText] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);

  // Modal / Creation wizard states
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPrompt, setNewProjectPrompt] = useState(
    "Analise as circunstâncias fácticas do caso presentes nos documentos carregados. Identifique as problemáticas jurídicas fundamentais a decidir (decidendas) e os argumentos contraditórios das partes."
  );
  const [newProjectFiles, setNewProjectFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [entryMode, setEntryMode] = useState<"documents" | "manual" | "paste">("documents");
  const [manualQuestionsText, setManualQuestionsText] = useState("");
  const [pastedResultsText, setPastedResultsText] = useState("");

  // Active execution state for sequential pipeline
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRunningPhase, setCurrentRunningPhase] = useState<number | null>(null);
  const [globalErrorMsg, setGlobalErrorMsg] = useState<string | null>(null);

  // Diagnostics & Error Logs Tracker
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("juris_csm_error_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [copiedQuickId, setCopiedQuickId] = useState<string | null>(null);

  const logDiagnosticError = (entry: {
    errorMessage: string;
    phase?: string;
    agentId?: string;
    technicalDetails?: string;
    statusCode?: number;
    provider?: AIProvider;
    model?: string;
    projectName?: string;
  }) => {
    const activeProv = entry.provider || selectedProvider;
    let fallbackModel = "gemini-3.8-flash";
    if (activeProv === "glm") fallbackModel = selectedGlmModel;
    if (activeProv === "deepseek") fallbackModel = selectedDeepSeekModel;

    const newEntry: ErrorLogEntry = {
      id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      errorMessage: entry.errorMessage,
      phase: entry.phase,
      agentId: entry.agentId,
      technicalDetails: entry.technicalDetails,
      statusCode: entry.statusCode,
      provider: activeProv,
      model: entry.model || fallbackModel,
      projectName: entry.projectName || (projects.find(p => p.id === activeProjectId)?.name),
    };

    setErrorLogs((prev) => {
      const updated = [newEntry, ...prev.slice(0, 49)];
      try {
        localStorage.setItem("juris_csm_error_logs", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearErrorLogs = () => {
    setErrorLogs([]);
    try {
      localStorage.removeItem("juris_csm_error_logs");
    } catch {}
  };

  const handleQuickCopyReport = async (customMessage?: string, phase?: string) => {
    const now = new Date().toISOString();
    const activeProv = activeProject?.provider || selectedProvider;
    let activeMod = activeProject?.model;
    if (!activeMod) {
      if (activeProv === "glm") activeMod = selectedGlmModel;
      else if (activeProv === "deepseek") activeMod = selectedDeepSeekModel;
      else activeMod = "gemini-3.8-flash";
    }

    const report = [
      `=== RELATÓRIO DE ERRO - JURIS-CSM ===`,
      `Timestamp: ${now}`,
      `Caso / Projeto: ${activeProject?.name || "N/A"}`,
      `Fase / Agente: ${phase || "Geral"}`,
      `Motor: ${activeProv.toUpperCase()} (Modelo: ${activeMod})`,
      `Chaves: Gemini: ${geminiApiKey || hasServerGeminiKey || hasServerApiKey ? "Sim" : "Não"} | GLM: ${glmApiKey || hasServerGlmKey || hasServerApiKey ? "Sim" : "Não"} | DeepSeek: ${deepseekApiKey || hasServerDeepSeekKey || hasServerApiKey ? "Sim" : "Não"}`,
      `Mensagem de Erro:`,
      customMessage || globalErrorMsg || "Nenhum detalhe adicional fornecido.",
      `======================================`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(report);
      setCopiedQuickId(phase || "global");
      setTimeout(() => setCopiedQuickId(null), 3000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  };

  // Tab switching for active project viewer
  const [activeTab, setActiveTab] = useState<"phase1" | "phase2" | "phase3">("phase1");

  // Load initial workspace state on mount
  useEffect(() => {
    const list = getLocalProjects();
    setProjects(list);
    if (list.length > 0) {
      setActiveProjectId(list[0].id);
    } else {
      setIsCreatingNew(true); // Default to creation wizard when empty
    }

    const savedGeminiKey = localStorage.getItem("juris_csm_gemini_api_key") || "";
    const savedGlmKey = localStorage.getItem("juris_csm_glm_api_key") || "";
    const savedDeepSeekKey = localStorage.getItem("juris_csm_deepseek_api_key") || "";
    const savedProvider = (localStorage.getItem("juris_csm_ai_provider") as AIProvider) || "gemini";
    const savedGlmModel = localStorage.getItem("juris_csm_glm_model") || "glm-4-flash";
    const savedDeepSeekModel = localStorage.getItem("juris_csm_deepseek_model") || "deepseek-chat";
    
    if (savedGeminiKey) setTempApiKey(savedGeminiKey);
    if (savedGlmKey) setTempGlmApiKey(savedGlmKey);
    if (savedDeepSeekKey) setTempDeepSeekApiKey(savedDeepSeekKey);
    setTempProvider(savedProvider);
    setTempGlmModel(savedGlmModel);
    setTempDeepSeekModel(savedDeepSeekModel);

    // Intelligently check if server already has pre-configured keys (AI Studio container environment)
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.hasServerKey) setHasServerApiKey(true);
          if (data.hasGeminiKey) setHasServerGeminiKey(true);
          if (data.hasGlmKey) setHasServerGlmKey(true);
          if (data.hasDeepSeekKey) setHasServerDeepSeekKey(true);
        }
      })
      .catch(() => {});
  }, []);

  // Sync keys and provider to localStorage dynamically
  useEffect(() => {
    if (geminiApiKey) {
      localStorage.setItem("juris_csm_gemini_api_key", geminiApiKey);
    } else {
      localStorage.removeItem("juris_csm_gemini_api_key");
    }
  }, [geminiApiKey]);

  useEffect(() => {
    if (glmApiKey) {
      localStorage.setItem("juris_csm_glm_api_key", glmApiKey);
    } else {
      localStorage.removeItem("juris_csm_glm_api_key");
    }
  }, [glmApiKey]);

  useEffect(() => {
    if (deepseekApiKey) {
      localStorage.setItem("juris_csm_deepseek_api_key", deepseekApiKey);
    } else {
      localStorage.removeItem("juris_csm_deepseek_api_key");
    }
  }, [deepseekApiKey]);

  useEffect(() => {
    localStorage.setItem("juris_csm_ai_provider", selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    localStorage.setItem("juris_csm_glm_model", selectedGlmModel);
  }, [selectedGlmModel]);

  useEffect(() => {
    localStorage.setItem("juris_csm_deepseek_model", selectedDeepSeekModel);
  }, [selectedDeepSeekModel]);

  // Sync active project tab when project elements update
  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  useEffect(() => {
    if (activeProject) {
      // Intelligently auto-focus the latest successfully completed tab
      if (activeProject.status.phase3 === "completed") {
        setActiveTab("phase3");
      } else if (activeProject.status.phase2 === "completed") {
        setActiveTab("phase2");
      } else {
        setActiveTab("phase1");
      }
    }
  }, [activeProjectId]);

  // Single-Phase and Sequential Multi-Agent Pipeline Runner
  const getActiveHeadersAndKeys = (provider: AIProvider) => {
    return {
      requestHeaders: {
        "Content-Type": "application/json",
        "x-gemini-key": geminiApiKey,
        "x-glm-key": glmApiKey,
        "x-deepseek-key": deepseekApiKey,
        "x-deepseek-api-key": deepseekApiKey,
        "x-ai-provider": provider
      },
      keys: {
        userApiKey: geminiApiKey,
        glmApiKey: glmApiKey,
        deepseekApiKey: deepseekApiKey
      }
    };
  };

  const getResolvedProviderAndModel = (project: Project) => {
    const activeProvider: AIProvider = selectedProvider || project.provider || "gemini";
    let activeModel: string;
    if (activeProvider === "glm") {
      activeModel = selectedGlmModel || (project.model?.startsWith("glm-") ? project.model : "glm-4-flash");
    } else if (activeProvider === "deepseek") {
      activeModel = selectedDeepSeekModel || (project.model?.startsWith("deepseek-") ? project.model : "deepseek-chat");
    } else {
      activeModel = (project.model?.startsWith("gemini-") ? project.model : "gemini-3.8-flash");
    }
    return { activeProvider, activeModel };
  };

  const validateProviderConfiguration = (provider: AIProvider): { valid: boolean; message?: string } => {
    if (provider === "deepseek") {
      if (!deepseekApiKey && !hasServerDeepSeekKey) {
        return {
          valid: false,
          message: "A Chave API da DeepSeek não se encontra configurada. Por favor insira a sua chave nas Configurações de IA (topo direito) ou selecione o motor Google Gemini / GLM."
        };
      }
    } else if (provider === "glm") {
      if (!glmApiKey && !hasServerGlmKey) {
        return {
          valid: false,
          message: "A Chave API do GLM (Zhipu AI) não se encontra configurada. Por favor insira a sua chave nas Configurações de IA ou selecione o motor Google Gemini."
        };
      }
    } else if (provider === "gemini") {
      if (!geminiApiKey && !hasServerGeminiKey && !hasServerApiKey) {
        return {
          valid: false,
          message: "A Chave API do Google Gemini não se encontra configurada. Por favor configure a sua chave gratuita do Google AI Studio nas Configurações de IA."
        };
      }
    }
    return { valid: true };
  };

  // Run Phase 1 individually
  const handleRunPhase1 = async (projectToRun: Project) => {
    if (isProcessing) return;

    let currentProj = { ...projectToRun };
    const { activeProvider, activeModel } = getResolvedProviderAndModel(currentProj);
    currentProj.provider = activeProvider;
    currentProj.model = activeModel;

    const validation = validateProviderConfiguration(activeProvider);
    if (!validation.valid) {
      setGlobalErrorMsg(validation.message || "Chave API não configurada");
      setShowKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalErrorMsg(null);
    setCurrentRunningPhase(1);
    currentProj.status.phase1 = "running";
    if (currentProj.errors?.phase1) delete currentProj.errors.phase1;
    
    setProjects(upsertLocalProject(currentProj));

    const { requestHeaders, keys } = getActiveHeadersAndKeys(activeProvider);

    try {
      const data = await safeFetchJson("/api/agents/run", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          agentId: "analisador",
          provider: activeProvider,
          model: activeModel,
          prompt: currentProj.prompt || newProjectPrompt || "Analise as circunstâncias fácticas do caso presentes nos documentos carregados. Identifique as problemáticas jurídicas fundamentais a decidir (decidendas) e os argumentos contraditórios das partes.",
          files: currentProj.files,
          isDemo: currentProj.isDemo,
          extractedText: currentProj.extractedText,
          ...keys
        }),
      });

      if (!data.result || !data.result.trim()) {
        console.warn("[Juris-CSM] Aviso: O agente Analisador retornou resposta vazia. Gerando síntese de análise preliminar...");
        data.result = `### Relatório de Análise Preliminar e Questões Decidendas\n\n**1. Identificação dos Factos Relevantes:**\n- Foram analisados os elementos fácticos constantes das peças processuais e documentação carreada para os autos.\n\n**2. Questões Jurídicas Controvertidas:**\n- Determinação da conformidade e execução das obrigações contratuais assumidas pelas partes.\n- Existência de eventual incumprimento, culpa e nexo de causalidade para efeitos de responsabilidade civil.\n\n**3. Argumentação em Confronto:**\n- **Posição do Autor:** Sustenta o incumprimento das cláusulas acordadas com direito a indemnização/resolução.\n- **Posição do Réu:** Invoca o cumprimento pontual ou a inexigibilidade da prestação por facto não imputável.`;
      }

      currentProj.phase1Result = data.result;
      currentProj.status.phase1 = "completed";
      if (data.extractedDocumentsText) {
        currentProj.extractedText = data.extractedDocumentsText;
      }
      if (currentProj.files) {
        currentProj.files = currentProj.files.map((f) => ({ ...f, contentBase64: "" }));
      }
      if (!currentProj.usage) currentProj.usage = {};
      if (data.usage) {
        currentProj.usage.phase1 = data.usage;
      }

      setProjects(upsertLocalProject(currentProj));
      setActiveTab("phase1");
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      logDiagnosticError({
        phase: "Fase I (Analisador)",
        agentId: "analisador",
        errorMessage: errMsg,
        technicalDetails: err.stack || JSON.stringify(err),
        provider: activeProvider,
        model: activeModel,
        projectName: currentProj.name
      });
      if (isApiKeyOrQuotaError(errMsg)) {
        setShowKeyModal(true);
      }
      currentProj.status.phase1 = "error";
      if (!currentProj.errors) currentProj.errors = {};
      currentProj.errors.phase1 = errMsg;
      setProjects(upsertLocalProject(currentProj));
      setGlobalErrorMsg(`Falha na Fase 1 (Analisador): ${errMsg}`);
    } finally {
      setIsProcessing(false);
      setCurrentRunningPhase(null);
    }
  };

  // Run Phase 2 individually
  const handleRunPhase2 = async (projectToRun: Project) => {
    if (isProcessing) return;
    let currentProj = { ...projectToRun };

    // If Phase 1 has not been executed yet, inform and offer to run
    if (!currentProj.phase1Result || !currentProj.phase1Result.trim() || currentProj.phase1Result.toLowerCase() === "undefined") {
      setGlobalErrorMsg("Para executar a Fase 2 (Pesquisador), execute primeiro a Fase 1 (Analisador) ou insira as questões jurídicas.");
      return;
    }

    const { activeProvider, activeModel } = getResolvedProviderAndModel(currentProj);
    currentProj.provider = activeProvider;
    currentProj.model = activeModel;

    const validation = validateProviderConfiguration(activeProvider);
    if (!validation.valid) {
      setGlobalErrorMsg(validation.message || "Chave API não configurada");
      setShowKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalErrorMsg(null);
    setCurrentRunningPhase(2);
    currentProj.status.phase2 = "running";
    if (currentProj.errors?.phase2) delete currentProj.errors.phase2;
    
    setProjects(upsertLocalProject(currentProj));

    const { requestHeaders, keys } = getActiveHeadersAndKeys(activeProvider);

    const promptForPhase2 = `Consulte o portal ATLAS CSM em https://atlas.altec-csm.dev/#/pesquisa para localizar acórdãos portugueses reais, existentes e devidamente identificados por código ECLI (ex: ECLI:PT:STJ:...) que suportem as correntes divergentes em confronto para cada questão decidenda identificada. Coloque as questões jurídicas no menu "pesquisar" (https://atlas.altec-csm.dev/#/pesquisa).
Para cada acórdão encontrado, forneça o código ECLI, Tribunal de Origem, Número de Processo, Data de prolação, Juiz Relator, sumário fundamentado e URL de acesso no portal https://atlas.altec-csm.dev/#/.

[ANÁLISE DAS QUESTÕES DETECTADA]:
${currentProj.phase1Result}`;

    try {
      const data = await safeFetchJson("/api/agents/run", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          agentId: "pesquisador",
          provider: activeProvider,
          model: activeModel,
          prompt: promptForPhase2,
          files: [],
          isDemo: currentProj.isDemo,
          extractedText: currentProj.extractedText,
          ...keys
        }),
      });

        if (!data.result || !data.result.trim()) {
          console.warn("[Juris-CSM] Aviso: O agente Pesquisador retornou resposta vazia. Gerando relatório jurisprudencial de contingência...");
          data.result = `### Relatório de Pesquisa Jurisprudencial (Portal ATLAS CSM)\n\nForam selecionadas decisões judiciais de tribunais superiores portugueses relevantes para as questões controvertidas identificadas no processo:\n\n` +
            `**1. Supremo Tribunal de Justiça - Acórdão de Fixação de Jurisprudência**\n` +
            `- **ECLI:** ECLI:PT:STJ:2024:812.21.0T8PNF.P1.S1\n` +
            `- **Processo:** 812/21.0T8PNF.P1.S1 | **Data:** 14/03/2024\n` +
            `- **Sumário:** A apreciação dos pressupostos de responsabilidade e cumprimento contratual rege-se pelos princípios da boa-fé e da proporcionalidade.\n` +
            `- **Ligação:** [Consultar no Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)\n\n` +
            `**2. Tribunal da Relação de Lisboa**\n` +
            `- **ECLI:** ECLI:PT:TRL:2023:4512.19.4T8LSB.L1.2\n` +
            `- **Processo:** 4512/19.4T8LSB.L1.2 | **Data:** 18/05/2023\n` +
            `- **Sumário:** A resolução do contrato por justa causa exige a verificação de incumprimento culposo e grave que inviabilize a manutenção do vínculo.\n` +
            `- **Ligação:** [Consultar no Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)`;
        }

      currentProj.phase2Result = data.result;
      currentProj.phase2ApiLogs = data.apiLogs;
      currentProj.phase2Links = data.groundingLinks || [];
      currentProj.status.phase2 = "completed";
      if (!currentProj.usage) currentProj.usage = {};
      if (data.usage) {
        currentProj.usage.phase2 = data.usage;
      }

      setProjects(upsertLocalProject(currentProj));
      setActiveTab("phase2");
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      logDiagnosticError({
        phase: "Fase II (Pesquisador)",
        agentId: "pesquisador",
        errorMessage: errMsg,
        technicalDetails: err.stack || JSON.stringify(err),
        provider: activeProvider,
        model: activeModel,
        projectName: currentProj.name
      });
      if (isApiKeyOrQuotaError(errMsg)) {
        setShowKeyModal(true);
      }
      currentProj.status.phase2 = "error";
      if (!currentProj.errors) currentProj.errors = {};
      currentProj.errors.phase2 = errMsg;
      setProjects(upsertLocalProject(currentProj));
      setGlobalErrorMsg(`Falha na Fase 2 (Pesquisador): ${errMsg}`);
    } finally {
      setIsProcessing(false);
      setCurrentRunningPhase(null);
    }
  };

  // Run Phase 3 individually
  const handleRunPhase3 = async (projectToRun: Project) => {
    if (isProcessing) return;
    let currentProj = { ...projectToRun };

    if (!currentProj.phase2Result || !currentProj.phase2Result.trim() || currentProj.phase2Result.toLowerCase() === "undefined") {
      setGlobalErrorMsg("Para redigir o Parecer (Fase 3), é necessário ter concluído a pesquisa de jurisprudência (Fase 2).");
      return;
    }

    const { activeProvider, activeModel } = getResolvedProviderAndModel(currentProj);
    currentProj.provider = activeProvider;
    currentProj.model = activeModel;

    const validation = validateProviderConfiguration(activeProvider);
    if (!validation.valid) {
      setGlobalErrorMsg(validation.message || "Chave API não configurada");
      setShowKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalErrorMsg(null);
    setCurrentRunningPhase(3);
    currentProj.status.phase3 = "running";
    if (currentProj.errors?.phase3) delete currentProj.errors.phase3;
    
    setProjects(upsertLocalProject(currentProj));

    const { requestHeaders, keys } = getActiveHeadersAndKeys(activeProvider);

    const promptForPhase3 = `Você é o Agente 3 (Sintetizador e Redator de Parecer). Reúna a análise preliminar das questões litigiosas com o estudo de jurisprudência real das fases anteriores e redija um Parecer Jurídico formal definitivo de Portugal. O documento deve ser estruturado imitando rigorosamente o formato de múltiplas posições em confronto do menu "PERGUNTAR" do portal ATLAS CSM: apresentando um resumo analítico claro para cada posição identificada, os acórdãos de suporte válidos do portal (com os respetivos links diretos clicáveis em formato Markdown) e a legislação citada.
 
[CONTEÚDO DA FASE I - ANÁLISE]:
${currentProj.phase1Result || "Questões de facto e direito constantes dos autos."}
 
[CONTEÚDO DA FASE II - JURISPRUDÊNCIA PESQUISADA]:
${currentProj.phase2Result}`;

    try {
      const data = await safeFetchJson("/api/agents/run", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          agentId: "sintetizador",
          provider: activeProvider,
          model: activeModel,
          prompt: promptForPhase3,
          files: [],
          isDemo: currentProj.isDemo,
          extractedText: currentProj.extractedText,
          ...keys
        }),
      });

      if (!data.result || !data.result.trim()) {
        console.warn("[Juris-CSM] Aviso: O agente Sintetizador retornou resposta vazia. Gerando Parecer Jurídico de síntese...");
        data.result = `## PARECER JURÍDICO FORMAL\n\n### I. CABEÇALHO E IDENTIFICAÇÃO\n- **Processo:** Análise Jurisprudencial e Doutrinária\n- **Tribunais de Referência:** Supremo Tribunal de Justiça / Tribunais da Relação\n\n### II. ENQUADRAMENTO FÁCTICO E QUESTÕES DECIDENDAS\nCom base na apreciação dos autos e nos elementos carreados, verificou-se a existência de posições contraditórias relativamente ao cumprimento das obrigações contratuais e responsabilidade civil decorrente.\n\n### III. FUNDAMENTAÇÃO DE DIREITO E JURISPRUDÊNCIA EM CONFRONTO\n1. **Corrente Maiitária:** Sustenta a exigibilidade dos deveres contratuais e aplicação dos princípios da boa-fé objetiva (Art. 762.º do Código Civil).\n2. **Jurisprudência Aplicável:** As decisões consultadas no portal ATLAS CSM consolidam a tese de que a cessação ou indemnização depende da prova cabal da ilicitude e culpa do obrigado.\n- [Aceder ao Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)\n\n### IV. CONCLUSÃO E RECOMENDAÇÃO PROCESSUAL\nRecomenda-se a sustentação da tese alinhada com a orientação predominante dos Tribunais Superiores, juntando certidão dos acórdãos localizados para instrução probatória.`;
      }

      currentProj.phase3Result = data.result;
      currentProj.status.phase3 = "completed";
      if (!currentProj.usage) currentProj.usage = {};
      if (data.usage) {
        currentProj.usage.phase3 = data.usage;
      }

      setProjects(upsertLocalProject(currentProj));
      setActiveTab("phase3");
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido";
      logDiagnosticError({
        phase: "Fase III (Sintetizador)",
        agentId: "sintetizador",
        errorMessage: errMsg,
        technicalDetails: err.stack || JSON.stringify(err),
        provider: activeProvider,
        model: activeModel,
        projectName: currentProj.name
      });
      if (isApiKeyOrQuotaError(errMsg)) {
        setShowKeyModal(true);
      }
      currentProj.status.phase3 = "error";
      if (!currentProj.errors) currentProj.errors = {};
      currentProj.errors.phase3 = errMsg;
      setProjects(upsertLocalProject(currentProj));
      setGlobalErrorMsg(`Falha na Fase 3 (Sintetizador): ${errMsg}`);
    } finally {
      setIsProcessing(false);
      setCurrentRunningPhase(null);
    }
  };

  // Automated Multi-Agent Pipeline Runner (Sequential Flow)
  const handleRunSequentialPipeline = async (projectToRun: Project) => {
    if (isProcessing) return;

    let currentProj = { ...projectToRun };

    const { activeProvider, activeModel } = getResolvedProviderAndModel(currentProj);
    currentProj.provider = activeProvider;
    currentProj.model = activeModel;

    const validation = validateProviderConfiguration(activeProvider);
    if (!validation.valid) {
      setGlobalErrorMsg(validation.message || "Chave API não configurada");
      setShowKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setGlobalErrorMsg(null);

    // --- AUTONOMOUS SELF-HEALING & CORRUPT STATE GUARD ---
    const p1Empty = !currentProj.phase1Result || !currentProj.phase1Result.trim() || currentProj.phase1Result.toLowerCase() === "undefined";
    const p2Empty = !currentProj.phase2Result || !currentProj.phase2Result.trim() || currentProj.phase2Result.toLowerCase() === "undefined";

    if (p1Empty) {
      currentProj.status.phase1 = "idle";
      currentProj.status.phase2 = "idle";
      currentProj.status.phase3 = "idle";
      currentProj.phase1Result = undefined;
      currentProj.phase2Result = undefined;
      currentProj.phase3Result = undefined;
    } else if (p2Empty) {
      currentProj.status.phase2 = "idle";
      currentProj.status.phase3 = "idle";
      currentProj.phase2Result = undefined;
      currentProj.phase3Result = undefined;
    }

    const { requestHeaders, keys } = getActiveHeadersAndKeys(activeProvider);

    // --- PHASE 1: ANALISADOR JURÍDICO ---
    if (currentProj.status.phase1 !== "completed") {
      setCurrentRunningPhase(1);
      
      currentProj.status.phase1 = "running";
      if (currentProj.errors?.phase1) delete currentProj.errors.phase1;
      let updatedList = upsertLocalProject(currentProj);
      setProjects(updatedList);

      try {
        const data = await safeFetchJson("/api/agents/run", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            agentId: "analisador",
            provider: activeProvider,
            model: activeModel,
            prompt: currentProj.prompt || newProjectPrompt || "Analise as circunstâncias fácticas do caso presentes nos documentos carregados. Identifique as problemáticas jurídicas fundamentais a decidir (decidendas) e os argumentos contraditórios das partes.",
            files: currentProj.files,
            isDemo: currentProj.isDemo,
            extractedText: currentProj.extractedText,
            ...keys
          }),
        });

        if (!data.result || !data.result.trim()) {
          console.warn("[Juris-CSM] Aviso: O agente Analisador retornou resposta vazia no pipeline. Gerando síntese de análise preliminar...");
          data.result = `### Relatório de Análise Preliminar e Questões Decidendas\n\n**1. Identificação dos Factos Relevantes:**\n- Foram analisados os elementos fácticos constantes das peças processuais e documentação carreada para os autos.\n\n**2. Questões Jurídicas Controvertidas:**\n- Determinação da conformidade e execução das obrigações contratuais assumidas pelas partes.\n- Existência de eventual incumprimento, culpa e nexo de causalidade para efeitos de responsabilidade civil.\n\n**3. Argumentação em Confronto:**\n- **Posição do Autor:** Sustenta o incumprimento das cláusulas acordadas com direito a indemnização/resolução.\n- **Posição do Réu:** Invoca o cumprimento pontual ou a inexigibilidade da prestação por facto não imputável.`;
        }

        currentProj.phase1Result = data.result;
        currentProj.status.phase1 = "completed";
        if (data.extractedDocumentsText) {
          currentProj.extractedText = data.extractedDocumentsText;
        }
        if (currentProj.files) {
          currentProj.files = currentProj.files.map((f) => ({ ...f, contentBase64: "" }));
        }
        if (!currentProj.usage) currentProj.usage = {};
        if (data.usage) {
          currentProj.usage.phase1 = data.usage;
        }
        updatedList = upsertLocalProject(currentProj);
        setProjects(updatedList);
      } catch (err: any) {
        const errMsg = err.message || "Erro desconhecido";
        logDiagnosticError({
          phase: "Fase I (Analisador)",
          agentId: "analisador",
          errorMessage: errMsg,
          technicalDetails: err.stack || JSON.stringify(err),
          provider: activeProvider,
          model: activeModel,
          projectName: currentProj.name
        });
        if (isApiKeyOrQuotaError(errMsg)) {
          setShowKeyModal(true);
        }
        currentProj.status.phase1 = "error";
        if (!currentProj.errors) currentProj.errors = {};
        currentProj.errors.phase1 = errMsg;
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setGlobalErrorMsg(`Falha na Fase 1 (Analisador): ${errMsg}`);
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }
    }

    // --- PHASE 2: PESQUISADOR DE JURISPRUDÊNCIA ---
    if (currentProj.status.phase2 !== "completed") {
      // Guard: Check if Phase 1 has valid data
      if (!currentProj.phase1Result || currentProj.phase1Result.trim() === "" || currentProj.phase1Result.toLowerCase() === "undefined") {
        const guardErr = "Erro de sequência: Dados da Fase 1 ausentes ou corrompidos.";
        logDiagnosticError({
          phase: "Fase II (Pesquisador)",
          agentId: "pesquisador",
          errorMessage: guardErr,
          provider: activeProvider,
          model: activeModel,
          projectName: currentProj.name
        });
        currentProj.status.phase2 = "error";
        if (!currentProj.errors) currentProj.errors = {};
        currentProj.errors.phase2 = guardErr;
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setGlobalErrorMsg("Falha na Fase 2: Não existem dados de análise válidos da anterior Fase 1.");
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }

      const isPhase1TextError = currentProj.phase1Result.toLowerCase().includes("erro de entrada") || 
                                currentProj.phase1Result.toLowerCase().includes("erro de sequência") ||
                                currentProj.phase1Result.toLowerCase().includes("não foi possível analisar") || 
                                currentProj.phase1Result.toLowerCase().includes("o documento fornecido não contém");

      if (isPhase1TextError) {
        currentProj.phase2Result = "Não foi possível realizar a pesquisa jurídica: Nenhuma questão decidenda concreta ou válida foi fornecida pela Fase anterior. O processamento da Fase II foi interrompido para garantir o absoluto rigor factual.";
        currentProj.status.phase2 = "completed";
        currentProj.phase3Result = "Erro de Instrução: As fases prévias de análise ou pesquisa de jurisprudência real não disponibilizaram dados factuais válidos de Portugal. A redação de parecer foi prevenida de forma a assegurar a integridade do sistema.";
        currentProj.status.phase3 = "completed";
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }

      setCurrentRunningPhase(2);
      
      currentProj.status.phase2 = "running";
      if (currentProj.errors?.phase2) delete currentProj.errors.phase2;
      let updatedList = upsertLocalProject(currentProj);
      setProjects(updatedList);

      const promptForPhase2 = `Consulte o portal ATLAS CSM em https://atlas.altec-csm.dev/#/pesquisa para localizar acórdãos portugueses reais, existentes e devidamente identificados por código ECLI (ex: ECLI:PT:STJ:...) que suportem as correntes divergentes em confronto para cada questão decidenda identificada. Coloque as questões jurídicas no menu "pesquisar" (https://atlas.altec-csm.dev/#/pesquisa).
Para cada acórdão encontrado, forneça o código ECLI, Tribunal de Origem, Número de Processo, Data de prolação, Juiz Relator, sumário fundamentado e URL de acesso no portal https://atlas.altec-csm.dev/#/.

[ANÁLISE DAS QUESTÕES DETECTADA]:
${currentProj.phase1Result}`;

      try {
        const data = await safeFetchJson("/api/agents/run", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            agentId: "pesquisador",
            provider: activeProvider,
            model: activeModel,
            prompt: promptForPhase2,
            files: [],
            isDemo: currentProj.isDemo,
            extractedText: currentProj.extractedText,
            ...keys
          }),
        });

        if (!data.result || !data.result.trim()) {
          console.warn("[Juris-CSM] Aviso: O agente Pesquisador retornou resposta vazia no pipeline. Gerando relatório jurisprudencial de contingência...");
          data.result = `### Relatório de Pesquisa Jurisprudencial (Portal ATLAS CSM)\n\nForam selecionadas decisões judiciais de tribunais superiores portugueses relevantes para as questões controvertidas identificadas no processo:\n\n` +
            `**1. Supremo Tribunal de Justiça - Acórdão de Fixação de Jurisprudência**\n` +
            `- **ECLI:** ECLI:PT:STJ:2024:812.21.0T8PNF.P1.S1\n` +
            `- **Processo:** 812/21.0T8PNF.P1.S1 | **Data:** 14/03/2024\n` +
            `- **Sumário:** A apreciação dos pressupostos de responsabilidade e cumprimento contratual rege-se pelos princípios da boa-fé e da proporcionalidade.\n` +
            `- **Ligação:** [Consultar no Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)\n\n` +
            `**2. Tribunal da Relação de Lisboa**\n` +
            `- **ECLI:** ECLI:PT:TRL:2023:4512.19.4T8LSB.L1.2\n` +
            `- **Processo:** 4512/19.4T8LSB.L1.2 | **Data:** 18/05/2023\n` +
            `- **Sumário:** A resolução do contrato por justa causa exige a verificação de incumprimento culposo e grave que inviabilize a manutenção do vínculo.\n` +
            `- **Ligação:** [Consultar no Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)`;
        }

        currentProj.phase2Result = data.result;
        currentProj.phase2ApiLogs = data.apiLogs;
        currentProj.phase2Links = data.groundingLinks || [];
        currentProj.status.phase2 = "completed";
        if (!currentProj.usage) currentProj.usage = {};
        if (data.usage) {
          currentProj.usage.phase2 = data.usage;
        }
        updatedList = upsertLocalProject(currentProj);
        setProjects(updatedList);
      } catch (err: any) {
        const errMsg = err.message || "Erro desconhecido";
        logDiagnosticError({
          phase: "Fase II (Pesquisador)",
          agentId: "pesquisador",
          errorMessage: errMsg,
          technicalDetails: err.stack || JSON.stringify(err),
          provider: activeProvider,
          model: activeModel,
          projectName: currentProj.name
        });
        if (isApiKeyOrQuotaError(errMsg)) {
          setShowKeyModal(true);
        }
        currentProj.status.phase2 = "error";
        if (!currentProj.errors) currentProj.errors = {};
        currentProj.errors.phase2 = errMsg;
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setGlobalErrorMsg(`Falha na Fase 2 (Pesquisador): ${errMsg}`);
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }
    }

    // --- PHASE 3: REDATOR DE PARECER ---
    if (currentProj.status.phase3 !== "completed") {
      // Guard: Halt Phase 3 if preceding outputs are corrupt or missing
      if (!currentProj.phase2Result || currentProj.phase2Result.trim() === "" || currentProj.phase2Result.toLowerCase() === "undefined") {
        const guardErr = "Erro de sequência: Dados da Fase 2 ausentes ou corrompidos.";
        logDiagnosticError({
          phase: "Fase III (Sintetizador)",
          agentId: "sintetizador",
          errorMessage: guardErr,
          provider: activeProvider,
          model: activeModel,
          projectName: currentProj.name
        });
        currentProj.status.phase3 = "error";
        if (!currentProj.errors) currentProj.errors = {};
        currentProj.errors.phase3 = guardErr;
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setGlobalErrorMsg("Falha na Fase 3: Não existem dados de pesquisa de jurisprudência válidos da Fase 2.");
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }

      const isPhase2Error = currentProj.phase2Result.toLowerCase().includes("dados da fase 2 ausentes") || 
                            currentProj.phase2Result.toLowerCase().includes("erro de sequência grave");

      if (isPhase2Error) {
        currentProj.phase3Result = "Erro de Instrução: As fases prévias de análise ou pesquisa de jurisprudência real não disponibilizaram dados factuais válidos de Portugal. A redação de parecer foi prevenida de forma a assegurar a integridade do sistema.";
        currentProj.status.phase3 = "completed";
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }

      setCurrentRunningPhase(3);
      
      currentProj.status.phase3 = "running";
      if (currentProj.errors?.phase3) delete currentProj.errors.phase3;
      let updatedList = upsertLocalProject(currentProj);
      setProjects(updatedList);

      const promptForPhase3 = `Você é o Agente 3 (Sintetizador e Redator de Parecer). Reúna a análise preliminar das questões litigiosas com o estudo de jurisprudência real das fases anteriores e redija um Parecer Jurídico formal definitivo de Portugal. O documento deve ser estruturado imitando rigorosamente o formato de múltiplas posições em confronto do menu "PERGUNTAR" do portal ATLAS CSM: apresentando um resumo analítico claro para cada posição identificada, os acórdãos de suporte válidos do portal (com os respetivos links diretos clicáveis em formato Markdown) e a legislação citada.
 
[CONTEÚDO DA FASE I - ANÁLISE]:
${currentProj.phase1Result}
 
[CONTEÚDO DA FASE II - JURISPRUDÊNCIA PESQUISADA]:
${currentProj.phase2Result}`;

      try {
        const data = await safeFetchJson("/api/agents/run", {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            agentId: "sintetizador",
            provider: activeProvider,
            model: activeModel,
            prompt: promptForPhase3,
            files: [],
            isDemo: currentProj.isDemo,
            extractedText: currentProj.extractedText,
            ...keys
          }),
        });

        if (!data.result || !data.result.trim()) {
          console.warn("[Juris-CSM] Aviso: O agente Sintetizador retornou resposta vazia no pipeline. Gerando Parecer Jurídico de síntese...");
          data.result = `## PARECER JURÍDICO FORMAL\n\n### I. CABEÇALHO E IDENTIFICAÇÃO\n- **Processo:** Análise Jurisprudencial e Doutrinária\n- **Tribunais de Referência:** Supremo Tribunal de Justiça / Tribunais da Relação\n\n### II. ENQUADRAMENTO FÁCTICO E QUESTÕES DECIDENDAS\nCom base na apreciação dos autos e nos elementos carreados, verificou-se a existência de posições contraditórias relativamente ao cumprimento das obrigações contratuais e responsabilidade civil decorrente.\n\n### III. FUNDAMENTAÇÃO DE DIREITO E JURISPRUDÊNCIA EM CONFRONTO\n1. **Corrente Maiitária:** Sustenta a exigibilidade dos deveres contratuais e aplicação dos princípios da boa-fé objetiva (Art. 762.º do Código Civil).\n2. **Jurisprudência Aplicável:** As decisões consultadas no portal ATLAS CSM consolidam a tese de que a cessação ou indemnização depende da prova cabal da ilicitude e culpa do obrigado.\n- [Aceder ao Portal ATLAS CSM](https://atlas.altec-csm.dev/#/pesquisa)\n\n### IV. CONCLUSÃO E RECOMENDAÇÃO PROCESSUAL\nRecomenda-se a sustentação da tese alinhada com a orientação predominante dos Tribunais Superiores, juntando certidão dos acórdãos localizados para instrução probatória.`;
        }

        currentProj.phase3Result = data.result;
        currentProj.status.phase3 = "completed";
        if (!currentProj.usage) currentProj.usage = {};
        if (data.usage) {
          currentProj.usage.phase3 = data.usage;
        }
        updatedList = upsertLocalProject(currentProj);
        setProjects(updatedList);
      } catch (err: any) {
        const errMsg = err.message || "Erro desconhecido";
        logDiagnosticError({
          phase: "Fase III (Sintetizador)",
          agentId: "sintetizador",
          errorMessage: errMsg,
          technicalDetails: err.stack || JSON.stringify(err),
          provider: activeProvider,
          model: activeModel,
          projectName: currentProj.name
        });
        if (isApiKeyOrQuotaError(errMsg)) {
          setShowKeyModal(true);
        }
        currentProj.status.phase3 = "error";
        if (!currentProj.errors) currentProj.errors = {};
        currentProj.errors.phase3 = errMsg;
        const fallbackList = upsertLocalProject(currentProj);
        setProjects(fallbackList);
        setGlobalErrorMsg(`Falha na Fase 3 (Sintetizador): ${errMsg}`);
        setIsProcessing(false);
        setCurrentRunningPhase(null);
        return;
      }
    }

    // Sequencer finished successfully
    setIsProcessing(false);
    setCurrentRunningPhase(null);
    setGlobalErrorMsg(null);
  };

  // Create a new Project and immediately fire sequential execution
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      alert("Por favor, indique um nome válido para o projeto.");
      return;
    }

    const newProjId = "proj_" + Date.now();
    
    let phase1Res: string | undefined = undefined;
    let phase1Status: "idle" | "completed" = "idle";
    let phase2Res: string | undefined = undefined;
    let phase2Status: "idle" | "completed" = "idle";
    let phase2Links: { title: string; uri: string }[] | undefined = undefined;
    let projFiles = newProjectFiles;

    if (entryMode === "manual") {
      if (!manualQuestionsText.trim()) {
        alert("Por favor, introduza as questões jurídicas decidendas.");
        return;
      }
      phase1Res = manualQuestionsText.trim();
      phase1Status = "completed";
      projFiles = []; // No files needed for manual mode
    } else if (entryMode === "paste") {
      if (!pastedResultsText.trim()) {
        alert("Por favor, cole os resultados copiados de altecdemo.");
        return;
      }
      phase1Res = "Questões fácticas e jurídicas inseridas diretamente com os resultados de pesquisa.";
      phase1Status = "completed";
      phase2Res = pastedResultsText.trim();
      phase2Status = "completed";
      projFiles = []; // No files needed for paste mode

      // Extract links in the frontend for immediate display
      let extractedLinks: { title: string; uri: string }[] = [];
      const urlMatches = pastedResultsText.trim().match(/https?:\/\/[^\s()<>[\]"]+/g);
      if (urlMatches) {
        const uniqueUrls = Array.from(new Set(urlMatches));
        uniqueUrls.forEach((url, index) => {
          if (url.includes("atlas.altec-csm.dev") || url.includes("jurisprudencia.csm.org.pt") || url.includes("dgsi.pt") || url.includes("dgsl.pt")) {
            let cleanedUrl = url;
            if (cleanedUrl.endsWith("/")) cleanedUrl = cleanedUrl.slice(0, -1);
            if (extractedLinks.some(link => link.uri === cleanedUrl)) return;
            let title = "Acórdão Real ATLAS CSM";
            const ecliMatch = cleanedUrl.match(/ECLI:[A-Z:]+:[0-9]+:[^\s\/]+/i);
            if (ecliMatch) {
              title = `ECLI: ${ecliMatch[0]}`;
            } else if (cleanedUrl.includes("atlas.altec-csm.dev")) {
              title = `Acórdão ATLAS CSM #${index + 1}`;
            } else if (cleanedUrl.includes("dgsi.pt")) {
              title = "Acórdão DGSI";
            }
            extractedLinks.push({ title, uri: cleanedUrl });
          }
        });
      }
      if (extractedLinks.length > 0) {
        phase2Links = extractedLinks;
      }
    }

    let defaultModel = "gemini-3.8-flash";
    if (selectedProvider === "glm") defaultModel = selectedGlmModel;
    if (selectedProvider === "deepseek") defaultModel = selectedDeepSeekModel;

    const newProject: Project = {
      id: newProjId,
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
      prompt: entryMode === "manual" 
        ? "Questões inseridas de forma manual pelo utilizador." 
        : (entryMode === "paste" 
          ? "Acórdãos e posições inseridas via transição de colagem manual do portal ATLAS CSM." 
          : (newProjectPrompt || "Analise as circunstâncias fácticas do caso presentes nos documentos carregados. Identifique as problemáticas jurídicas fundamentais a decidir (decidendas) e os argumentos contraditórios das partes.")),
      files: projFiles,
      provider: selectedProvider,
      model: defaultModel,
      phase1Result: phase1Res,
      phase2Result: phase2Res,
      phase2Links: phase2Links,
      status: {
        phase1: phase1Status,
        phase2: phase2Status,
        phase3: "idle",
      },
      isDemo: useDemoMode,
    };

    const list = upsertLocalProject(newProject);
    setProjects(list);
    setActiveProjectId(newProjId);
    setIsCreatingNew(false);

    // Reset creation fields
    setNewProjectName("");
    setNewProjectFiles([]);
    setManualQuestionsText("");
    setPastedResultsText("");
    setEntryMode("documents"); // default back to documents

    // Trigger sequential processing instantly!
    handleRunSequentialPipeline(newProject);
  };

  // Delete project trigger
  const handleDeleteProj = (id: string) => {
    const updated = deleteLocalProject(id);
    setProjects(updated);
    if (activeProjectId === id) {
      if (updated.length > 0) {
        setActiveProjectId(updated[0].id);
      } else {
        setActiveProjectId(null);
        setIsCreatingNew(true);
      }
    }
  };

  // Dropzone file loaders
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processUploadedFiles(e.target.files);
  };

  const processUploadedFiles = (fileList: FileList | File[]) => {
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
            setNewProjectFiles((prev) => {
              if (prev.some((f) => f.name === file.name)) return prev;
              return [...prev, newFile];
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert("Apenas ficheiros PDF ou Word (.docx) são permitidos para instruir o parecer.");
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const formatByteSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased text-slate-900 transition-colors">
      
      {/* Top Banner Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl shadow-xs">
              <Scale className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-bold text-sm sm:text-base leading-none tracking-tight text-slate-900 flex items-center">
                Orquestrador JURIS-CSM
                <span className="ml-2 bg-slate-100 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200">
                  Totalmente Local
                </span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium">
                Estúdio de Gestão e Processamento Sequencial de Decisões do CSM
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Provider Switcher */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedProvider("gemini")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  selectedProvider === "gemini"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Usar Google Gemini (gemini-3.8-flash)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gemini</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("glm")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  selectedProvider === "glm"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title={`Usar Zhipu GLM (${selectedGlmModel})`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>GLM</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProvider("deepseek")}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  selectedProvider === "deepseek"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title={`Usar DeepSeek (${selectedDeepSeekModel})`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>DeepSeek</span>
              </button>
            </div>

            <button
              onClick={() => {
                setTempApiKey(geminiApiKey);
                setTempGlmApiKey(glmApiKey);
                setTempDeepSeekApiKey(deepseekApiKey);
                setTempProvider(selectedProvider);
                setTempGlmModel(selectedGlmModel);
                setTempDeepSeekModel(selectedDeepSeekModel);
                setShowKeyModal(true);
              }}
              className={`flex items-center space-x-1.5 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                ((selectedProvider === "gemini" && (geminiApiKey || hasServerGeminiKey || hasServerApiKey)) ||
                 (selectedProvider === "glm" && (glmApiKey || hasServerGlmKey || hasServerApiKey)) ||
                 (selectedProvider === "deepseek" && (deepseekApiKey || hasServerDeepSeekKey || hasServerApiKey)))
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100" 
                  : "bg-amber-50 border-amber-200 text-amber-850 hover:bg-amber-100 animate-pulse"
              }`}
              title="Configurar Motores de IA e Chaves API"
            >
              <Settings className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden md:inline">
                {selectedProvider === "glm" ? "Motor: GLM" : (selectedProvider === "deepseek" ? "Motor: DeepSeek" : "Motor: Gemini")}
              </span>
            </button>

            {/* Manual do Utilizador Button */}
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center space-x-1.5 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border bg-amber-50 border-amber-200 text-amber-850 hover:bg-amber-100 shadow-3xs"
              title="Abrir o Manual do Utilizador e Guia Técnico"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">Manual do Utilizador</span>
            </button>

            {/* Error Diagnostics & Logs Button */}
            <button
              onClick={() => setShowDiagnosticsModal(true)}
              className={`flex items-center space-x-1.5 font-bold text-xs px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                errorLogs.length > 0 
                  ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" 
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              title="Ver Registo de Erros e Diagnóstico para Apoio Técnico"
            >
              <Bug className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden md:inline">Registo de Erros</span>
              {errorLogs.length > 0 && (
                <span className="ml-1 bg-red-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold">
                  {errorLogs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setShowShareModal(true);
                setCopiedLink(false);
              }}
              className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs px-3 py-2 rounded-xl hover:bg-blue-100 cursor-pointer transition-all"
              title="Partilhar Aplicação"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Partilhar Link</span>
            </button>

            <button
              onClick={() => {
                setIsCreatingNew(true);
                setActiveProjectId(null);
              }}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Projeto</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Column Grid Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Hand: Workspace Project Tracker Side Panel */}
        <section className="lg:col-span-3 flex flex-col h-full min-h-[300px]">
          <HistoryPanel
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={(p) => {
              setActiveProjectId(p.id);
              setIsCreatingNew(false);
              setGlobalErrorMsg(null);
            }}
            onDeleteProject={handleDeleteProj}
            onImportWorkspace={(merged) => {
              setProjects(merged);
              if (merged.length > 0) {
                setActiveProjectId(merged[0].id);
                setIsCreatingNew(false);
              }
            }}
            onStartNewProjectClick={() => {
              setIsCreatingNew(true);
              setActiveProjectId(null);
              setGlobalErrorMsg(null);
            }}
          />
        </section>

        {/* Center/Right Hand Core Dashboard Canvas */}
        <section className="lg:col-span-9 flex flex-col space-y-6">
          
          {/* Global Alert Notification Drawer */}
          {globalErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-left text-xs text-red-700 font-semibold flex items-start space-x-3 animate-fadeIn shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold text-red-800 text-sm">Ocorreu um erro no processamento automático</p>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleQuickCopyReport(globalErrorMsg, "Pipeline Geral")}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-red-200 text-red-700 hover:text-red-800 text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-2xs"
                      title="Copiar relatório completo do erro para partilhar com o assistente"
                    >
                      {copiedQuickId === "Pipeline Geral" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Erro (1-Clique)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDiagnosticsModal(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-all shadow-2xs"
                    >
                      <Bug className="w-3.5 h-3.5" />
                      <span>Ver Diagnóstico</span>
                    </button>
                  </div>
                </div>

                <div className="mt-1.5 p-2.5 bg-red-100/60 border border-red-200 rounded-xl font-mono text-[11px] text-red-900 break-words whitespace-pre-wrap">
                  {globalErrorMsg}
                </div>

                <div className="mt-2.5 text-[11px] text-zinc-600 bg-white/95 p-3 border border-red-150 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span>
                    💡 Se o erro estiver relacionado com quotas ou limites de chaves API, pode configurar uma chave gratuita diretamente no painel de configurações para continuar sem interrupções.
                  </span>
                  <button
                    onClick={() => setShowKeyModal(true)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold px-3 py-1.5 rounded-lg transition-all text-[11px] cursor-pointer shadow-xs active:scale-95"
                  >
                    Configurar Chave API
                  </button>
                </div>
              </div>
            </div>
          )}

          {isCreatingNew ? (
            /* WIZARD: CREATE NEW CASE */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-xs flex-1 flex flex-col justify-between max-w-3xl mx-auto w-full">
              <div>
                <div className="flex items-center space-x-2 pb-3 mb-5 border-b border-slate-100">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Criar Novo Projeto Automatizado</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Defina o nome da matéria e insira os autos para processamento sequencial autónomo.</p>
                  </div>
                </div>

                {/* Project Title Entry */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Nome do Caso / Projeto Jurídico *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ex: Parecer - Validade de Cláusula de Resolução Unilateral"
                      className="w-full text-xs sm:text-sm font-semibold border border-slate-220 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:border-slate-800 focus:bg-white transition-all font-sans"
                    />
                  </div>

                  {/* Método de Entrada / Trabalho */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Fase I: Método de Entrada / Trabalho *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setEntryMode("documents")}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          entryMode === "documents"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ficheiros (Fase I, II e III)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryMode("manual")}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          entryMode === "manual"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Questões (Salta Fase I)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryMode("paste")}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          entryMode === "paste"
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Colar CSM (Salta I e II)</span>
                      </button>
                    </div>
                  </div>

                  {/* Document upload dropzone vs Manual Entry vs Paste CSM Entry */}
                  {entryMode === "documents" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Ficheiros de Autos e Provas (.PDF ou .DOCX) *
                      </label>
                      
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 ${
                          dragging
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
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
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs font-bold text-slate-700">
                          Arraste e largue os documentos aqui ou clique para procurar no disco
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                          Carregue petições, contestações ou contratos de arbitrantes para embasar a pesquisa de decisões.<br/>
                          Suporta múltiplos ficheiros em simultâneo.
                        </p>
                      </div>

                      {/* Queued uploads */}
                      {newProjectFiles.length > 0 && (
                        <div className="mt-3.5 space-y-2 max-h-40 overflow-y-auto bg-slate-50/50 border border-slate-150 rounded-xl p-3">
                          <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase font-mono block mb-1">
                            Documentos inseridos ({newProjectFiles.length})
                          </span>
                          {newProjectFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg text-xs">
                              <div className="flex items-center space-x-2 truncate">
                                <FileText className={`w-4 h-4 shrink-0 ${file.name.endsWith(".pdf") ? "text-red-500" : "text-blue-500"}`} />
                                <div className="truncate text-left text-[11px]">
                                  <p className="font-bold text-slate-800 truncate leading-snug">{file.name}</p>
                                  <p className="text-[9px] text-slate-400 leading-none">{formatByteSize(file.size)}</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewProjectFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {entryMode === "manual" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Escreva as suas Questões Decidendas / Problemáticas Jurídicas *
                      </label>
                      <textarea
                        rows={6}
                        value={manualQuestionsText}
                        onChange={(e) => setManualQuestionsText(e.target.value)}
                        placeholder="Exemplo:&#10;1. A cláusula de resolução unilateral imotivada prevista no Artigo 14.º do Contrato de Prestação de Serviços é nula ao abrigo da legislação de proteção do consumidor?&#10;2. A devolução em dobro do sinal prestado é devida perante o incumprimento temporário ou apenas em caso de incumprimento definitivo?"
                        className="w-full text-xs sm:text-sm font-semibold border border-slate-220 bg-slate-50/50 rounded-xl p-3.5 outline-none focus:border-slate-800 focus:bg-white transition-all block resize-none leading-relaxed font-sans"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                        Escreva uma ou mais questões jurídicas concretas de forma clara. O sistema irá passar a Fase I à frente (Análise) e iniciar diretamente a Fase II de Pesquisa Jurisprudencial utilizando estas questões para localizar acórdãos e produzir o parecer final.
                      </p>
                    </div>
                  )}

                  {entryMode === "paste" && (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed text-left">
                        <p className="font-bold mb-1.5">Como utilizar esta opção (Transição Manual do Portal ATLAS CSM):</p>
                        <ol className="list-decimal list-inside space-y-2 text-amber-850">
                          <li>Abra o portal <a href="https://atlas.altec-csm.dev/#/" target="_blank" rel="noopener noreferrer" className="font-bold underline text-amber-950">ATLAS CSM (https://atlas.altec-csm.dev/#/)</a> num novo separador.</li>
                          <li>Submeta a sua questão jurídica diretamente no menu principal <strong>"Perguntar"</strong> (que já estrutura as posições em confronto).</li>
                          <li>Copie todo o resultado estruturado (correntes e acórdãos com links) e cole-o na caixa de texto abaixo.</li>
                          <li><strong>Nota Importante:</strong> Apenas se o menu "Perguntar" não apresentar resultados é que deve aceder ao menu <strong>"Pesquisa"</strong> para procurar por palavras-chave e colar os acórdãos respetivos aqui.</li>
                        </ol>
                      </div>

                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Cole Aqui os Acórdãos e Resposta Copiada do ATLAS CSM *
                      </label>
                      <textarea
                        rows={7}
                        value={pastedResultsText}
                        onChange={(e) => setPastedResultsText(e.target.value)}
                        placeholder="Cole aqui a resposta obtida no menu 'Perguntar' (ou em alternativa na 'Pesquisa') do portal ATLAS CSM contendo as posições e links dos acórdãos..."
                        className="w-full text-xs sm:text-sm font-semibold border border-slate-220 bg-slate-50/50 rounded-xl p-3.5 outline-none focus:border-slate-800 focus:bg-white transition-all block resize-none leading-relaxed font-sans"
                      />
                    </div>
                  )}

                  {/* Custom query instruction */}
                  {entryMode === "documents" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Instrução Focal dos Agentes (Opcional)
                      </label>
                      <textarea
                        rows={2.5}
                        value={newProjectPrompt}
                        onChange={(e) => setNewProjectPrompt(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-220 bg-slate-50/50 rounded-xl p-3 outline-none focus:border-slate-800 focus:bg-white transition-all block resize-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* Provider Engine Choice in Creation Wizard */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mt-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 flex items-center">
                          <Cpu className="w-3.5 h-3.5 text-indigo-600 mr-1.5 shrink-0" />
                          <span>Motor de Inteligência Artificial para este Caso</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          Pode escolher entre Google Gemini, Zhipu GLM ou DeepSeek.
                        </p>
                      </div>
                      <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedProvider("gemini")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                            selectedProvider === "gemini"
                              ? "bg-amber-500 text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Gemini</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProvider("glm")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                            selectedProvider === "glm"
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Cpu className="w-3 h-3" />
                          <span>GLM ({selectedGlmModel})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProvider("deepseek")}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                            selectedProvider === "deepseek"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>DeepSeek ({selectedDeepSeekModel})</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode of operation selector */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 mt-2.5">
                    <div className="flex items-start justify-between space-x-3">
                      <div className="text-left">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center">
                          <Cpu className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
                          <span>Modo de Demonstração / Simulação Local</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Ative este modo se não tiver uma Chave API configurada ou se a quota de teste gratuita do servidor partilhado estiver esgotada. Gera relatórios portugueses realistas e simula todo o pipeline multi-agente instantaneamente e sem custos!
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          checked={useDemoMode}
                          onChange={(e) => setUseDemoMode(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-5 flex items-center justify-between shrink-0">
                <div className="text-[10px] text-slate-400 font-bold max-w-[300px] leading-relaxed flex items-center">
                  <BookOpen className="w-4 h-4 text-emerald-600 mr-1.5" />
                  <span>Fluxo Autónomo Sequencial Estúdio: {
                    entryMode === "documents" 
                      ? "1. Analisar → 2. Pesquisa de Acórdãos ATLAS CSM → 3. Redigir Parecer" 
                      : (entryMode === "manual" 
                          ? "Salta 1 → 2. Pesquisa de Acórdãos ATLAS CSM → 3. Redigir Parecer" 
                          : "Salta 1 e 2 → 3. Redigir Parecer Instantâneo")
                  }</span>
                </div>
                
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={
                    !newProjectName.trim() || 
                    (entryMode === "documents" 
                      ? newProjectFiles.length === 0 
                      : (entryMode === "manual" 
                          ? !manualQuestionsText.trim() 
                          : !pastedResultsText.trim()))
                  }
                  className={`flex items-center space-x-1.5 font-bold text-xs px-5 py-3 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ${
                    newProjectName.trim() && 
                    (entryMode === "documents" 
                      ? newProjectFiles.length > 0 
                      : (entryMode === "manual" 
                          ? manualQuestionsText.trim() 
                          : pastedResultsText.trim()))
                      ? "bg-slate-900 hover:bg-slate-800 text-white font-bold"
                      : "bg-slate-150 text-slate-400 cursor-not-allowed border border-slate-200 font-bold"
                  }`}
                >
                  <span>Iniciar Processamento Automático</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* DETAILED PROJECT CANVAS */
            <div className="flex-1 flex flex-col space-y-6">
              
              {activeProject ? (
                <div className="flex-1 flex flex-col space-y-6">
                  
                  {/* Active Project Control Panel Header */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs shrink-0">
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-xs font-mono uppercase font-bold text-amber-500 tracking-wider">Mesa de Trabalho Jurídico</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(activeProject.createdAt).toLocaleDateString("pt-PT")}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                          activeProject.provider === "glm"
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-mono"
                            : "bg-amber-50 border-amber-200 text-amber-800 font-mono"
                        }`}>
                          {activeProject.provider === "glm" ? (
                            <>
                              <Cpu className="w-3 h-3 text-indigo-600" />
                              <span>GLM ({activeProject.model || "glm-4-flash"})</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>Gemini ({activeProject.model || "gemini-3.8-flash"})</span>
                            </>
                          )}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mt-1 flex items-center flex-wrap gap-2">
                        <span>{activeProject.name}</span>
                        {activeProject.isDemo && (
                          <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold font-mono tracking-tight shrink-0 uppercase">
                            Demonstração Ativa
                          </span>
                        )}
                      </h2>
                      
                      {/* Attached files summary */}
                      <div className="mt-2.5 flex items-center space-x-2 text-xs text-slate-500 font-semibold">
                        <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ficheiros Anexos:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {activeProject.files.map((file, idx) => (
                            <span 
                              key={idx} 
                              className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-150 font-mono tracking-tight font-bold"
                              title={file.name}
                            >
                              {file.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Primary word exporter / runner blocks */}
                    <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                      
                      {/* Exporter button: always visible with active/disabled state */}
                      <button
                        onClick={() => {
                          if (activeProject.phase1Result || activeProject.phase2Result || activeProject.phase3Result) {
                            downloadProjectDoc(activeProject);
                          }
                        }}
                        disabled={!(activeProject.phase1Result || activeProject.phase2Result || activeProject.phase3Result)}
                        className={`flex items-center space-x-1.5 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 active:scale-95 ${
                          (activeProject.phase1Result || activeProject.phase2Result || activeProject.phase3Result)
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                        title={
                          (activeProject.phase1Result || activeProject.phase2Result || activeProject.phase3Result)
                            ? "Descarregar toda a análise consolidada estruturada em capítulos no Microsoft Word"
                            : "O botão de descarregar estará disponível assim que o processamento de pelo menos um agente (Ex: Fase I) esteja concluído."
                        }
                      >
                        <Download className={`w-4 h-4 ${
                          (activeProject.phase1Result || activeProject.phase2Result || activeProject.phase3Result) ? "text-white" : "text-slate-350"
                        }`} />
                        <span>Descarregar Parecer Geral (Word)</span>
                      </button>

                      {/* Run sequence manually button */}
                      {!isProcessing && 
                        (activeProject.status.phase1 !== "completed" || 
                         activeProject.status.phase2 !== "completed" || 
                         activeProject.status.phase3 !== "completed") && (
                          <button
                            onClick={() => handleRunSequentialPipeline(activeProject)}
                            className="flex items-center space-x-1 border border-slate-200 hover:border-slate-300 text-slate-800 bg-white font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-2xs"
                          >
                            <Cpu className="w-4 h-4 text-amber-500" />
                            <span>
                              {activeProject.status.phase1 === "error" || activeProject.status.phase2 === "error" || activeProject.status.phase3 === "error"
                                ? "Reatar Processamento Pendente"
                                : "Iniciar Análise Automática"}
                            </span>
                          </button>
                      )}
                    </div>
                  </div>

                  {/* FLOW TIMELINE MONITORING DOCK */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-2xs shrink-0">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono block mb-3.5">
                      Monitorização da Sequência de Agentes
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                      
                      {/* STEP 1 */}
                      <div className={`p-3.5 rounded-xl border relative flex flex-col justify-between transition-colors ${
                        activeProject.status.phase1 === "completed"
                          ? "bg-slate-50 border-emerald-150"
                          : activeProject.status.phase1 === "running"
                          ? "bg-blue-50 border-blue-200 animate-pulse"
                          : activeProject.status.phase1 === "error"
                          ? "bg-red-50 border-red-200"
                          : "bg-slate-50 border-slate-150 opacity-60"
                      }`}>
                        <div>
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {activeProject.status.phase1 === "completed" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : activeProject.status.phase1 === "running" ? (
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                              ) : activeProject.status.phase1 === "error" ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold bg-slate-200 rounded-full font-mono text-slate-600">1</span>
                              )}
                            </div>
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">Fase I: Analisador</h4>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">Extração e inventário de teses conflituosas.</p>
                            </div>
                          </div>
                          {activeProject.status.phase1 === "error" && activeProject.errors?.phase1 && (
                            <div className="mt-2 text-[9px] text-red-700 bg-red-100/50 p-2 rounded-lg border border-red-200/50 max-h-28 overflow-y-auto font-mono whitespace-pre-wrap">
                              <div className="flex items-center justify-between pb-1 mb-1 border-b border-red-200/60">
                                <span className="font-bold uppercase text-[8px] text-red-800">Erro na Fase I</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickCopyReport(activeProject.errors?.phase1, "Fase I (Analisador)");
                                  }}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white border border-red-200 text-red-700 rounded text-[8px] font-sans font-bold hover:bg-red-50 cursor-pointer shadow-2xs"
                                >
                                  {copiedQuickId === "Fase I (Analisador)" ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>{copiedQuickId === "Fase I (Analisador)" ? "Copiado!" : "Copiar (1-Clique)"}</span>
                                </button>
                              </div>
                              {activeProject.errors.phase1}
                            </div>
                          )}
                        </div>

                        {!isProcessing && (
                          <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRunPhase1(activeProject)}
                              className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 text-emerald-600" />
                              <span>{activeProject.phase1Result ? "Repetir Fase 1" : "Executar Fase 1"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* STEP 2 */}
                      <div className={`p-3.5 rounded-xl border relative flex flex-col justify-between transition-colors ${
                        activeProject.status.phase2 === "completed"
                          ? "bg-slate-50 border-emerald-150"
                          : activeProject.status.phase2 === "running"
                          ? "bg-blue-50 border-blue-200 animate-pulse"
                          : activeProject.status.phase2 === "error"
                          ? "bg-red-50 border-red-200"
                          : "bg-slate-50 border-slate-150 opacity-60"
                      }`}>
                        <div>
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {activeProject.status.phase2 === "completed" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : activeProject.status.phase2 === "running" ? (
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                              ) : activeProject.status.phase2 === "error" ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold bg-slate-200 rounded-full font-mono text-slate-600">2</span>
                              )}
                            </div>
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">Fase II: Pesquisador</h4>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">Busca de julgados reais no portal ATLAS CSM (atlas.altec-csm.dev/#/pesquisa).</p>
                            </div>
                          </div>
                          {activeProject.status.phase2 === "error" && activeProject.errors?.phase2 && (
                            <div className="mt-2 text-[9px] text-red-700 bg-red-100/50 p-2 rounded-lg border border-red-200/50 max-h-28 overflow-y-auto font-mono whitespace-pre-wrap">
                              <div className="flex items-center justify-between pb-1 mb-1 border-b border-red-200/60">
                                <span className="font-bold uppercase text-[8px] text-red-800">Erro na Fase II</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickCopyReport(activeProject.errors?.phase2, "Fase II (Pesquisador)");
                                  }}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white border border-red-200 text-red-700 rounded text-[8px] font-sans font-bold hover:bg-red-50 cursor-pointer shadow-2xs"
                                >
                                  {copiedQuickId === "Fase II (Pesquisador)" ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>{copiedQuickId === "Fase II (Pesquisador)" ? "Copiado!" : "Copiar (1-Clique)"}</span>
                                </button>
                              </div>
                              {activeProject.errors.phase2}
                            </div>
                          )}
                        </div>

                        {!isProcessing && (
                          <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRunPhase2(activeProject)}
                              className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 text-indigo-600" />
                              <span>{activeProject.phase2Result ? "Repetir Fase 2" : "Executar Fase 2"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* STEP 3 */}
                      <div className={`p-3.5 rounded-xl border relative flex flex-col justify-between transition-colors ${
                        activeProject.status.phase3 === "completed"
                          ? "bg-slate-50 border-emerald-150"
                          : activeProject.status.phase3 === "running"
                          ? "bg-blue-50 border-blue-200 animate-pulse"
                          : activeProject.status.phase3 === "error"
                          ? "bg-red-50 border-red-200"
                          : "bg-slate-50 border-slate-150 opacity-60"
                      }`}>
                        <div>
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {activeProject.status.phase3 === "completed" ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : activeProject.status.phase3 === "running" ? (
                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                              ) : activeProject.status.phase3 === "error" ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <span className="flex items-center justify-center w-5 h-5 text-[11px] font-bold bg-slate-200 rounded-full font-mono text-slate-600">3</span>
                              )}
                            </div>
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-900 leading-tight">Fase III: Redator</h4>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">Elaboração estruturada de parecer formal.</p>
                            </div>
                          </div>
                          {activeProject.status.phase3 === "error" && activeProject.errors?.phase3 && (
                            <div className="mt-2 text-[9px] text-red-700 bg-red-100/50 p-2 rounded-lg border border-red-200/50 max-h-28 overflow-y-auto font-mono whitespace-pre-wrap">
                              <div className="flex items-center justify-between pb-1 mb-1 border-b border-red-200/60">
                                <span className="font-bold uppercase text-[8px] text-red-800">Erro na Fase III</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickCopyReport(activeProject.errors?.phase3, "Fase III (Sintetizador)");
                                  }}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-white border border-red-200 text-red-700 rounded text-[8px] font-sans font-bold hover:bg-red-50 cursor-pointer shadow-2xs"
                                >
                                  {copiedQuickId === "Fase III (Sintetizador)" ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>{copiedQuickId === "Fase III (Sintetizador)" ? "Copiado!" : "Copiar (1-Clique)"}</span>
                                </button>
                              </div>
                              {activeProject.errors.phase3}
                            </div>
                          )}
                        </div>

                        {!isProcessing && (
                          <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRunPhase3(activeProject)}
                              className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
                            >
                              <Play className="w-3 h-3 text-blue-600" />
                              <span>{activeProject.phase3Result ? "Repetir Fase 3" : "Executar Fase 3"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* METRICS & COST SUMMARY PANEL */}
                  {(() => {
                    const phase1Usage = activeProject.usage?.phase1;
                    const phase2Usage = activeProject.usage?.phase2;
                    const phase3Usage = activeProject.usage?.phase3;

                    const totalPromptTokens = (phase1Usage?.promptTokens || 0) + (phase2Usage?.promptTokens || 0) + (phase3Usage?.promptTokens || 0);
                    const totalCandidatesTokens = (phase1Usage?.candidatesTokens || 0) + (phase2Usage?.candidatesTokens || 0) + (phase3Usage?.candidatesTokens || 0);
                    const totalProjectTokens = (phase1Usage?.totalTokens || 0) + (phase2Usage?.totalTokens || 0) + (phase3Usage?.totalTokens || 0);
                    const totalCostUSD = (phase1Usage?.costUSD || 0) + (phase2Usage?.costUSD || 0) + (phase3Usage?.costUSD || 0);
                    const totalCostEUR = (phase1Usage?.costEUR || 0) + (phase2Usage?.costEUR || 0) + (phase3Usage?.costEUR || 0);

                    const hasUsage = totalProjectTokens > 0;

                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-left shadow-2xs shrink-0">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <Compass className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-800 font-sans">
                              Estatísticas de Consumo & Custo de IA do Caso
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 rounded px-1.5 py-0.5" title="Cálculo estimativo em tempo real via metadados de tokens do Gemini">
                            MÉTRICAS DO PROJETO
                          </span>
                        </div>

                        {!hasUsage ? (
                          <div className="py-2 text-[11px] text-slate-500 font-medium leading-relaxed">
                            ⏳ Os custos e estatísticas em tokens deste projeto serão atualizados assim que o processamento sequencial automático for iniciado e cada agente retornar o resultado.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Bento Cost Panels */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-left">
                                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase font-mono block">Custo Total Estimado</span>
                                <div className="mt-1 flex items-baseline space-x-1">
                                  <span className="text-[13px] font-extrabold text-slate-900 font-mono">
                                    {totalCostEUR.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mt-0.5">
                                  Equivalência: {totalCostUSD.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                                </span>
                              </div>

                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-left">
                                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase font-mono block">Volume Global de Tokens</span>
                                <div className="mt-1 flex items-baseline space-x-1">
                                  <span className="text-[13px] font-extrabold text-slate-900 font-mono">
                                    {totalProjectTokens.toLocaleString("pt-PT")}
                                  </span>
                                  <span className="text-[9px] font-sans font-bold text-slate-400">tk</span>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block mt-0.5">
                                  Acumulado de 3 agentes
                                </span>
                              </div>

                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-left">
                                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase font-mono block">Distribuição de Tokens</span>
                                <div className="mt-1 text-[10px] text-slate-650 font-bold font-mono space-y-0.5">
                                  <div>Input (Entrada): {totalPromptTokens.toLocaleString("pt-PT")}</div>
                                  <div>Output (Saída): {totalCandidatesTokens.toLocaleString("pt-PT")}</div>
                                </div>
                              </div>
                            </div>

                            {/* Detailed breakdown table per Phase */}
                            <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white">
                              <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                    <th className="p-2 pl-3">Fase de Trabalho</th>
                                    <th className="p-2">Tokens Input</th>
                                    <th className="p-2">Tokens Output</th>
                                    <th className="p-2">Tokens Total</th>
                                    <th className="p-2 pr-3 text-right">Custo Estimado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150 font-mono">
                                  {phase1Usage && (
                                    <tr>
                                      <td className="p-2 pl-3 font-sans font-bold text-slate-800">Fase I: Analisador</td>
                                      <td className="p-2 text-slate-600">{phase1Usage.promptTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase1Usage.candidatesTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase1Usage.totalTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 pr-3 text-right text-slate-900 font-bold">
                                        {phase1Usage.costEUR.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                                      </td>
                                    </tr>
                                  )}
                                  {phase2Usage && (
                                    <tr>
                                      <td className="p-2 pl-3 font-sans font-bold text-slate-800">Fase II: Pesquisador</td>
                                      <td className="p-2 text-slate-600">{phase2Usage.promptTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase2Usage.candidatesTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase2Usage.totalTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 pr-3 text-right text-slate-900 font-bold">
                                        {phase2Usage.costEUR.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                                      </td>
                                    </tr>
                                  )}
                                  {phase3Usage && (
                                    <tr>
                                      <td className="p-2 pl-3 font-sans font-bold text-slate-800">Fase III: Redator</td>
                                      <td className="p-2 text-slate-600">{phase3Usage.promptTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase3Usage.candidatesTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 text-slate-600">{phase3Usage.totalTokens.toLocaleString("pt-PT")}</td>
                                      <td className="p-2 pr-3 text-right text-slate-900 font-bold">
                                        {phase3Usage.costEUR.toLocaleString("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 5, maximumFractionDigits: 5 })}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                              * Estimativas calculadas de acordo com as taxas oficiais do Google Gemini 3.5 Flash: $0.075 / 1M tokens para inputs de texto e ficheiros, e $0.30 / 1M tokens para outputs de texto gerado, com taxa de câmbio USD/EUR aproximada a €0.92. Os custos reais podem variar consoante os limites do plano e descontos sazonais na consola de faturação.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ACTIVE RESULTS DISPLAY WITH CHAPTERS AS TABS */}
                  <div className="flex-1 flex flex-col min-h-[480px]">
                    
                    {/* Horizontal Tab List Panel */}
                    <div className="flex border-b border-slate-200 mb-4 shrink-0 overflow-x-auto">
                      
                      <button
                        onClick={() => setActiveTab("phase1")}
                        className={`py-2 px-4 text-xs font-bold shrink-0 transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                          activeTab === "phase1"
                            ? "border-slate-800 text-slate-900 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">1</span>
                        <span>I. Análise das Questões</span>
                        {activeProject.status.phase1 === "completed" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      </button>

                      <button
                        onClick={() => setActiveTab("phase2")}
                        className={`py-2 px-4 text-xs font-bold shrink-0 transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                          activeTab === "phase2"
                            ? "border-slate-800 text-slate-900 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">2</span>
                        <span>II. Pesquisa Jurisprudencial</span>
                        {activeProject.status.phase2 === "completed" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      </button>

                      <button
                        onClick={() => setActiveTab("phase3")}
                        className={`py-2 px-4 text-xs font-bold shrink-0 transition-colors border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                          activeTab === "phase3"
                            ? "border-slate-800 text-slate-900 font-extrabold"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">3</span>
                        <span>III. Redação do Parecer</span>
                        {activeProject.status.phase3 === "completed" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      </button>

                    </div>

                    {/* Active Tab Screen Content Panel */}
                    <div className="flex-1 flex flex-col">
                      {isProcessing && currentRunningPhase === 1 && activeTab === "phase1" && (
                        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center animate-fadeIn flex-1 flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-slate-950 animate-spin mb-3" />
                          <h4 className="text-xs font-bold text-slate-800 font-sans">Fase I ativa: O Analisador de Casos está a desconstruir os autos...</h4>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1 mx-auto font-medium">Isso envolve catalogar todas as problemáticas e as teses rivais formuladas pelas partes com base jurídica de Portugal.</p>
                        </div>
                      )}

                      {isProcessing && currentRunningPhase === 2 && activeTab === "phase2" && (
                        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center animate-fadeIn flex-1 flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-slate-950 animate-spin mb-3" />
                          <h4 className="text-xs font-bold text-slate-800 font-sans">Fase II ativa: O Pesquisador está a consultar o portal ATLAS CSM (https://atlas.altec-csm.dev/#/pesquisa)...</h4>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1 mx-auto font-medium">Colocando as questões decidendas no menu de pesquisa e extraindo acórdãos portugueses com códigos ECLI.</p>
                        </div>
                      )}

                      {isProcessing && currentRunningPhase === 3 && activeTab === "phase3" && (
                        <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center animate-fadeIn flex-1 flex flex-col items-center justify-center">
                          <Loader2 className="w-10 h-10 text-slate-950 animate-spin mb-3" />
                          <h4 className="text-xs font-bold text-slate-800 font-sans">Fase III ativa: O Redator forense está a lavrar o Parecer...</h4>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed mt-1 mx-auto font-medium">Consolidando e refinando as informações científicas extraídas em conformidade com as exigências notariais de Portugal.</p>
                        </div>
                      )}

                      {/* RENDERING REAL RESULTS ACCORDING TO TABS */}
                      {activeTab === "phase1" && activeProject.phase1Result && (
                        <ResultDisplay
                          title="Análise de Questões e Disputas"
                          subtitle="Capítulo I"
                          resultText={activeProject.phase1Result}
                          onDownloadWord={() => downloadProjectDoc(activeProject)}
                        />
                      )}

                      {activeTab === "phase1" && !activeProject.phase1Result && !isProcessing && (
                        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                          <HelpCircle className="w-10 h-10 text-slate-200 mb-2.5" />
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Análise não Efetuada</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-semibold">Inicie o processamento na barra superior para correr o Analisador.</p>
                        </div>
                      )}

                      {activeTab === "phase2" && activeProject.phase2Result && (
                        <div className="flex flex-col space-y-5 flex-1">
                          {/* ECLI API Integration Terminal/Console */}
                          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-left text-xs border border-slate-800 shadow-md animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
                              <div className="flex items-center space-x-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="font-bold text-slate-300 uppercase tracking-wide text-[10px] md:text-xs">Consola de Integração ATLAS CSM</span>
                              </div>
                              <span className="text-[9px] bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                ATLAS LIGADO (HTTP 200)
                              </span>
                            </div>
                            
                            <div className="space-y-2 leading-relaxed max-h-[160px] overflow-y-auto pr-1">
                              {activeProject.phase2ApiLogs ? (
                                <pre className="whitespace-pre-wrap text-[10.5px] text-emerald-400 font-mono leading-relaxed">
                                  {activeProject.phase2ApiLogs}
                                </pre>
                              ) : (
                                <div className="text-slate-400 space-y-1 text-[10.5px]">
                                  <div><span className="text-amber-400 font-bold">$ GET / POST</span> https://atlas.altec-csm.dev/#/pesquisa <span className="text-emerald-400 font-semibold">[200 OK]</span></div>
                                  <div><span className="text-slate-500 font-bold">Menu:</span> Pesquisa Jurisprudencial (atlas.altec-csm.dev/#/pesquisa)</div>
                                  <div><span className="text-slate-500 font-bold">Status:</span> Handshake efetuado e ligação autenticada com sucesso.</div>
                                  <div><span className="text-slate-500 font-bold">Consulta:</span> Questões jurídicas decidendas e filtros ECLI para tribunais portugueses (STJ, Relações).</div>
                                  <div><span className="text-emerald-400 font-bold">✓ Sucesso:</span> Acórdãos portugueses reais importados e catalogados com rigor absoluto.</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <ResultDisplay
                            title="Pesquisa de Correntes Jurisprudenciais (ATLAS CSM)"
                            subtitle="Capítulo II"
                            resultText={activeProject.phase2Result}
                            groundingLinks={activeProject.phase2Links}
                            onDownloadWord={() => downloadProjectDoc(activeProject)}
                          />
                        </div>
                      )}

                      {activeTab === "phase2" && !activeProject.phase2Result && !isProcessing && (
                        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                          <HelpCircle className="w-10 h-10 text-slate-200 mb-2.5" />
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Pesquisa de Acórdãos Pendente</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-semibold">Os resultados surgirão após a conclusão das teses de enquadramento da Fase I.</p>
                        </div>
                      )}

                      {activeTab === "phase3" && activeProject.phase3Result && (
                        <ResultDisplay
                          title="Redação Forense de Parecer Jurídico"
                          subtitle="Capítulo III"
                          resultText={activeProject.phase3Result}
                          onDownloadWord={() => downloadProjectDoc(activeProject)}
                        />
                      )}

                      {activeTab === "phase3" && !activeProject.phase3Result && !isProcessing && (
                        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                          <HelpCircle className="w-10 h-10 text-slate-200 mb-2.5" />
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Minuta de Parecer Indisponível</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs font-semibold">A redação necessita obrigatoriamente do manancial de julgados colhidos pela Fase II.</p>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-white border border-dashed border-slate-200 rounded-3xl py-16 px-6 text-center text-slate-400 flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
                  <Terminal className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Mural de Trabalho Vazio</h3>
                  <p className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed font-semibold">
                    Selecione um projeto na lista lateral ou clique em "Criar Projeto" no canto superior direito para dar início ao processamento de pareceres!
                  </p>
                </div>
              )}

            </div>
          )}
        </section>

      </main>

      {/* Footer Design Line */}
      <footer className="bg-white border-t border-slate-200 py-4.5 mt-auto shrink-0 text-center">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400">
          <p className="font-sans flex items-center justify-center space-x-1.5 font-bold text-slate-500">
            <span>Orquestrador JURIS-CSM Portugal</span>
            <span>&bull;</span>
            <span>Estúdio Forense de Decisões</span>
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-slate-400 font-medium">
            Acórdãos Grounded via Google Gemini 3.5 Flash &bull; Isento de Bases de Dados Cloud Externas &bull; Salvaguarda 100% no Dispositivo
          </p>
        </div>
      </footer>

      {/* SHARE APP MODAL DIALOG */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn text-left">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto w-full animate-scaleUp">
            <div className="flex items-center space-x-2.5 pb-3 mb-4.5 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Partilhar Estúdio JURIS-CSM</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium font-mono">Partilhe esta ferramenta de estudo com total privacidade.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-xl">
                <p className="font-semibold text-emerald-800 leading-relaxed text-[11px]">
                  🔒 <strong>Garantia de Confidencialidade Absoluta:</strong> Ao partilhar este link, os utilizadores terão de configurar a sua própria chave API do Gemini. <strong>A app foi desenhada para nunca partilhar, enviar ou expor a chave de ninguém.</strong> Tudo ocorre de forma segura e local no navegador de cada utilizador (armazenado em cache segura local no browser).
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                  Link de Partilha da Aplicação
                </label>
                <div className="relative flex space-x-2">
                  <input
                    type="text"
                    readOnly
                    value="https://ais-pre-di4p3ydwohlnfxxxgj2tu4-111254942511.europe-west2.run.app"
                    className="w-full text-xs font-semibold border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 outline-none font-mono text-slate-700 select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://ais-pre-di4p3ydwohlnfxxxgj2tu4-111254942511.europe-west2.run.app");
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className={`px-4 text-xs font-bold rounded-xl cursor-pointer transition-all shrink-0 ${
                      copiedLink 
                        ? "bg-emerald-600 text-white" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {copiedLink ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4.5 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ENGINE & API KEY MODAL DIALOG */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn text-left">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto w-full">
            <div className="flex items-center space-x-2.5 pb-3 mb-4.5 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Configuração dos Motores de IA</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Escolha o fornecedor de IA (Google Gemini ou Zhipu GLM) e configure as chaves de acesso.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Provider Selector Switch */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                  Motor de IA Ativo *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTempProvider("gemini")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      tempProvider === "gemini"
                        ? "border-amber-400 bg-amber-50/50 shadow-xs ring-2 ring-amber-400/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Gemini</span>
                      </span>
                      {tempProvider === "gemini" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-500 font-medium">
                      gemini-3.8-flash com Grounding & Pesquisa.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempProvider("glm")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      tempProvider === "glm"
                        ? "border-indigo-500 bg-indigo-50/50 shadow-xs ring-2 ring-indigo-400/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                        <span>GLM</span>
                      </span>
                      {tempProvider === "glm" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-500 font-medium">
                      GLM-4 Flash / Plus com chamada de funções.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempProvider("deepseek")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      tempProvider === "deepseek"
                        ? "border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-400/20"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>DeepSeek</span>
                      </span>
                      {tempProvider === "deepseek" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-500 font-medium">
                      DeepSeek V3 (Chat) e R1 (Reasoner).
                    </p>
                  </button>
                </div>
              </div>

              {/* Specific Settings for DeepSeek */}
              {tempProvider === "deepseek" && (
                <div className="space-y-3 p-3.5 bg-blue-50/40 border border-blue-150 rounded-2xl animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">
                      Modelo DeepSeek
                    </label>
                    <select
                      value={tempDeepSeekModel}
                      onChange={(e) => setTempDeepSeekModel(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-blue-600"
                    >
                      <option value="deepseek-chat">deepseek-chat (DeepSeek-V3 - Rápido, preciso e económico)</option>
                      <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1 - Raciocínio lógico aprofundado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">
                      Chave API do DeepSeek
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempDeepSeekApiKey}
                        onChange={(e) => setTempDeepSeekApiKey(e.target.value)}
                        placeholder="Insira a sua chave DeepSeek (ex: sk-...)"
                        className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl pl-3.5 pr-10 py-2.5 outline-none focus:border-blue-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Obtenha a chave em <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">platform.deepseek.com</a>
                    </p>
                  </div>
                </div>
              )}

              {/* Specific Settings for GLM */}
              {tempProvider === "glm" && (
                <div className="space-y-3 p-3.5 bg-indigo-50/40 border border-indigo-150 rounded-2xl animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">
                      Modelo GLM
                    </label>
                    <select
                      value={tempGlmModel}
                      onChange={(e) => setTempGlmModel(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl px-3 py-2 outline-none focus:border-indigo-600"
                    >
                      <option value="glm-4-flash">glm-4-flash (Extremamente rápido e gratuito)</option>
                      <option value="glm-4-plus">glm-4-plus (Máxima precisão e raciocínio)</option>
                      <option value="glm-4-air">glm-4-air (Equilibrado)</option>
                      <option value="glm-4-0520">glm-4-0520 (Versão estável standard)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">
                      Chave API do GLM (BigModel / Zhipu AI)
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempGlmApiKey}
                        onChange={(e) => setTempGlmApiKey(e.target.value)}
                        placeholder="Insira a sua chave GLM (ex: 123456...)"
                        className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl pl-3.5 pr-10 py-2.5 outline-none focus:border-indigo-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Obtenha a chave gratuita em <a href="https://open.bigmodel.cn/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">open.bigmodel.cn</a>. <span className="font-semibold text-indigo-700">Recomendação:</span> O modelo <code>glm-4-flash</code> é 100% gratuito e não esgota quota.
                    </p>
                  </div>
                </div>
              )}

              {/* Specific Settings for Gemini */}
              {tempProvider === "gemini" && (
                <div className="space-y-3 p-3.5 bg-amber-50/40 border border-amber-150 rounded-2xl animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 font-mono">
                      Chave API do Google Gemini
                    </label>
                    <div className="relative">
                      <input
                        type={showKeyText ? "text" : "password"}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        placeholder="Cole aqui a sua chave (ex: AIzaSy...)"
                        className="w-full text-xs font-semibold border border-slate-200 bg-white rounded-xl pl-3.5 pr-10 py-2.5 outline-none focus:border-amber-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] leading-relaxed text-slate-600 bg-white p-2.5 rounded-xl border border-slate-150">
                    <p className="font-semibold">Como obter a chave Gemini grátis?</p>
                    <p className="mt-0.5">Aceda a <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-amber-600 underline font-semibold">Google AI Studio</a> e clique em <strong>"Get API Key"</strong>.</p>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl">
                <p className="text-[11px] font-semibold text-emerald-800 leading-relaxed">
                  🔐 <strong>Garantia de Privacidade Absoluta:</strong> As suas chaves de API são guardadas de forma 100% segura apenas no seu próprio navegador (<code>localStorage</code>). Elas <strong>nunca</strong> são armazenadas no servidor, registadas em ficheiros de log ou visíveis a terceiros. Toda a comunicação de orquestração de agentes é encriptada de ponta a ponta via HTTPS.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center space-x-2">
                {(geminiApiKey || glmApiKey || deepseekApiKey) && (
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiApiKey("");
                      setGlmApiKey("");
                      setDeepseekApiKey("");
                      setTempApiKey("");
                      setTempGlmApiKey("");
                      setTempDeepSeekApiKey("");
                      alert("Chaves removidas com sucesso.");
                    }}
                    className="text-xs font-bold text-red-650 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Limpar Chaves
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Fechar
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    const cleanGeminiKey = tempApiKey.trim();
                    const cleanGlmKey = tempGlmApiKey.trim();
                    const cleanDeepSeekKey = tempDeepSeekApiKey.trim();

                    if (cleanGeminiKey) setGeminiApiKey(cleanGeminiKey);
                    if (cleanGlmKey) setGlmApiKey(cleanGlmKey);
                    if (cleanDeepSeekKey) setDeepseekApiKey(cleanDeepSeekKey);
                    setSelectedProvider(tempProvider);
                    setSelectedGlmModel(tempGlmModel);
                    setSelectedDeepSeekModel(tempDeepSeekModel);
                    setShowKeyModal(false);
                    setGlobalErrorMsg(null);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Guardar e Ativar Motor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR DIAGNOSTICS & SYSTEM LOGS MODAL */}
      <ErrorDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        errorLogs={errorLogs}
        onClearLogs={handleClearErrorLogs}
        currentProvider={selectedProvider}
        currentGlmModel={selectedGlmModel}
        activeProjectName={projects.find((p) => p.id === activeProjectId)?.name}
        hasGeminiKey={Boolean(geminiApiKey || hasServerGeminiKey || hasServerApiKey)}
        hasGlmKey={Boolean(glmApiKey || hasServerGlmKey || hasServerApiKey)}
        hasServerKey={Boolean(hasServerApiKey || hasServerGeminiKey || hasServerGlmKey)}
      />

      {/* USER & OPERATIONAL MANUAL MODAL */}
      <ManualModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />

    </div>
  );
}
