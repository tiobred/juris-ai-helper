
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, ArrowRight } from "lucide-react";

type AIAnalysisResultProps = {
  result: string;
  isLoading: boolean;
  error: string | null;
  onRequestAnalysis: () => void;
};

export default function AIAnalysisResult({ 
  result, 
  isLoading, 
  error, 
  onRequestAnalysis 
}: AIAnalysisResultProps) {
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };
  
  const downloadResult = () => {
    const element = document.createElement('a');
    const file = new Blob([result], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `JusIA-Análise-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Análise Jurídica</label>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestAnalysis}
            disabled={isLoading}
            className="flex items-center"
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            <span>{isLoading ? "Analisando..." : "Executar análise"}</span>
          </Button>
        </div>
      </div>
      
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <Textarea
        value={result}
        readOnly
        placeholder="O resultado da análise aparecerá aqui..."
        className={`min-h-[300px] w-full ${result ? 'font-serif' : ''}`}
      />
      
      {result && (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-1" />
            <span>Copiar texto</span>
          </Button>
          <Button variant="outline" size="sm" onClick={downloadResult}>
            <Download className="h-4 w-4 mr-1" />
            <span>Download .txt</span>
          </Button>
        </div>
      )}
    </div>
  );
}
