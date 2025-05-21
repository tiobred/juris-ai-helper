
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { FileSearch, Database, AlertCircle } from "lucide-react";

type PJeDocumentHandlerProps = {
  documentId?: string;
  title?: string;
  onFetch?: (content: string) => void;
};

export default function PJeDocumentHandler({ documentId, title, onFetch }: PJeDocumentHandlerProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Check if we're in a browser extension environment
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  
  const fetchFromS3 = () => {
    if (!documentId) {
      setError("Nenhum documento selecionado");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    if (isExtensionEnvironment) {
      chrome.runtime.sendMessage({
        type: 'FETCH_S3_DOCUMENT',
        documentHash: documentId
      }, (response) => {
        setIsLoading(false);
        
        if (response && response.status === 'success') {
          if (response.content.type === 'text') {
            if (onFetch) onFetch(response.content.data);
            toast({
              title: "Documento carregado",
              description: `Documento ${documentId} carregado com sucesso.`
            });
          } else if (response.content.type === 'pdf') {
            if (onFetch) onFetch(`[PDF Document: ${documentId}]`);
            toast({
              title: "PDF carregado",
              description: "Documento PDF carregado do S3."
            });
          }
        } else {
          setError(response?.message || "Erro ao carregar o documento");
          toast({
            title: "Erro",
            description: response?.message || "Não foi possível obter o documento.",
            variant: "destructive"
          });
        }
      });
    } else {
      // Development mode
      setTimeout(() => {
        setIsLoading(false);
        if (onFetch) {
          const mockText = `DOCUMENTO SIMULADO DO S3 (${documentId}):\n\nTítulo: ${title || documentId}\n\nConteúdo do documento...`;
          onFetch(mockText);
        }
        toast({
          title: "Modo de desenvolvimento",
          description: "Documento simulado carregado com sucesso."
        });
      }, 1000);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileSearch className="h-4 w-4" />
          {title || `Documento ${documentId}`}
        </CardTitle>
        <CardDescription className="text-xs">
          ID: {documentId || 'N/A'}
        </CardDescription>
      </CardHeader>
      
      {error && (
        <CardContent className="pt-0 pb-2">
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}
      
      <CardFooter className="pt-2">
        <Button 
          onClick={fetchFromS3}
          disabled={isLoading || !documentId}
          size="sm"
          className="w-full"
          variant="default"
        >
          <Database className="h-4 w-4 mr-1" />
          {isLoading ? "Carregando..." : "Carregar do S3"}
        </Button>
      </CardFooter>
    </Card>
  );
}
