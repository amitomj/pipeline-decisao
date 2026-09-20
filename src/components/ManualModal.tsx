import { useState } from "react";
import { 
  X, 
  Download, 
  Scale, 
  Layers, 
  Compass, 
  Sparkles, 
  Settings, 
  BookOpen, 
  HelpCircle, 
  Cpu, 
  FileText, 
  AlertTriangle, 
  ArrowRight,
  Printer,
  ChevronRight,
  CheckCircle2,
  Bug,
  Zap
} from "lucide-react";

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChapterId = "introduction" | "agents" | "workflows" | "atlas" | "engines" | "troubleshooting";

export default function ManualModal({ isOpen, onClose }: ManualModalProps) {
  const [activeChapter, setActiveChapter] = useState<ChapterId>("introduction");

  if (!isOpen) return null;

  // Manual Export to PDF Handler via beautiful print-friendly new tab with auto-print
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups para descarregar o manual em formato PDF.");
      return;
    }

    const currentYear = new Date().getFullYear();

    // Compiled styled A4 Document optimized for PDF generation using browser print-to-pdf engine
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="utf-8">
        <title>Manual do Utilizador - Orquestrador JURIS-CSM</title>
        <style>
          @page {
            size: A4;
            margin: 2.5cm;
          }
          @media print {
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #1e293b;
              background-color: #ffffff;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-before: always;
              clear: both;
            }
          }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2.5cm;
          }
          /* Cover Page Styles */
          .cover {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100vh;
            box-sizing: border-box;
            padding-top: 100px;
            padding-bottom: 50px;
            page-break-after: always;
          }
          .cover-header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 20px;
          }
          .cover-sub {
            font-size: 13pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
            margin: 0 0 10px 0;
          }
          .cover-title {
            font-size: 28pt;
            color: #0f172a;
            font-weight: 800;
            margin: 0;
            line-height: 1.2;
          }
          .cover-middle {
            margin: 80px 0;
          }
          .cover-desc {
            font-size: 14pt;
            color: #334155;
            font-style: italic;
            max-width: 600px;
            line-height: 1.5;
          }
          .cover-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 10pt;
            color: #64748b;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          /* Typography & Layout elements */
          h1 {
            font-size: 20pt;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 40px;
            margin-bottom: 20px;
            font-weight: 700;
          }
          h2 {
            font-size: 14pt;
            color: #1e3a8a;
            margin-top: 30px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          h3 {
            font-size: 11pt;
            color: #0f172a;
            margin-top: 20px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          p {
            margin-top: 0;
            margin-bottom: 12px;
            text-align: justify;
          }
          ul, ol {
            margin-top: 0;
            margin-bottom: 15px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 6px;
          }
          /* Visual Cards/Boxes */
          .alert-box {
            background-color: #f8fafc;
            border-left: 4px solid #64748b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .alert-box-title {
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 5px;
          }
          .tip-box {
            background-color: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .tip-box-title {
            font-weight: bold;
            color: #14532d;
            margin-bottom: 5px;
          }
          /* Structured Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: bold;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
          }
          td {
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
            vertical-align: top;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          /* Print bar action */
          .print-bar {
            background-color: #0f172a;
            color: #ffffff;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
            font-family: system-ui, sans-serif;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .print-button {
            background-color: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .print-button:hover {
            background-color: #059669;
          }
          .print-info {
            font-size: 13px;
            opacity: 0.9;
          }
        </style>
      </head>
      <body>
        <div class="print-bar no-print">
          <span class="print-info">Visualização de Impressão do Manual JURIS-CSM</span>
          <button class="print-button" onclick="window.print()">Gravar como PDF / Imprimir</button>
        </div>

        <div class="container">
          <!-- COVER PAGE -->
          <div class="cover">
            <div class="cover-header">
              <p class="cover-sub">Conselho Superior da Magistratura &bull; Portugal</p>
              <h1 class="cover-title">Manual de Operação Técnica e Utilizador</h1>
            </div>
            <div class="cover-middle">
              <div class="cover-desc">
                Orquestrador JURIS-CSM: Sistema Sequencial Autónomo de Agentes de Inteligência Artificial para Elaboração, Grounding e Redação de Pareceres Jurídicos Forenses.
              </div>
            </div>
            <div class="cover-footer">
              <div>
                <strong>Versão do Sistema:</strong> 2.4 (Totalmente Local)<br>
                <strong>Data de Publicação:</strong> Setembro de 2026<br>
                <strong>Editor:</strong> Estúdio de Decisões JURIS-CSM
              </div>
              <div style="text-align: right;">
                Documento Técnico Reservado<br>
                Adequado a Magistrados, Assessores e Profissionais do Setor Forense.<br>
                <em>Base do Conhecimento: Jurisprudência Oficial.</em>
              </div>
            </div>
          </div>

          <!-- CHAPTER 1 -->
          <h1>1. Visão Geral e Arquitetura de Orquestração</h1>
          <p>O <strong>Orquestrador JURIS-CSM</strong> é uma plataforma de orquestração de Inteligência Artificial desenhada especificamente para automatizar a análise jurídica de processos, a pesquisa em tempo real de jurisprudência oficial e a redação forense de pareceres técnicos unificados.</p>
          <p>O seu funcionamento assenta num pipeline de <strong>três fases lineares sequenciais</strong>, onde cada fase é liderada por um agente de IA especializado que consome e aperfeiçoa as conclusões geradas pelo agente anterior. Isto evita a perda de contexto e assegura que as conclusões técnicas e fundamentações finais do parecer derivam estritamente dos factos introduzidos e dos acórdãos reais detetados.</p>
          
          <div class="alert-box">
            <div class="alert-box-title">Filosofia de Arquitetura "Zero Fantasias"</div>
            <p>O JURIS-CSM foi estruturado de raiz para impedir a alucinação de jurisprudência (acórdãos inventados pelos LLMs). O Agente 2 opera com conectores rigorosos em tempo real ao portal oficial do Conselho Superior da Magistratura (ATLAS CSM), validando cada ligação antes de a transpor para o relatório de fundamentação.</p>
          </div>

          <h2>1.1 O Fluxo Tríplice Sequencial</h2>
          <p>A orquestração técnica processa-se da seguinte forma:</p>
          <ol>
            <li><strong>Fase I - O Analisador de Casos:</strong> Recebe os autos, articulados e provas. Realiza a dissecação do caso, delimitando o problema, os factos provados/relevantes e os argumentos em oposição.</li>
            <li><strong>Fase II - O Pesquisador Grounded:</strong> Recebe a lista de "Questões Decidendas" da Fase I. Efetua pesquisas na API REST oficial do portal ATLAS CSM ou aceita a transposição manual estruturada dos acórdãos, identificando correntes de decisão em conflito e os códigos ECLI oficiais.</li>
            <li><strong>Fase III - O Sintetizador & Redator:</strong> Agrega as conclusões factuais e a jurisprudência confirmada e redige o parecer técnico final, incorporando tabelas de confronto e referências hiperligadas ativas.</li>
          </ol>

          <!-- CHAPTER 2 -->
          <div class="page-break"></div>
          <h1>2. Os Agentes Cognitivos</h1>
          <p>Cada fase do pipeline JURIS-CSM é executada por um agente dotado de prompts de sistema de alto desempenho e filtros de contexto rigorosos. Abaixo detalham-se as respetivas especializações e responsabilidades técnicas:</p>

          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Agente Cognitivo</th>
                <th style="width: 15%;">Fase Associada</th>
                <th style="width: 35%;">Responsabilidades Principais</th>
                <th style="width: 25%;">Output Esperado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Agente 1: Analisador</strong><br><small>Dissecação Fáctica</small></td>
                <td>Fase I</td>
                <td>Extrair os pontos fulcrais da disputa, classificar os argumentos jurídicos das duas partes e isolar as problemáticas legais que exigem resposta obrigatória.</td>
                <td>Relatório Estruturado de Questões Decidendas e Factos Críticos.</td>
              </tr>
              <tr>
                <td><strong>Agente 2: Pesquisador</strong><br><small>Grounding de Julgados</small></td>
                <td>Fase II</td>
                <td>Consultar o portal ATLAS CSM (via API REST ou scraping direto), extrair acórdãos reais e delinear as correntes jurisprudenciais (corrente maioritária vs. minoritária).</td>
                <td>Compilação de Acórdãos Reais de Suporte com identificadores ECLI válidos.</td>
              </tr>
              <tr>
                <td><strong>Agente 3: Sintetizador</strong><br><small>Redação Forense</small></td>
                <td>Fase III</td>
                <td>Fundir os dados factuais com a jurisprudência real localizada. Redigir uma nota doutrinal e o parecer jurídico final fundamentado, mantendo as ligações originais.</td>
                <td>Parecer Jurídico Final unificado pronto para uso forense.</td>
              </tr>
            </tbody>
          </table>

          <div class="tip-box">
            <div class="tip-box-title">Dica de Produtividade</div>
            <p>Se o utilizador pretender guiar as pesquisas do Agente 2, poderá utilizar o <strong>Modo de Questões Diretas</strong> para especificar de forma clara quais os termos jurídicos e normas (ex: Art. 405º CC) que a pesquisa no ATLAS CSM deve prioritariamente tentar focar.</p>
          </div>

          <!-- CHAPTER 3 -->
          <div class="page-break"></div>
          <h1>3. Fluxos de Trabalho e Entrada de Dados</h1>
          <p>A flexibilidade de entrada de dados no JURIS-CSM é crucial para se adaptar ao estado de preparação e documentação de cada processo. O utilizador pode iniciar um novo projeto através de três modalidades exclusivas:</p>

          <h2>3.1 Carregamento de Documentos de Autos (.PDF / .DOCX)</h2>
          <p>Este é o fluxo ideal para casos em fase de estudo preliminar. O utilizador carrega os documentos reais do processo (como a Petição Inicial, Contestação, Saneador ou Atas de Julgamento).</p>
          <ul>
            <li><strong>Processamento:</strong> O sistema analisa e extrai o texto base dos documentos carregados.</li>
            <li><strong>Tamanho Limite:</strong> Suporta múltiplos ficheiros de grande envergadura, otimizados para extração cirúrgica de texto estruturado.</li>
            <li><strong>Automação:</strong> O Agente 1 lê o texto compilado de forma inteligível e prepara automaticamente o resumo factual das problemáticas em jogo.</li>
          </ul>

          <h2>3.2 Formulação de Perguntas Diretas (Formulário do Caso)</h2>
          <p>Destinado a situações em que as questões de direito já se encontram delineadas e o jurista quer apenas estruturar o parecer e a pesquisa com base numa dúvida teórica ou factual abstrata.</p>
          <ul>
            <li>Permite focar o Orquestrador diretamente numa questão de direito controvertida específica (ex: "A cessação do contrato-promessa de compra e venda e a aplicabilidade da cláusula penal perante insolvência de uma das partes").</li>
          </ul>

          <h2>3.3 Transição Manual Estruturada (Paste de Resultados)</h2>
          <p>Esta modalidade é recomendada quando o utilizador prefere interagir diretamente com o portal web do ATLAS CSM de forma presencial e trazer os dados validados manualmente para dentro da aplicação para que o Agente 3 redija o Parecer Jurídico.</p>
          
          <div class="alert-box">
            <div class="alert-box-title">Roteiro Recomendado para Transição Manual:</div>
            <ol>
              <li>Abra o portal <a href="https://atlas.altec-csm.dev/#/" target="_blank">ATLAS CSM (https://atlas.altec-csm.dev/#/)</a> num novo separador do seu browser.</li>
              <li>Aceda prioritariamente ao menu principal <strong>"Perguntar"</strong> (este menu do portal oficial já sintetiza formalmente as correntes em confronto). Submeta a sua questão legal.</li>
              <li>Copie toda a resposta estruturada e cole-a no campo de texto disponibilizado na aplicação.</li>
              <li><strong>Nota:</strong> Se o menu "Perguntar" não retornar resultados específicos, utilize o menu de <strong>"Pesquisa"</strong> tradicional para procurar por acórdãos reais através de palavras-chave, copie-os e cole-os na caixa da app. O sistema mapeará as referências e avançará para a Fase III.</li>
            </ol>
          </div>

          <!-- CHAPTER 4 -->
          <div class="page-break"></div>
          <h1>4. Integração do ATLAS CSM e Conexão de Hiperligações</h1>
          <p>O portal ATLAS CSM disponibiliza as decisões dos Tribunais Superiores Portugueses estruturadas com base no identificador uniforme europeu <strong>ECLI (European Case Law Identifier)</strong>.</p>
          
          <h2>4.1 Resolução da Limitação de Hiperligações do Microsoft Word (Bypass Técnico)</h2>
          <p>Durante as nossas análises de conformidade de exportação de documentos, detetámos que o Microsoft Word e alguns motores de renderização de PDF (como os do Adobe Acrobat ou visualizadores do Windows) possuem limitações severas na leitura de URLs que contêm o caractere de rota single-page-app <strong>cardinal/hash (#)</strong>, por exemplo: <code>https://atlas.altec-csm.dev/#/decisao/ECLI:PT:STJ:2023:...</code>.</p>
          <p>Ao clicar nestes links dentro de um ficheiro Word ou PDF descarregado, as aplicações tendem a truncar a URL no cardinal, gerando ligações partidas ou direcionando os utilizadores para a página inicial genérica do portal.</p>

          <div class="tip-box">
            <div class="tip-box-title">Solução de Redirecionamento Transparente Ativada</div>
            <p>Para contornar este bug de terceiros, o JURIS-CSM agora redireciona todos os links do ATLAS CSM através de um <strong>proxy de redirecionamento seguro integrado</strong> de padrão limpo (sem cardinal): <code>https://[URL_DA_APP]/api/redirect/[ECLI]</code>.</p>
            <p>Estes links são aceites nativamente e sem qualquer erro pelo Word e leitores de PDF. Quando o utilizador clica, o servidor da aplicação recebe o pedido e efetua um redirecionamento imediato (HTTP 302 Redirect) para a rota real final do ATLAS CSM. <strong>A integridade das hiperligações das decisões mantém-se assim a 100% em qualquer exportação.</strong></p>
          </div>

          <!-- CHAPTER 5 -->
          <div class="page-break"></div>
          <h1>5. Gestão de Motores de IA e Chaves API</h1>
          <p>O JURIS-CSM é totalmente flexível e adaptável, permitindo aos utilizadores alternar dinamicamente e em tempo real entre três grandes famílias de modelos de IA, cada uma otimizada para diferentes níveis de complexidade ou velocidade:</p>

          <h2>5.1 Fornecedores de IA Suportados</h2>
          <ul>
            <li><strong>Google Gemini (Recomendado):</strong> O motor nativo de eleição da aplicação. Oferece extraordinária precisão semântica na interpretação de textos longos e excelente suporte em português de Portugal.</li>
            <li><strong>Zhipu AI GLM:</strong> Motor de alto desempenho alternativo de última geração. O modelo <code>glm-4-flash</code> é rápido e gratuito, ideal para orquestrações ágeis. O modelo <code>glm-4-plus</code> oferece capacidades de raciocínio de topo de gama.</li>
            <li><strong>DeepSeek (Raciocínio Avançado):</strong> Disponibiliza os modelos <code>deepseek-chat</code> e o excecional <code>deepseek-reasoner (R1)</code>, que utiliza cadeias de raciocínio lógico profundo para analisar controvérsias complexas de direito constitucional ou civil.</li>
          </ul>

          <h2>5.2 Modo Demo (Sem Chaves de API)</h2>
          <p>Caso o utilizador não disponha de chaves de API individuais no momento, a aplicação permite ativar o <strong>"Modo de Simulação Técnica Realista (Modo Demo)"</strong> no painel de configurações. Este modo executa as três fases gerando respostas sintéticas baseadas em casos jurídicos reais pré-mapeados para demonstrar a total eficácia e estrutura das correntes doutrinárias.</p>

          <!-- CHAPTER 6 -->
          <div class="page-break"></div>
          <h1>6. Resolução de Problemas e Diagnóstico de Erros</h1>
          <p>O JURIS-CSM possui um sistema integrado de rastreabilidade técnica e registo detalhado de logs que recolhe todas as falhas de rede, limites de quota e erros de inferência das APIs externas.</p>

          <h2>6.1 Tabela de Diagnóstico Rápido de Erros</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Erro Reportado</th>
                <th style="width: 25%;">Causa Provável</th>
                <th style="width: 30%;">Ação Corretiva do Utilizador</th>
                <th style="width: 25%;">Apoio Técnico da App</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Saldo/Quota Excedido (1301 / 402)</strong></td>
                <td>A conta associada à sua chave da API do Zhipu GLM não possui créditos de saldo disponíveis para o modelo <code>glm-4-plus</code>.</td>
                <td>Aceda às "Configurações de IA" no topo direito e mude o modelo para <code>glm-4-flash</code>, que é gratuito e tem alto desempenho.</td>
                <td>A aplicação sugere e ativa esta recuperação de forma automática em caso de falha de saldo.</td>
              </tr>
              <tr>
                <td><strong>Erro de Chave API / Não Autorizado (401)</strong></td>
                <td>A chave introduzida para o Gemini, GLM ou DeepSeek possui caracteres inválidos ou foi revogada no respetivo portal de desenvolvedor.</td>
                <td>Verifique e limpe espaços em branco à volta da chave. Reintroduza-a no painel de Configurações de IA.</td>
                <td>Pode usar as chaves de servidor providenciadas se o administrador as tiver configurado no seu ambiente.</td>
              </tr>
              <tr>
                <td><strong>Tempo Limite Excedido (Timeout)</strong></td>
                <td>O texto do articulado carregado na Fase I é extremamente extenso, ou as APIs externas de inferência estão sobrecarregadas de pedidos.</td>
                <td>Tente submeter o seu caso com uma formulação de questões diretas mais concisa ou troque de fornecedor de IA (ex: de GLM para Gemini).</td>
                <td>O tempo limite de cada agente foi estendido para 75 segundos para acomodar pareceres densos.</td>
              </tr>
            </tbody>
          </table>

          <h2>6.2 Como Usar o Copiador de Relatórios para Suporte</h2>
          <p>Sempre que ocorrer um erro técnico em qualquer uma das fases:</p>
          <ol>
            <li>Um banner de aviso vermelho aparecerá na tela com o botão <strong>"Copiar Relatório Completo"</strong>.</li>
            <li>Este botão copia automaticamente para a área de transferência um relatório estruturado contendo o carimbo de data/hora, o estado do motor de IA selecionado, e o log exato da falha recebida do servidor.</li>
            <li>Cole o relatório no chat com o seu assistente técnico ou administrador de sistemas para obter uma resolução imediata.</li>
          </ol>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 50px; padding-bottom: 20px;">
          <p style="text-align: center; font-size: 9pt; color: #94a3b8; font-style: italic;">
            Fim do Manual Oficial de Operação Técnica - JURIS-CSM Portugal. Todos os direitos reservados. ${currentYear}.
          </p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto initiate print block once elements render
    printWindow.onload = () => {
      // Delay slightly for render stability
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="manual-modal">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-5xl flex flex-col h-[85vh] border border-slate-200">
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-950 text-white shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-900 text-amber-400 rounded-lg border border-slate-800">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold leading-none tracking-tight flex items-center gap-2">
                  Manual de Operação Técnica JURIS-CSM
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-normal">
                    v2.4
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 leading-none font-medium">
                  Guia de utilizador e arquitetura sequencial autónoma do CSM
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                title="Descarregar ou imprimir manual completo em PDF de alta qualidade"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Descarregar PDF</span>
              </button>
              
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body Grid (Two-column structure for seamless layout navigation) */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            
            {/* Sidebar Navigation (Interactive chapters index) */}
            <nav className="w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0 flex flex-col space-y-1.5 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 mb-2 font-mono">
                Índice de Capítulos
              </p>
              
              <button
                onClick={() => setActiveChapter("introduction")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "introduction"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <Scale className={`w-4 h-4 shrink-0 ${activeChapter === "introduction" ? "text-amber-500" : "text-slate-400"}`} />
                <span className="truncate">1. Visão Geral</span>
              </button>

              <button
                onClick={() => setActiveChapter("agents")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "agents"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <Layers className={`w-4 h-4 shrink-0 ${activeChapter === "agents" ? "text-blue-500" : "text-slate-400"}`} />
                <span className="truncate">2. Agentes Cognitivos</span>
              </button>

              <button
                onClick={() => setActiveChapter("workflows")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "workflows"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <Compass className={`w-4 h-4 shrink-0 ${activeChapter === "workflows" ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="truncate">3. Fluxos de Trabalho</span>
              </button>

              <button
                onClick={() => setActiveChapter("atlas")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "atlas"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <FileText className={`w-4 h-4 shrink-0 ${activeChapter === "atlas" ? "text-indigo-500" : "text-slate-400"}`} />
                <span className="truncate">4. ATLAS CSM & Links</span>
              </button>

              <button
                onClick={() => setActiveChapter("engines")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "engines"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <Settings className={`w-4 h-4 shrink-0 ${activeChapter === "engines" ? "text-slate-600" : "text-slate-400"}`} />
                <span className="truncate">5. Motores de IA</span>
              </button>

              <button
                onClick={() => setActiveChapter("troubleshooting")}
                className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeChapter === "troubleshooting"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-850"
                }`}
              >
                <Bug className={`w-4 h-4 shrink-0 ${activeChapter === "troubleshooting" ? "text-red-500" : "text-slate-400"}`} />
                <span className="truncate">6. Diagnóstico & Erros</span>
              </button>

              {/* Sidebar footer badge */}
              <div className="mt-auto pt-6 border-t border-slate-200/60 px-2.5">
                <div className="p-3 bg-slate-100/55 rounded-xl border border-slate-200/40 text-center">
                  <p className="text-[10px] font-bold text-slate-700 leading-snug">JURIS-CSM Portugal</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-none">Estúdio Tecnológico</p>
                </div>
              </div>
            </nav>

            {/* Scrollable Content Container */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-white text-left">
              
              {/* Introduction Chapter View */}
              {activeChapter === "introduction" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <Scale className="w-5 h-5 text-amber-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Visão Geral e Orquestração Autónoma</h2>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    O <strong>Orquestrador JURIS-CSM</strong> é um sistema avançado de computação cognitiva desenhado de raiz para apoiar magistrados, assessores e juristas na dissecação de processos de contencioso administrativo, cível ou penal e na consequente redação de pareceres técnicos altamente estruturados.
                  </p>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Como Funciona a Orquestração Tríplice Sequencial?
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                      Diferente de sistemas de conversação simples (chatbots), a nossa plataforma assenta num pipeline linear. Isto significa que a saída técnica de cada agente serve de instrução e limite para o agente subsequente, garantindo a perfeita rastreabilidade e consistência lógica em todas as fases:
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">Fase I</span>
                        <p className="text-xs font-bold text-slate-800 mt-2 mb-1">Análise Fáctica</p>
                        <p className="text-[10px] text-slate-400 leading-tight">O Analisador lê os articulados e extrai as problemáticas decisórias em jogo.</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">Fase II</span>
                        <p className="text-xs font-bold text-slate-800 mt-2 mb-1">Grounding ATLAS</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Pesquisa acórdãos oficiais com base em termos de direito do Conselho Superior.</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">Fase III</span>
                        <p className="text-xs font-bold text-slate-800 mt-2 mb-1">Redação Forense</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Fusão e redação doutrinária do parecer final com links seguros clicáveis.</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Com esta arquitetura inovadora, mitigamos em absoluto o risco de "alucinação" (invenção de leis ou de acórdãos inexistentes), assegurando que todas as referências apontam para registos reais e localizados no portal ATLAS CSM com as ligações dinâmicas ativas.
                  </p>
                </div>
              )}

              {/* Agents Chapter View */}
              {activeChapter === "agents" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <Layers className="w-5 h-5 text-blue-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Os Três Agentes Cognitivos do Pipeline</h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A automatização de pareceres recorre a três instâncias isoladas de inteligência linguística profunda que assumem papéis forenses autónomos e focados:
                  </p>

                  <div className="space-y-4">
                    {/* Agent 1 */}
                    <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="p-2 bg-amber-100 text-amber-800 rounded-lg font-mono text-xs font-bold shrink-0">A1</div>
                      <div className="text-left">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-850">O Analisador de Casos e Contestação (Fase I)</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Este agente lê todos os ficheiros ou sumários informados. Extrai a matéria de facto relevante para a lide, classifica os argumentos da Petição Inicial e da Contestação, e delimita as "questões de direito decidendas" (que necessitam obrigatoriamente de ser resolvidas).
                        </p>
                      </div>
                    </div>

                    {/* Agent 2 */}
                    <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="p-2 bg-blue-100 text-blue-800 rounded-lg font-mono text-xs font-bold shrink-0">A2</div>
                      <div className="text-left">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-850">O Pesquisador Grounded no ATLAS CSM (Fase II)</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed">
                          Com base nas problemáticas extraídas pelo Agente 1, realiza chamadas diretas aos canais oficiais de pesquisa, encontrando acórdãos reais dos Tribunais Superiores Portugueses que sustentam correntes jurisprudenciais divergentes (corrente maioritária e correntes de oposição).
                        </p>
                      </div>
                    </div>

                    {/* Agent 3 */}
                    <div className="flex items-start space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg font-mono text-xs font-bold shrink-0">A3</div>
                      <div className="text-left">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-850">O Sintetizador e Redator de Parecer (Fase III)</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed">
                          É o responsável pela redação final do Parecer Forense no estilo formal do CSM. Reúne a fundamentação do caso com as correntes identificadas na Fase II. Incorpora quadros de confronto com emojis identificativos e links ECLI clicáveis ativados no redirecionamento seguro da aplicação.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workflows Chapter View */}
              {activeChapter === "workflows" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <Compass className="w-5 h-5 text-emerald-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">3. Fluxos de Trabalho e Entrada de Dados</h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Pode instanciar projetos no JURIS-CSM através de três modalidades exclusivas de inserção de dados, adequadas à fase em que se encontra o seu trabalho analítico:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">A</div>
                      <h4 className="text-xs font-bold text-slate-800">Carregamento de Autos</h4>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        Carregue documentos oficiais em <strong>PDF ou Word (.docx)</strong>. O sistema extrai e limpa todo o texto útil das peças processuais originais de forma instantânea.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">B</div>
                      <h4 className="text-xs font-bold text-slate-800">Questões de Direito</h4>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        Escreva diretamente as dúvidas jurídicas na consola. Permite testar teses de oposição, enquadramento de doutrinas cíveis ou aplicação de jurisprudência.
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">C</div>
                      <h4 className="text-xs font-bold text-slate-800">Transição Manual</h4>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed">
                        Permite colar as informações diretamente recolhidas no ATLAS CSM. Perfeito para quando quer validar pessoalmente os julgados antes da redação do parecer.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl">
                    <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      Aviso Importante sobre Ficheiros Carregados:
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      O sistema analisa e extrai o texto base de forma local. Certifique-se de que os PDFs não estão integralmente digitalizados sob a forma de imagem não indexada (sem OCR), caso em que a extração textual inicial poderá recolher conteúdos vazios ou incompletos.
                    </p>
                  </div>
                </div>
              )}

              {/* ATLAS Chapter View */}
              {activeChapter === "atlas" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Integração do ATLAS CSM e Linkagem de Acórdãos</h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    O JURIS-CSM conecta-se em tempo real aos canais da API do ATLAS CSM de Portugal (<code>atlas.altec-csm.dev</code>). Esta ligação é crucial para que a aplicação consiga sustentar o parecer final com acórdãos verídicos.
                  </p>

                  <div className="p-4 bg-slate-950 text-white rounded-2xl space-y-2 text-xs">
                    <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Como resolvemos o Bug de Links no Word e PDF?
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      O Microsoft Word e os leitores de PDF quebram ao clicar em URLs que contenham o caractere cardinal/hash (<code>#</code>), como as URLs nativas do ATLAS CSM. O Word remove ou trunca esses links, tornando-os inúteis.
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Para ultrapassar esta limitação, implementámos um <strong>mecanismo de redirecionamento transparente</strong>. Todas as hiperligações no documento exportado apontam para uma URL limpa na nossa própria aplicação (ex: <code>/api/redirect/ECLI:PT:STJ:...</code>).
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-semibold text-emerald-400">
                      O Word abre esta ligação de forma exemplar e o nosso servidor efetua instantaneamente o redirecionamento seguro para a decisão no portal oficial do ATLAS CSM. Os links funcionam a 100%!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">Boas Práticas de Copiar e Colar (Transição Manual):</h4>
                    <ol className="list-decimal list-inside text-xs text-slate-500 space-y-1.5 leading-relaxed pl-2">
                      <li>Aceda à raiz do portal em <strong>https://atlas.altec-csm.dev/#/</strong>.</li>
                      <li>Use prioritariamente o menu <strong>"Perguntar"</strong> (introduza a sua controvérsia para obter o resumo estruturado das correntes).</li>
                      <li>Copie todo o bloco e cole-o na app para passar automaticamente para a redação.</li>
                      <li>Apenas se o menu "Perguntar" falhar é que deve recorrer à <strong>"Pesquisa"</strong> manual por termos chave e copiar os acórdãos respetivos.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Engines Chapter View */}
              {activeChapter === "engines" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <Settings className="w-5 h-5 text-slate-600 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">5. Gestão de Motores de IA e Configurações</h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A plataforma apoia uma estrutura multimodelo e multifornecedor, permitindo ao utilizador escolher o fornecedor de Inteligência Artificial ideal para cada cenário de processamento jurídico:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs mb-2">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Google Gemini</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-normal">
                        O motor padrão recomendado. Utiliza o modelo <code>gemini-3.5-flash</code>. Perfeito para interpretação semântica em língua portuguesa e análise de longas peças processuais.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs mb-2">
                        <Cpu className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Zhipu GLM</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-normal">
                        Mecanismo de elevadíssimo desempenho. Com o modelo <code>glm-4-flash</code>, garante respostas ultrarrápidas de forma totalmente gratuita. O <code>glm-4-plus</code> oferece raciocínio de excelência.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs mb-2">
                        <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>DeepSeek</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-normal">
                        Especializado em análise profunda. Com suporte aos modelos <code>deepseek-chat</code> e o extraordinário modelo de raciocínio lógico avançado <code>deepseek-reasoner (R1)</code>.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <h4 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                      Como configurar as minhas Chaves API?
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Se as chaves padrão do servidor não estiverem configuradas ou se o saldo de créditos gerais estiver esgotado, poderá aceder ao menu <strong>"Configurações"</strong> (ícone de engrenagem) no canto superior direito do cabeçalho da aplicação. Aí poderá introduzir as suas chaves pessoais, que ficarão guardadas localmente no seu navegador com total privacidade.
                    </p>
                  </div>
                </div>
              )}

              {/* Troubleshooting Chapter View */}
              {activeChapter === "troubleshooting" && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150">
                    <Bug className="w-5 h-5 text-red-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">6. Diagnóstico de Erros e Resolução de Problemas</h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A aplicação está equipada com um gestor de diagnósticos abrangente que regista todas as falhas de conectividade com as APIs, de autenticação e limites de quota.
                  </p>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <p className="font-bold text-red-700">Erro 1301 / 402 - Saldo ou Quota GLM Excedido</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        <strong>Causa:</strong> A chave de API do Zhipu GLM em uso esgotou o saldo de créditos necessários para executar o modelo <code>glm-4-plus</code>.<br />
                        <strong>Resolução:</strong> Vá às configurações no canto superior direito e mude o modelo para <code>glm-4-flash</code>, que é inteiramente gratuito e suportado.
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <p className="font-bold text-slate-800">Erro de Timeouts ou Demora no Processamento</p>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        <strong>Causa:</strong> Os articulados em análise contêm dezenas de páginas sem OCR ou o servidor de inferência do DeepSeek/GLM está sobrecarregado.<br />
                        <strong>Resolução:</strong> Troque temporariamente o motor para o Google Gemini que oferece um tempo de resposta de altíssima robustez e limites de tokens elevados.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 text-white rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                      Como descarregar o manual completo em PDF?
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Para descarregar ou imprimir este manual com formatação de publicação A4 (com capa, tabelas desenhadas e paginação perfeita), clique no botão <strong>"Descarregar PDF"</strong> no canto superior direito deste ecrã.
                    </p>
                    <p className="text-[11.5px] text-emerald-400 font-semibold leading-relaxed">
                      DICA: Na janela de gravação que se abrirá, certifique-se de que a opção de destino está definida como "Guardar como PDF" e de que ativa a opção "Gráficos de segundo plano" nas definições de impressão para preservar as cores e estilos modernos do manual.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-medium text-slate-400">
              Estúdio de Decisões JURIS-CSM Portugal &bull; Manual de Operação
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Concluído / Fechar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
