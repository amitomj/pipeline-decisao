import { useState } from "react";
import Markdown from "react-markdown";
import { Copy, Check, FileText, ExternalLink, Sparkles } from "lucide-react";

interface ResultDisplayProps {
  title: string;
  resultText: string;
  subtitle?: string;
  groundingLinks?: { title: string; uri: string }[];
  onDownloadWord?: () => void;
}

// Helper to automatically convert standalone URLs (like CSM/ECLI links) to clickable Markdown links if they aren't already formatted.
function makeStandaloneUrlsClickable(text: string): string {
  if (!text) return "";
  
  // Matches any valid markdown link [text](url) as group 1, OR standalone HTTP/HTTPS url as group 2
  const mdLinkOrUrlRegex = /(\[[^\]]*\]\([^)]*\))|(https?:\/\/[^\s()<>[\]"]+)/g;
  
  return text.replace(mdLinkOrUrlRegex, (match, mdLink, url) => {
    // If it's already a markdown link, return it untouched
    if (mdLink) {
      let cleanedMdLink = mdLink;
      if (mdLink.includes("jurisprudencia.csm.org.pt") || mdLink.includes("atlas.altec-csm.dev")) {
        // Replace trailing slash in markdown link URL e.g. (https://.../) -> (https://...)
        const urlPartMatch = mdLink.match(/\((https?:\/\/[^\s)]+)\)/);
        if (urlPartMatch && urlPartMatch[1]) {
          const urlPart = urlPartMatch[1];
          if (urlPart.endsWith("/") && !urlPart.endsWith("/#/")) {
            const cleanedUrlPart = urlPart.slice(0, -1);
            cleanedMdLink = mdLink.replace(urlPart, cleanedUrlPart);
          }
        }
      }
      return cleanedMdLink;
    }
    
    // If it's a standalone URL, format it as a markdown link
    if (url) {
      // Capture trailing punctuation
      let cleanedUrl = url;
      let trailingPunctuation = "";
      const lastChars = /[.,;:!?)]+$/;
      const puncMatch = url.match(lastChars);
      if (puncMatch) {
        trailingPunctuation = puncMatch[0];
        cleanedUrl = url.substring(0, url.length - trailingPunctuation.length);
      }
      
      if ((cleanedUrl.includes("jurisprudencia.csm.org.pt") || cleanedUrl.includes("atlas.altec-csm.dev")) && cleanedUrl.endsWith("/") && !cleanedUrl.endsWith("/#/")) {
        cleanedUrl = cleanedUrl.slice(0, -1);
      }
      
      return `[${cleanedUrl}](${cleanedUrl})${trailingPunctuation}`;
    }
    
    return match;
  });
}

