
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileSearch } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type DocumentExtractorProps = {
  onExtractedContent: (content: string) => void;
};

export default function DocumentExtractor({ onExtractedContent }: DocumentExtractorProps) {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [status, setStatus] = useState("");

  // Check if we're in a browser extension environment
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  const extractContent = async () => {
    setIsExtracting(true);
    setStatus("Analisando página...");

    try {
      if (isExtensionEnvironment) {
        // Extension environment - use Chrome APIs
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const currentTab = tabs[0];
          if (!currentTab.id) {
            setStatus("Erro: Nenhuma aba ativa encontrada");
            setIsExtracting(false);
            return;
          }

          chrome.scripting.executeScript(
            {
              target: { tabId: currentTab.id },
              func: extractDocumentFromPJe,
            },
            (results) => {
              if (chrome.runtime.lastError) {
                setStatus(`Erro: ${chrome.runtime.lastError.message}`);
                setIsExtracting(false);
                return;
              }

              const extractedContent = results[0].result as string;
              setExtractedText(extractedContent);
              onExtractedContent(extractedContent);
              setStatus(`Conteúdo extraído com sucesso (${extractedContent.length} caracteres)`);
              setIsExtracting(false);
            }
          );
        });
      } else {
        // Web environment - show mock data for development/preview
        setStatus("Modo de desenvolvimento: usando dados de exemplo...");
        setTimeout(() => {
          const mockContent = "EXEMPLO DE DOCUMENTO JUDICIAL\n\nProcesso nº 1234-56.2023.8.26.0100\nAutor: João da Silva\nRéu: Empresa ABC Ltda.\n\nTrata-se de ação de indenização por danos morais e materiais...";
          setExtractedText(mockContent);
          onExtractedContent(mockContent);
          setStatus(`Conteúdo de exemplo carregado (${mockContent.length} caracteres)`);
          setIsExtracting(false);
          toast({
            title: "Modo de desenvolvimento",
            description: "Usando dados de exemplo pois não estamos em um ambiente de extensão",
          });
        }, 1000);
      }
    } catch (error: any) {
      setStatus(`Erro na extração: ${error.message || error}`);
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Documento Processual
        </label>
        <Button 
          onClick={extractContent} 
          disabled={isExtracting}
          size="sm"
          variant="outline"
          className="flex items-center space-x-1"
        >
          <FileSearch className="h-4 w-4 mr-1" />
          <span>{isExtracting ? "Extraindo..." : "Extrair documento"}</span>
        </Button>
      </div>
      
      {status && (
        <div className="text-xs text-gray-500 italic">{status}</div>
      )}
      
      <Textarea
        value={extractedText}
        onChange={(e) => {
          setExtractedText(e.target.value);
          onExtractedContent(e.target.value);
        }}
        placeholder="Clique em 'Extrair documento' ou cole o texto manualmente aqui..."
        className="min-h-[150px] w-full"
      />
    </div>
  );
}

// This function will be injected into the current tab
function extractDocumentFromPJe() {
  try {
    let text = "";
    
    // Try to find PJe specific containers
    const pjeContainers = [
      '#divDocumentos', 
      '.documento-html', 
      '#textoDocumento',
      '.conteudoDocumento',
      '.documento'
    ];
    
    for (const selector of pjeContainers) {
      const element = document.querySelector(selector);
      if (element) {
        text = element.textContent || "";
        break;
      }
    }
    
    // If we couldn't find any specific PJe containers, get all text from the page
    if (!text || text.trim() === "") {
      // Check if this is a PDF viewer
      const pdfViewer = document.querySelector('#viewer');
      if (pdfViewer) {
        // This might be a PDF document, extract text from all text layers
        const textLayers = document.querySelectorAll('.textLayer');
        if (textLayers.length > 0) {
          const texts = Array.from(textLayers).map(layer => layer.textContent || "");
          text = texts.join('\n\n');
        }
      } else {
        // Just get all text from the body as a fallback
        text = document.body.innerText || document.body.textContent || "";
      }
    }
    
    // Clean up the text (remove excessive whitespace)
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  } catch (error) {
    return `Erro na extração: ${error}`;
  }
}
