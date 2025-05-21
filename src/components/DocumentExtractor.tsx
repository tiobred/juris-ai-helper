import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSearch, FileDown, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type DocumentExtractorProps = {
  onExtractedContent: (content: string) => void;
};

export default function DocumentExtractor({ onExtractedContent }: DocumentExtractorProps) {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [status, setStatus] = useState("");
  const [documents, setDocuments] = useState<Array<{id: string, title: string, isCurrent?: boolean}>>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Check if we're in a browser extension environment
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  // Load documents from the current page when component mounts
  useEffect(() => {
    if (isExtensionEnvironment) {
      loadDocumentsFromPage();
    }
  }, [isExtensionEnvironment]);

  const loadDocumentsFromPage = () => {
    if (!isExtensionEnvironment) {
      setDocuments([
        { id: "499532088", title: "Despacho" },
        { id: "498663687", title: "Impugnação ao Cumprimento de Sentença" }
      ]);
      setStatus("Modo de desenvolvimento: documentos simulados carregados");
      return;
    }

    setIsLoadingDocuments(true);
    setStatus("Detectando documentos na página...");

    chrome.runtime.sendMessage({ 
      type: "EXTRACT_PJE_DOCUMENTS" 
    }, (response) => {
      setIsLoadingDocuments(false);
      
      if (chrome.runtime.lastError) {
        setStatus(`Erro: ${chrome.runtime.lastError.message}`);
        return;
      }

      if (!response || response.status === 'error') {
        setStatus(`Erro ao carregar documentos: ${response?.message || 'Erro desconhecido'}`);
        return;
      }

      if (response.documents && Array.isArray(response.documents)) {
        setDocuments(response.documents);
        
        // If we have documents, select the current one or the first one
        const currentDoc = response.documents.find(doc => doc.isCurrent);
        if (currentDoc) {
          setSelectedDocumentId(currentDoc.id);
        } else if (response.documents.length > 0) {
          setSelectedDocumentId(response.documents[0].id);
        }

        setStatus(`${response.documents.length} documento(s) encontrado(s) na página`);
      } else {
        setStatus("Nenhum documento encontrado na página");
      }
    });
  };

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
          const mockContent = "EXEMPLO DE DOCUMENTO JUDICIAL\n\nProcesso nº 0559643-52.2016.8.05.0001\nAutor: MUNICÍPIO DE SALVADOR\nRéu: GOBI EMPREENDIMENTOS IMOBILIARIOS S/A\n\nDESPACHO\n\nIntime-se o Ente Federativo para, no prazo de 10 dias, manifestar-se acerca da impugnação de Id. 498663687.\n\nDecorrido o prazo, com ou sem resposta, retornem-me os autos conclusos.";
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

  const fetchSelectedDocumentFromS3 = async () => {
    if (!selectedDocumentId) {
      toast({
        title: "Nenhum documento selecionado",
        description: "Por favor, selecione um documento para carregar",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setStatus(`Buscando documento ${selectedDocumentId} do repositório S3...`);

    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({
        type: 'FETCH_S3_DOCUMENT',
        documentHash: selectedDocumentId
      }, (response) => {
        setIsExtracting(false);
        
        if (response && response.status === 'success') {
          // Handle different document types
          if (response.content.type === 'text') {
            setExtractedText(response.content.data);
            onExtractedContent(response.content.data);
            setStatus(`Documento ${selectedDocumentId} carregado do S3 com sucesso`);
          } else if (response.content.type === 'pdf') {
            // For PDF we show a placeholder
            const pdfText = `[Documento PDF ${selectedDocumentId} carregado do S3]`;
            setExtractedText(pdfText);
            onExtractedContent(pdfText);
            setStatus(`Documento PDF ${selectedDocumentId} carregado do S3 com sucesso`);
          }
          
          toast({
            title: "Documento obtido",
            description: `Documento ${selectedDocumentId} carregado com sucesso do S3.`
          });
        } else {
          setStatus(`Erro ao carregar documento: ${response?.message || 'Erro desconhecido'}`);
          toast({
            title: "Erro",
            description: response?.message || "Não foi possível obter o documento do S3.",
            variant: "destructive"
          });
        }
      });
    } else {
      // Development mode - mock document fetch
      setTimeout(() => {
        setIsExtracting(false);
        const mockContent = `DOCUMENTO DO S3: ${selectedDocumentId}\n\nProcesso nº 0559643-52.2016.8.05.0001\nAutor: MUNICÍPIO DE SALVADOR\nRéu: GOBI EMPREENDIMENTOS IMOBILIARIOS S/A\n\nDESPACHO\n\nIntime-se o Ente Federativo para, no prazo de 10 dias, manifestar-se acerca da impugnação de Id. 498663687.\n\nDecorrido o prazo, com ou sem resposta, retornem-me os autos conclusos.`;
        setExtractedText(mockContent);
        onExtractedContent(mockContent);
        setStatus(`Documento simulado do S3 carregado (${mockContent.length} caracteres)`);
        toast({
          title: "Modo de desenvolvimento",
          description: "Usando dados de exemplo do repositório S3."
        });
      }, 1000);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Documentos do Processo
        </label>
        <Button 
          onClick={loadDocumentsFromPage} 
          variant="outline"
          size="sm"
          disabled={isLoadingDocuments}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingDocuments ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>
      </div>
      
      {documents.length > 0 ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select 
              value={selectedDocumentId} 
              onValueChange={setSelectedDocumentId}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um documento" />
              </SelectTrigger>
              <SelectContent>
                {documents.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title} ({doc.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={fetchSelectedDocumentFromS3}
              disabled={!selectedDocumentId || isExtracting}
              variant="outline"
            >
              <FileSearch className="h-4 w-4 mr-1" />
              Carregar
            </Button>
          </div>
          
          <div className="text-xs flex justify-between text-gray-500">
            <span>{documents.length} documento(s) encontrado(s)</span>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-xs"
              onClick={extractContent}
              disabled={isExtracting}
            >
              Extrair conteúdo da página
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          onClick={extractContent} 
          disabled={isExtracting}
          variant={status.includes("Nenhum documento encontrado") ? "default" : "outline"}
          size="sm"
          className="flex items-center space-x-1 w-full"
        >
          <FileSearch className="h-4 w-4 mr-1" />
          <span>{isExtracting ? "Extraindo..." : "Extrair documento da página"}</span>
        </Button>
      )}
      
      {status && (
        <div className="text-xs text-gray-500 italic">{status}</div>
      )}
      
      <Textarea
        value={extractedText}
        onChange={(e) => {
          setExtractedText(e.target.value);
          onExtractedContent(e.target.value);
        }}
        placeholder="Selecione um documento ou extraia o conteúdo da página..."
        className="min-h-[150px] w-full"
      />

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (extractedText) {
              const blob = new Blob([extractedText], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `documento-${selectedDocumentId || 'extraido'}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              toast({
                title: "Download concluído",
                description: "O documento extraído foi baixado com sucesso.",
              });
            } else {
              toast({
                title: "Sem conteúdo",
                description: "Não há texto para baixar.",
                variant: "destructive",
              });
            }
          }}
          variant="outline"
          size="sm"
          disabled={!extractedText}
        >
          <FileDown className="h-4 w-4 mr-1" />
          Baixar texto
        </Button>
      </div>
    </div>
  );
}

// This function will be injected into the current tab
function extractDocumentFromPJe() {
  try {
    let text = "";
    
    // Try to find PJe specific containers
    const pjeContainers = [
      '.documento-html', 
      '#textoDocumento',
      '.conteudoDocumento',
      '#divDocumentos', 
      '.documento',
      '.corpo-documento',
      '#divInfraAreaTelaD',
      '.infraAreaTelaD'
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
        // Try to get content from iframe if present (common in PJe)
        const iframe = document.querySelector('iframe[id*="documento"]');
        if (iframe) {
          // Cast the iframe to HTMLIFrameElement to access contentDocument
          const iframeElement = iframe as HTMLIFrameElement;
          if (iframeElement.contentDocument) {
            text = iframeElement.contentDocument.body.textContent || "";
          }
        } else {
          // Just get all text from the main content area or body as a fallback
          const mainContent = document.querySelector('main, .container, .content, #conteudo');
          text = (mainContent ? mainContent.textContent : document.body.innerText) || "";
        }
      }
    }
    
    // Clean up the text
    text = text.trim();
    
    // Remove excessive whitespace but preserve paragraph breaks
    text = text.replace(/\s+/g, ' ').trim()
            .replace(/\n\s*\n/g, '\n\n');
    
    return text;
  } catch (error) {
    return `Erro na extração: ${error}`;
  }
}
