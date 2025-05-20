
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type AIProviderProps = {
  selectedProvider: string;
  apiKey: string;
  onProviderChange: (provider: string) => void;
  onApiKeyChange: (apiKey: string) => void;
};

export default function AIProvider({ selectedProvider, apiKey, onProviderChange, onApiKeyChange }: AIProviderProps) {
  return (
    <div className="space-y-4 p-4 bg-white rounded-md border border-gray-200">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 block">Modelo de IA</label>
        <Select value={selectedProvider} onValueChange={onProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">ChatGPT (OpenAI)</SelectItem>
            <SelectItem value="anthropic">Claude (Anthropic)</SelectItem>
            <SelectItem value="gemini">Gemini (Google)</SelectItem>
            <SelectItem value="manus">Manus.ai</SelectItem>
            <SelectItem value="lovable">Lovable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex justify-between">
          <span>API Key</span>
          <span className="text-xs text-blue-600">Seus dados não são salvos</span>
        </label>
        <Input 
          type="password" 
          placeholder="Chave da API" 
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          className="w-full"
        />
      </div>
    </div>
  );
}
