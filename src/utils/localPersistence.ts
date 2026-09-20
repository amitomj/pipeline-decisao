import { Project } from "../types";

const LOCAL_PROJECTS_KEY = "juris_orquestrador_projects_v2";

// Robust in-memory fallback to support restrictive sandbox iframes, private windows, and cookie-blocked environments
let inMemoryProjects: Project[] = [];
let isStorageAvailable = false;

try {
  if (typeof window !== "undefined" && window.localStorage) {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isStorageAvailable = true;
  }
} catch (e) {
  console.warn("LocalStorage está bloqueado ou indisponível nesta plataforma. Ativando cache em memória para salvaguarda de sessão.");
  isStorageAvailable = false;
}

/**
 * Gets all saved projects from LocalStorage or the in-memory fallback block.
 */
export function getLocalProjects(): Project[] {
  if (!isStorageAvailable) {
    return [...inMemoryProjects];
  }
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    inMemoryProjects = parsed; // Sync memory representation
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar os projetos no LocalStorage:", e);
    return [...inMemoryProjects];
  }
}

/**
 * Saves all projects to LocalStorage or the in-memory fallback block.
 */
export function saveLocalProjects(projects: Project[]) {
  inMemoryProjects = [...projects]; // Always sync the memory fallback
  if (!isStorageAvailable) {
    return;
  }
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e: any) {
    console.error("Erro ao gravar os projetos no LocalStorage:", e);
    // Handle QuotaExceededError (typically 5MB limit in browsers)
    const isQuotaExceeded = e.name === "QuotaExceededError" || 
                            e.code === 22 || 
                            e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
                            e.message?.toLowerCase().includes("quota") ||
                            e.message?.toLowerCase().includes("exceeded") ||
                            e.message?.toLowerCase().includes("limit");

    if (isQuotaExceeded) {
      console.warn("Quota total de LocalStorage excedida! Iniciando purga automática de arquivos pesados (base64) para preservar resultados...");
      
      // Optimize: Strip base64 file data from ALL projects
      const optimized = projects.map((p) => ({
        ...p,
        files: p.files.map((f) => ({ ...f, contentBase64: "" }))
      }));

      try {
        localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(optimized));
        console.log("Projetos gravados com sucesso no LocalStorage após remoção preventiva de base64.");
        // Mutate original array elements to keep in-memory sync
        projects.forEach((p) => {
          p.files = p.files.map((f) => ({ ...f, contentBase64: "" }));
        });
        inMemoryProjects = optimized;
      } catch (innerErr) {
        console.error("Não foi possível gravar os projetos mesmo após purga extrema de base64:", innerErr);
      }
    }
  }
}

/**
 * Saves or updates a single project.
 */
export function upsertLocalProject(project: Project): Project[] {
  try {
    const list = getLocalProjects();
    const index = list.findIndex((p) => p.id === project.id);
    if (index > -1) {
      list[index] = { ...project };
    } else {
      list.unshift({ ...project }); // Place on top
    }
    saveLocalProjects(list);
    return list;
  } catch (e) {
    console.error("Erro ao atualizar o projeto no LocalStorage:", e);
    return getLocalProjects();
  }
}

/**
 * Deletes a project by ID and returns the updated list.
 */
export function deleteLocalProject(id: string): Project[] {
  try {
    const list = getLocalProjects();
    const updated = list.filter((p) => p.id !== id);
    saveLocalProjects(updated);
    return updated;
  } catch (e) {
    console.error("Erro ao remover o projeto do LocalStorage:", e);
    return getLocalProjects();
  }
}

/**
 * Triggers a browser download of the full projects list as a JSON workspace file.
 */
export function exportWorkspaceAsJSON(projects: Project[] = getLocalProjects(), workspaceName?: string) {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement("a");
    const name = workspaceName ? workspaceName.replace(/[^a-z0-9]/gi, "_").toLowerCase() : "orquestrador_juris";
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workspace_${name}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    console.error("Falha ao exportar workspace JSON:", e);
    alert("Ocorreu um erro ao exportar o ficheiro JSON de salvaguarda.");
  }
}

/**
 * Parses and validates an uploaded workspace JSON string, merging / replacing into LocalStorage.
 */
export function importWorkspaceFromJSON(jsonString: string): Project[] {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error("O ficheiro JSON deve conter uma lista ordenada de projetos.");
    }

    // Validate structure of a few key fields
    const validated: Project[] = parsed.filter((item: any) => {
      return item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" && typeof item.status === "object";
    });

    if (validated.length === 0 && parsed.length > 0) {
      throw new Error("Nenhum projeto válido detetado na estrutura do ficheiro.");
    }

    // Merge with current (to avoid overwrite loss, or replace if user wants)
    const current = getLocalProjects();
    const merged = [...validated];
    
    // Add any current items that are NOT in the imported list to prevent losing them
    current.forEach((currProj) => {
      if (!merged.some((m) => m.id === currProj.id)) {
        merged.push(currProj);
      }
    });

    saveLocalProjects(merged);
    return merged;
  } catch (e: any) {
    console.error("Falha ao importar o workspace:", e);
    throw new Error(e.message || "Ficheiro JSON corrompido ou em formato inválido para o Orquestrador Juris.");
  }
}
