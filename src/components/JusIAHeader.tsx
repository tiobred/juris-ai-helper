
import { Briefcase } from "lucide-react";

export default function JusIAHeader() {
  return (
    <div className="flex items-center justify-center p-4 bg-blue-900 text-white border-b border-blue-700">
      <Briefcase className="h-6 w-6 mr-2" />
      <h1 className="text-xl font-semibold">JusIA Assistente Jurídico</h1>
    </div>
  );
}
