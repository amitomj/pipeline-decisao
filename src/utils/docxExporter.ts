import { Project } from "../types";

/**
 * Converts rich markdown strings into clean, styled inline HTML optimized for Microsoft Word processing.
 */
function markdownToWordHtml(md: string): string {
  if (!md) return `<p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #888; font-style: italic;">Fase não realizada ou sem conteúdo gerado.</p>`;

  // Intercept and rewrite any ATLAS CSM Single Page App hash links to use our server-side redirect proxy,
  // which bypasses Word's hash character hyperlink bug and works 100% of the time in downloaded docs and PDFs!
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let working = md;
  if (origin) {
    working = working.replace(/https:\/\/atlas\.altec-csm\.dev\/#\/decisao\/(ECLI:[A-Za-z0-9:.]+)/gi, (m, ecli) => {
      return `${origin}/api/redirect/${ecli}`;
    });
  }

  // Escaping raw entities to prevent broken templates
  working = working
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format code blocks first
  working = working.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre style="background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 10px; font-family: 'Consolas', 'Courier New', monospace; font-size: 10pt; margin-bottom: 12pt; white-space: pre-wrap;">${code}</pre>`;
  });

  // Headers (H3, H2, H1)
  working = working.replace(/^### (.*$)/gim, '<h3 style="font-family: Calibri, Arial, sans-serif; font-size: 13pt; color: #2d3748; margin-top: 14pt; margin-bottom: 5pt; font-weight: bold;">$1</h3>');
  working = working.replace(/^## (.*$)/gim, '<h2 style="font-family: Calibri, Arial, sans-serif; font-size: 15pt; color: #1a365d; margin-top: 18pt; margin-bottom: 8pt; font-weight: bold; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">$1</h2>');
  working = working.replace(/^# (.*$)/gim, '<h1 style="font-family: Calibri, Arial, sans-serif; font-size: 18pt; color: #0f172a; margin-top: 22pt; margin-bottom: 10pt; font-weight: bold;">$1</h1>');

  // Bold / Italic
  working = working.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  working = working.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Inline Mono Font
  working = working.replace(/`([^`]+)`/g, '<code style="font-family: \'Consolas\', \'Courier New\', monospace; background-color: #f1f5f9; padding: 1px 3px; font-size: 9.5pt; color: #0f172a;">$1</code>');

  // Convert markdown links [Text](Url) and naked HTTP/HTTPS URLs into real clickable MS Word hyperlinks
  working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[a-zA-Z0-9-._~:\/?#\[\]@!$&'()*+,;=%]+)/g, (match, mdText, mdUrl, rawUrl) => {
    if (mdUrl) {
      return `<a href="${mdUrl}" style="color: #2563eb; text-decoration: underline;">${mdText}</a>`;
    } else if (rawUrl) {
      // Decode any escaped HTML entities like &amp; to protect the actual URL destination query params
      const decodedUrl = rawUrl.replace(/&amp;/g, "&");
      let cleanUrl = decodedUrl;
      let trailing = "";
      // Strip trailing sentence punctuation
      const lastChar = cleanUrl.slice(-1);
      if (lastChar === "." || lastChar === "," || lastChar === ";" || lastChar === ")") {
        cleanUrl = cleanUrl.slice(0, -1);
        trailing = lastChar;
      }
      return `<a href="${cleanUrl}" style="color: #2563eb; text-decoration: underline;">${cleanUrl}</a>${trailing}`;
    }
    return match;
  });

  // Blockquotes
  working = working.replace(/^&gt;[ \t]?(.*$)/gim, '<blockquote style="border-left: 3px solid #64748b; padding-left: 12px; margin-left: 0; margin-top: 8pt; margin-bottom: 8pt; color: #475569; font-style: italic;">$1</blockquote>');

  const lines = working.split("\n");
  const processedLines: string[] = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Divider Line
    if (trimmed === "---") {
      processedLines.push('<hr style="border: none; border-top: 1px solid #cbd5e1; margin-top: 16pt; margin-bottom: 16pt;" />');
      continue;
    }

    // Checking for list tags
    const isBulletItem = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ");
    if (isBulletItem) {
      if (!inList) {
        processedLines.push('<ul style="margin-top: 6pt; margin-bottom: 6pt; padding-left: 20px; list-style-type: square;">');
        inList = true;
      }
      const itemText = trimmed.replace(/^[-*+]\s+/, "");
      processedLines.push(`<li style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin-bottom: 3pt;">${itemText}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }

      // Check if the line is already parsed into a header, pre block, blockquote or is empty
      const skipParagraphWrap = 
        trimmed.startsWith("<h") || 
        trimmed.startsWith("<blockquote") || 
        trimmed.startsWith("<pre") || 
        trimmed.startsWith("<code") || 
        trimmed.startsWith("<hr") || 
        trimmed.startsWith("<ul") || 
        trimmed.startsWith("</ul") || 
        trimmed === "";

      if (skipParagraphWrap) {
        processedLines.push(line);
      } else {
        processedLines.push(`<p style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; text-align: justify; margin-top: 0; margin-bottom: 8pt;">${line}</p>`);
      }
    }
  }

  if (inList) {
    processedLines.push("</ul>");
  }

  return processedLines.join("\n");
}

