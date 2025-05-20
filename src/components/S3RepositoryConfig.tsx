
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Key, FileSearch } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type S3ConfigType = {
  endpoint: string;
  username: string;
  password: string;
};

type S3RepositoryConfigProps = {
  onDocumentFetched: (content: string) => void;
};

export default function S3RepositoryConfig({ onDocumentFetched }: S3RepositoryConfigProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<S3ConfigType>({
    endpoint: '',
    username: '',
    password: '',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [documentHash, setDocumentHash] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Check if we're in a browser extension environment
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  // Load saved configuration on mount
  useEffect(() => {
    if (isExtensionEnvironment) {
      chrome.storage.local.get(['s3Config'], (result) => {
        if (result.s3Config) {
          setConfig({
            endpoint: result.s3Config.endpoint,
            username: result.s3Config.username,
            password: result.s3Config.password,
          });
          setIsConfigured(result.s3Config.isConfigured);
        }
      });
    }
  }, [isExtensionEnvironment]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveConfig = () => {
    if (!config.endpoint || !config.username || !config.password) {
      toast({
        title: "Configuração incompleta",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({
        type: 'SET_S3_CONFIG',
        config
      }, (response) => {
        if (response && response.status === 'success') {
          setIsConfigured(true);
          toast({
            title: "Configuração salva",
            description: "Configuração do repositório S3 salva com sucesso."
          });
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível salvar a configuração.",
            variant: "destructive"
          });
        }
      });
    } else {
      // Development mode - mock storage
      setIsConfigured(true);
      toast({
        title: "Modo de desenvolvimento",
        description: "Configuração simulada do repositório S3."
      });
    }
  };

  const fetchDocumentFromS3 = () => {
    if (!documentHash) {
      toast({
        title: "Hash não informado",
        description: "Por favor, informe o hash do documento.",
        variant: "destructive"
      });
      return;
    }

    setIsFetching(true);

    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({
        type: 'FETCH_S3_DOCUMENT',
        documentHash
      }, (response) => {
        setIsFetching(false);
        
        if (response && response.status === 'success') {
          // Handle different document types
          if (response.content.type === 'text') {
            onDocumentFetched(response.content.data);
          } else if (response.content.type === 'pdf') {
            // For PDF we would need to use pdf.js to extract text
            // This is a simplified version
            const pdfText = `[PDF Document: ${documentHash}]`;
            onDocumentFetched(pdfText);
          }
          
          toast({
            title: "Documento obtido",
            description: `Documento ${documentHash} carregado com sucesso.`
          });
        } else {
          toast({
            title: "Erro",
            description: response?.message || "Não foi possível obter o documento.",
            variant: "destructive"
          });
        }
      });
    } else {
      // Development mode - mock document fetch
      setTimeout(() => {
        setIsFetching(false);
        const mockContent = `DOCUMENTO DO S3: ${documentHash}\n\nProcesso nº 1234-56.2023.8.26.0100\nAutor: João da Silva\nRéu: Empresa ABC Ltda.\n\nConteúdo do documento...`;
        onDocumentFetched(mockContent);
        toast({
          title: "Modo de desenvolvimento",
          description: "Usando dados de exemplo do repositório S3."
        });
      }, 1000);
    }
  };

  const extractDocumentHashesFromPage = () => {
    if (!isExtensionEnvironment) {
      toast({
        title: "Modo de desenvolvimento",
        description: "Esta função só está disponível na extensão instalada."
      });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0].id) {
        toast({
          title: "Erro",
          description: "Nenhuma aba ativa encontrada.",
          variant: "destructive"
        });
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // This function runs in the context of the web page
          // Example of extracting document hashes from PJe
          const documentLinks = document.querySelectorAll('a[href*="verDocumento"]');
          const hashes: string[] = [];
          
          documentLinks.forEach(link => {
            // Extract hash from link href
            const href = link.getAttribute('href') || '';
            const hashMatch = href.match(/documento=([a-zA-Z0-9]+)/);
            if (hashMatch && hashMatch[1]) {
              hashes.push(hashMatch[1]);
            }
          });
          
          return hashes;
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          toast({
            title: "Erro",
            description: chrome.runtime.lastError.message,
            variant: "destructive"
          });
          return;
        }

        const hashes = results[0].result as string[];
        if (hashes.length > 0) {
          // Set the first hash as current
          setDocumentHash(hashes[0]);
          toast({
            title: "Hashes encontrados",
            description: `${hashes.length} documento(s) encontrado(s) na página.`
          });
        } else {
          toast({
            title: "Nenhum hash encontrado",
            description: "Não foram encontrados hashes de documentos na página atual."
          });
        }
      });
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Database className="h-5 w-5" />
        Repositório S3
      </h3>
      
      {!isConfigured ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="endpoint">Endpoint S3</Label>
            <Input
              id="endpoint"
              name="endpoint"
              value={config.endpoint}
              onChange={handleConfigChange}
              placeholder="https://seu-bucket-s3.amazonaws.com"
              className="w-full"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              name="username"
              value={config.username}
              onChange={handleConfigChange}
              placeholder="Nome de usuário"
              className="w-full"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={config.password}
              onChange={handleConfigChange}
              placeholder="Senha"
              className="w-full"
            />
          </div>
          
          <Button 
            onClick={saveConfig}
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            Configurar Acesso
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Endpoint: <span className="font-mono text-xs">{config.endpoint.substring(0, 20)}...</span></span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsConfigured(false)}
            >
              Editar
            </Button>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="documentHash">Hash do Documento</Label>
            <div className="flex gap-2">
              <Input
                id="documentHash"
                value={documentHash}
                onChange={(e) => setDocumentHash(e.target.value)}
                placeholder="Hash do documento no S3"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={extractDocumentHashesFromPage}
                title="Detectar hashes na página"
              >
                <FileSearch className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={fetchDocumentFromS3}
            disabled={isFetching}
            className="w-full"
          >
            {isFetching ? "Carregando..." : "Buscar Documento"}
          </Button>
        </div>
      )}
    </div>
  );
}
