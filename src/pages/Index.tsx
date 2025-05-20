
import React, { useState, useEffect } from "react";
import JusIAHeader from "@/components/JusIAHeader";
import AIProvider from "@/components/AIProvider";
import PromptEditor from "@/components/PromptEditor";
import DocumentExtractor from "@/components/DocumentExtractor";
import S3RepositoryConfig from "@/components/S3RepositoryConfig";
import AIAnalysisResult from "@/components/AIAnalysisResult";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_LEGAL_PROMPT = `Você é um assessor jurídico especializado. Analise este processo judicial e forneça:

1. RESUMO DO CASO: Sintetize o objeto da ação, partes envolvidas e fase processual.

2. ANÁLISE JURÍDICA: Identifique questões jurídicas relevantes, legislação aplicável e jurisprudência pertinente.

3. SUGESTÃO DE DECISÃO: Forneça fundamentação jurídica completa para a decisão mais adequada.

4. PENDÊNCIAS E PRAZOS: Liste pendências processuais e prazos importantes a observar.

Formate sua resposta em tópicos organizados para facilitar a revisão judicial.`;

const Index = () => {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_LEGAL_PROMPT);
  const [documentContent, setDocumentContent] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentSource, setDocumentSource] = useState<"page" | "s3">("page");

  // Initialize with default prompt
  useEffect(() => {
    setPrompt(DEFAULT_LEGAL_PROMPT);
  }, []);

  const handleRequestAnalysis = async () => {
    if (!apiKey) {
      toast({
        title: "API Key necessária",
        description: "Por favor, insira uma chave de API válida para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!documentContent) {
      toast({
        title: "Sem conteúdo",
        description: "Por favor, extraia ou insira um documento para análise.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      let response;
      
      // Execute the AI analysis based on the selected provider
      switch (selectedProvider) {
        case "openai":
          response = await analyzeWithOpenAI(prompt, documentContent, apiKey);
          break;
        case "anthropic":
          response = await analyzeWithAnthropic(prompt, documentContent, apiKey);
          break;
        case "gemini":
          response = await analyzeWithGemini(prompt, documentContent, apiKey);
          break;
        case "manus":
          response = await analyzeWithManus(prompt, documentContent, apiKey);
          break;
        case "lovable":
          response = await analyzeWithLovable(prompt, documentContent, apiKey);
          break;
        default:
          throw new Error("Provedor de IA não suportado");
      }
      
      setAnalysisResult(response);
      toast({
        title: "Análise concluída",
        description: "A análise jurídica foi concluída com sucesso.",
      });
    } catch (err: any) {
      setError(`Erro na análise: ${err.message}`);
      toast({
        title: "Erro na análise",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <JusIAHeader />
      <div className="container mx-auto py-4 px-4 max-w-4xl space-y-6">
        <AIProvider
          selectedProvider={selectedProvider}
          apiKey={apiKey}
          onProviderChange={setSelectedProvider}
          onApiKeyChange={setApiKey}
        />
        
        <Tabs defaultValue="page" onValueChange={(value) => setDocumentSource(value as "page" | "s3")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="page">Extrair da Página</TabsTrigger>
            <TabsTrigger value="s3">Repositório S3</TabsTrigger>
          </TabsList>
          
          <TabsContent value="page" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DocumentExtractor onExtractedContent={setDocumentContent} />
              <PromptEditor prompt={prompt} onPromptChange={setPrompt} />
            </div>
          </TabsContent>
          
          <TabsContent value="s3" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <S3RepositoryConfig onDocumentFetched={setDocumentContent} />
              <PromptEditor prompt={prompt} onPromptChange={setPrompt} />
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <AIAnalysisResult
          result={analysisResult}
          isLoading={isAnalyzing}
          error={error}
          onRequestAnalysis={handleRequestAnalysis}
        />
        
        <div className="text-xs text-center text-gray-500 pt-4">
          JusIA Assistente Jurídico - Todos os dados são processados localmente e não são armazenados.
        </div>
      </div>
    </div>
  );
};

// AI Provider API functions
async function analyzeWithOpenAI(prompt: string, content: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: prompt 
        },
        { 
          role: "user", 
          content: content 
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API da OpenAI");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Sem resposta da API";
}

async function analyzeWithAnthropic(prompt: string, content: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nDocumento para análise:\n${content}`
        }
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API da Anthropic");
  }

  const data = await response.json();
  return data.content[0]?.text || "Sem resposta da API";
}

async function analyzeWithGemini(prompt: string, content: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${prompt}\n\nDocumento para análise:\n${content}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API do Gemini");
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || "Sem resposta da API";
}

async function analyzeWithManus(prompt: string, content: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.manus.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "manus-davi-12b",
      messages: [
        { 
          role: "system", 
          content: prompt 
        },
        { 
          role: "user", 
          content: content 
        }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API da Manus.ai");
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Sem resposta da API";
}

async function analyzeWithLovable(prompt: string, content: string, apiKey: string): Promise<string> {
  // Simplified example for Lovable - adapt as needed based on actual API
  const response = await fetch("https://api.lovable.dev/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: `${prompt}\n\nDocumento para análise:\n${content}`
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Erro na API da Lovable");
  }

  const data = await response.json();
  return data.completion || "Sem resposta da API";
}

export default Index;