/**
 * Surgically removes any headings and contents under "Referências Oficiais e Ligações do CSM / DGSI" or similar chapters.
 */
function stripReferencesChapter(md: string): string {
  if (!md) return md;
  
  const lines = md.split("\n");
  const output: string[] = [];
  let inSkippedSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect headers related to standard reference links or CSM/DGSI connection chapters
    if (trimmed.startsWith("#") && (
      trimmed.toLowerCase().includes("referências oficiais") || 
      trimmed.toLowerCase().includes("ligações do csm") ||
      trimmed.toLowerCase().includes("ligações do csm / dgsi") ||
      trimmed.toLowerCase().includes("referências oficiais e ligações")
    )) {
      inSkippedSection = true;
      continue;
    }

    // If we meet another header that is not a reference/DGSI link heading, we resume outputting
    if (inSkippedSection && trimmed.startsWith("#")) {
      if (!(
        trimmed.toLowerCase().includes("referências oficiais") || 
        trimmed.toLowerCase().includes("ligações do csm") ||
        trimmed.toLowerCase().includes("ligações do csm / dgsi") ||
        trimmed.toLowerCase().includes("referências oficiais e ligações")
      )) {
        inSkippedSection = false;
      }
    }

    if (!inSkippedSection) {
      output.push(line);
    }
  }

  return output.join("\n");
}

/**
 * Packs the whole project workspace outputs (three sequential agent results)
 * into a highly professional Word template format and triggers the browser download.
 */
