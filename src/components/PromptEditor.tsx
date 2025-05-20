
import React from "react";
import { Textarea } from "@/components/ui/textarea";

type PromptEditorProps = {
  prompt: string;
  onPromptChange: (prompt: string) => void;
};

export default function PromptEditor({ prompt, onPromptChange }: PromptEditorProps) {
  return (
    <div className="space-y-2 p-4 bg-white rounded-md border border-gray-200">
      <label className="text-sm font-medium text-gray-700 flex justify-between">
        <span>Prompt Jurídico</span>
        <button 
          className="text-xs text-blue-600 hover:text-blue-800"
          onClick={() => onPromptChange(DEFAULT_LEGAL_PROMPT)}
        >
          Restaurar padrão
        </button>
      </label>
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Digite seu prompt jurídico aqui..."
        className="min-h-[150px] w-full"
      />
    </div>
  );
}

// Default legal prompt that will be used when the extension is first installed
// or when the user clicks "Restore Default"
const DEFAULT_LEGAL_PROMPT = `Você é um assessor jurídico especializado. Analise este processo judicial e forneça:

1. RESUMO DO CASO: Sintetize o objeto da ação, partes envolvidas e fase processual.

2. ANÁLISE JURÍDICA: Identifique questões jurídicas relevantes, legislação aplicável e jurisprudência pertinente.

3. SUGESTÃO DE DECISÃO: Forneça fundamentação jurídica completa para a decisão mais adequada.

4. PENDÊNCIAS E PRAZOS: Liste pendências processuais e prazos importantes a observar.

Formate sua resposta em tópicos organizados para facilitar a revisão judicial.`;
