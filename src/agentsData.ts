import { Agent } from "./types";

export const AGENTS: Agent[] = [
  {
    id: "analisador",
    name: "Agente 1: Analisador de Casos & Questões",
    description: "Analisa documentos carregados (PDF/Word), extrai os factos estruturais e determina quais as questões jurídicas controvertidas e os argumentos de cada parte em confronto.",
    badge: "Análise Documental",
    avatarEmoji: "⚖️",
    placeholder: "Carregue um ou mais ficheiros PDF/DOCX acima e execute a análise inteligente para extrair as questões decidendas...",
    suggestedPrompts: [
      "Extraia todas as questões jurídicas em conflito deste caso e liste os argumentos do Autor e do Réu.",
      "Identifique as questões relativas a incumprimento contratual e cláusulas penais presentes no material textual anexo.",
      "Identifique as matérias de nulidade de negócio jurídico tratadas no processo anexo e as respetivas defesas."
    ]
  },
  {
    id: "pesquisador",
    name: "Agente 2: Pesquisador de Jurisprudência (Atlas CSM)",
    description: "Para cada questão decidenda, comunica com o portal ATLAS CSM (https://atlas.altec-csm.dev/#/pesquisa) para retornar acórdãos portugueses reais com identificação de código ECLI, tribunal, processo, relator e URLs de consulta.",
    badge: "Investigação & Busca Atlas",
    avatarEmoji: "🔎",
    placeholder: "Indique as questões jurídicas para pesquisa no Atlas CSM (menu pesquisar em https://atlas.altec-csm.dev/#/pesquisa)...",
    suggestedPrompts: [
      "Pesquise jurisprudência consolidada sobre Abuso de Direito na vertente de Venire Contra Factum Proprium no Atlas CSM.",
      "Procure no Atlas CSM acórdãos sobre a possibilidade de Redução de Ofício da Cláusula Penal Excessiva comercial.",
      "Investigue no Atlas CSM decisões jurisprudenciais sobre a Resolução de Contrato de Promessa de Compra e Venda e a devolução do sinal em dobro."
    ]
  },
  {
    id: "sintetizador",
    name: "Agente 3: Redator de Parecer & Peças",
    description: "Sintetiza as controvérsias e a jurisprudência pesquisada no Atlas CSM num Parecer Jurídico de alto-relevo, em Português jurídico formal, com fundamentação exaustiva e termos técnicos exatos.",
    badge: "Redação Jurídica",
    avatarEmoji: "✍️",
    placeholder: "Insira as questões identificadas e a jurisprudência correspondente para gerar o parecer jurídico formal acabado...",
    suggestedPrompts: [
      "Com base nas questões e na jurisprudência encontrada, elabore um Parecer Jurídico formal completo.",
      "Gere a fundamentação de recurso de apelação analisando as correntes jurisprudenciais conflituantes.",
      "Construa uma nota de advocacia estruturada sobre a aplicabilidade prática das posições maioritárias."
    ]
  }
];