export function downloadProjectDoc(project: Project) {
  const p1Html = markdownToWordHtml(stripReferencesChapter(project.phase1Result || ""));
  const p2Html = markdownToWordHtml(stripReferencesChapter(project.phase2Result || ""));
  const p3Html = markdownToWordHtml(stripReferencesChapter(project.phase3Result || ""));

  const currentDateStr = new Date(project.createdAt).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mhtmlWordFormat = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${project.name}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 21.0cm 29.7cm; /* Standard A4 Size */
          margin: 2.5cm 2.5cm 2.5cm 2.5cm;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        body {
          font-family: "Calibri", "Arial", "sans-serif";
          font-size: 11pt;
          line-height: 1.5;
          color: #1e293b;
          background-color: #ffffff;
        }
        h1, h2, h3, h4, th {
          font-family: "Calibri", "Arial", "sans-serif";
          color: #1e3a8a;
          font-weight: bold;
        }
        .text-center {
          text-align: center;
        }
        .page-break {
          page-break-before: always;
          clear: both;
        }
        .cover-page {
          text-align: center;
          padding-top: 150pt;
        }
      </style>
    </head>
    <body>
      
      <!-- CÓDIGO DA CAPA FORMAL -->
      <div class="cover-page">
        <p style="font-size: 13pt; font-weight: bold; color: #475569; letter-spacing: 2.5px; text-transform: uppercase;">Conselho Superior da Magistratura &bull; Portugal</p>
        <p style="font-size: 11pt; color: #64748b; font-weight: 500;">Orquestração Jurídica Tríplice Automatizada</p>
        
        <div style="margin-top: 120pt; margin-bottom: 90pt;">
          <h1 style="font-size: 28pt; color: #1e3a8a; margin-bottom: 20pt; font-weight: 800; line-height: 1.2;">PARECER JURÍDICO INTEGRAL</h1>
          <p style="font-size: 16pt; font-weight: bold; color: #334155; font-style: italic;">Caso: ${project.name}</p>
        </div>
        
        <div style="margin-top: 150pt; font-size: 10.5pt; color: #64748b; line-height: 1.6;">
          <p><strong>Elaboração:</strong> Orquestrador Autónomo JURIS-CSM</p>
          <p><strong>Data de Registo:</strong> ${currentDateStr}</p>
          <p><strong>Local de Processamento:</strong> Estúdio de Decisões do AI Studio</p>
          <p style="margin-top: 30pt; font-size: 8.5pt; font-style: italic; color: #94a3b8;">Documento técnico oficial. As referências legislativas e jurisprudenciais foram colhidas com grounding em tempo real.</p>
        </div>
      </div>

      <!-- QUEBRA PARA O CAPÍTULO I -->
      <div class="page-break"></div>

      <!-- CAPÍTULO I -->
      <div>
        <h1 style="font-size: 20pt; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-top: 0; margin-bottom: 15pt; font-weight: bold;">Capítulo I: Análise das Questões Jurídicas</h1>
        <p style="font-size: 10pt; color: #64748b; font-style: italic; margin-bottom: 15pt; border-left: 2px solid #e2e8f0; padding-left: 8px;">Análise formal elaborada de forma autónoma pelo Agente 1 (Analisador de Casos).</p>
        <div style="margin-top: 15pt;">
          ${p1Html}
        </div>
      </div>

      <!-- QUEBRA PARA O CAPÍTULO II -->
      <div class="page-break"></div>

      <!-- CAPÍTULO II -->
      <div>
        <h1 style="font-size: 20pt; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-top: 0; margin-bottom: 15pt; font-weight: bold;">Capítulo II: Pesquisa de Jurisprudência</h1>
        <p style="font-size: 10pt; color: #64748b; font-style: italic; margin-bottom: 15pt; border-left: 2px solid #e2e8f0; padding-left: 8px;">Acórdãos reais e correntes de julgamento obtidos pelo Agente 2 (Pesquisador Grounded).</p>
        <div style="margin-top: 15pt;">
          ${p2Html}
        </div>
        
      </div>

      <!-- QUEBRA PARA O CAPÍTULO III -->
      <div class="page-break"></div>

      <!-- CAPÍTULO III -->
      <div>
        <h1 style="font-size: 20pt; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; margin-top: 0; margin-bottom: 15pt; font-weight: bold;">Capítulo III: Redação do Parecer</h1>
        <p style="font-size: 10pt; color: #64748b; font-style: italic; margin-bottom: 15pt; border-left: 2px solid #e2e8f0; padding-left: 8px;">Nota doutrinal e conclusões de aplicabilidade redigidas pelo Agente 3 (Sintetizador e Redator).</p>
        <div style="margin-top: 15pt;">
          ${p3Html}
        </div>
      </div>

      <!-- ENCERRAMENTO -->
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 40pt; margin-bottom: 10pt;" />
      <p style="font-size: 8.5pt; color: #94a3b8; text-align: center; font-style: italic;">
        Parecer gerado pelo Estúdio Orqueestrador JURIS-CSM. Portugal &bull; Termos e referências em total respeito com as diretrizes do Conselho Superior da Magistratura.
      </p>

    </body>
    </html>
  `;

  // Create standard Office document download
  const blob = new Blob(["\ufeff" + mhtmlWordFormat], {
    type: "application/msword;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  
  const safeFilename = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  downloadAnchor.download = `parecer_${safeFilename}_completo.doc`;
  
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(url);
}