export default function ResultDisplay({
  title,
  resultText,
  subtitle = "Resultados da IA",
  groundingLinks,
  onDownloadWord,
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Erro ao copiar texto:", e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col h-full text-left">
      {/* Header bar */}
      <div className="bg-slate-50 border-b border-slate-150 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1 px-2 rounded-md bg-slate-900 text-amber-400 text-[10px] font-bold font-mono uppercase">
            {subtitle}
          </div>
          <span className="text-xs font-bold text-slate-700">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-2 ml-auto sm:ml-0">
          {onDownloadWord && (
            <button
              onClick={onDownloadWord}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer active:scale-95 shadow-sm"
              title="Descarregar toda a análise consolidada estruturada em capítulos no Microsoft Word"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Descarregar Word (.docx)</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copiar Texto</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main core result text */}
      <div className="p-5 overflow-y-auto flex-1 text-left select-text scrollbar-thin max-h-[480px]">
        <div className="text-[10px] text-slate-400 font-mono mb-3.5 border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span>{`$ orquestrador_juris_csm: "${title}"`}</span>
          <span>{resultText.length} carateres</span>
        </div>
        
        <div className="markdown-body text-xs sm:text-sm space-y-4 prose prose-slate max-w-none leading-relaxed">
          <Markdown
            components={{
              a: ({ node, ...props }) => {
                const href = props.href || "";
                const isCsm = href.includes("jurisprudencia.csm.org.pt") || href.includes("atlas.altec-csm.dev");
                let fallbackUrl = "";
                let processNum = "";

                if (isCsm) {
                  // Clean trailing slashes (except hash root)
                  let cleanedHref = href;
                  if (cleanedHref.endsWith("/") && !cleanedHref.endsWith("/#/")) {
                    cleanedHref = cleanedHref.slice(0, -1);
                  }

                  // Use our Express server-side redirect proxy to bypass hash-character limitations and iframe restrictions!
                  const ecliMatch = cleanedHref.match(/ECLI:[A-Za-z0-9:.]+/i);
                  if (ecliMatch) {
                    props.href = `/api/redirect/${ecliMatch[0]}`;
                  } else {
                    props.href = cleanedHref;
                  }

                  // Extract process number from ECLI
                  const match = cleanedHref.match(/ECLI:[A-Z:]+:[0-9]+:([A-Za-z0-9.]+)/i);
                  if (match && match[1]) {
                    let proc = match[1];
                    // "1007.19.0T8MGR.C1" -> "1007/19.0T8MGR"
                    proc = proc.replace(/^([0-9]+)\.([0-9]{2})\./, '$1/$2.');
                    // Strip relations/supreme suffixes like .C1, .S1, .L1 etc.
                    const cleanProc = proc.replace(/\.[A-Z][0-9]$/, '');
                    processNum = cleanProc;
                    fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${cleanProc}" dgsi`)}`;
                  }
                }

                return (
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <a
                      {...props}
                      className="text-blue-600 hover:text-blue-800 font-bold underline decoration-blue-300 decoration-1 hover:decoration-blue-700 underline-offset-3 hover:translate-x-0.5 transition-all inline-flex items-center gap-0.5 break-all cursor-pointer"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                    {isCsm && fallbackUrl && (
                      <a
                        href={fallbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer"
                        title={`Se o link ECLI der erro 404, clique aqui para pesquisar o processo "${processNum}" no Google/DGSI`}
                      >
                        <span className="font-bold">Se 404:</span> Pesquisar DGSI
                        <ExternalLink className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      </a>
                    )}
                  </span>
                );
              }
            }}
          >
            {makeStandaloneUrlsClickable(resultText)}
          </Markdown>
        </div>

        {/* Display grounding links if returned (Real-time searches via Google Grounding) */}
        {groundingLinks && groundingLinks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-150">
            <h5 className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Fontes reais consultadas no Google Grounding
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groundingLinks.map((link, idx) => {
                let uri = link.uri;
                const isCsm = uri.includes("jurisprudencia.csm.org.pt");
                let fallbackUrl = "";
                let processNum = "";

                if (isCsm) {
                  if (uri.endsWith("/")) {
                    uri = uri.slice(0, -1);
                  }
                  const match = uri.match(/ECLI:[A-Z:]+:[0-9]+:([A-Za-z0-9.]+)/i);
                  if (match && match[1]) {
                    let proc = match[1];
                    proc = proc.replace(/^([0-9]+)\.([0-9]{2})\./, '$1/$2.');
                    const cleanProc = proc.replace(/\.[A-Z][0-9]$/, '');
                    processNum = cleanProc;
                    fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${cleanProc}" dgsi`)}`;
                  }
                }

                return (
                  <div key={idx} className="flex flex-col gap-1.5 bg-slate-50 border border-slate-250 p-2.5 rounded-xl">
                    <a
                      href={uri}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="flex items-start space-x-2 hover:bg-slate-100 transition-all group shrink-0"
                      title={link.title}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 truncate leading-snug">{link.title}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{uri}</p>
                      </div>
                    </a>
                    {isCsm && fallbackUrl && (
                      <a
                        href={fallbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-250 text-[9px] py-1 rounded-lg font-semibold transition-colors cursor-pointer w-full mt-1"
                        title={`Se o link ECLI der erro 404, pesquise o processo "${processNum}" no Google/DGSI`}
                      >
                        <span className="font-bold">Se ECLI der 404:</span> Pesquisar no DGSI/Google
                        <ExternalLink className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
