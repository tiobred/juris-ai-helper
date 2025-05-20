
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check if we're in a browser extension environment
const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

// Check for Lovable environment
const isLovableEnvironment = typeof window !== 'undefined' && window.__LOVABLE_DATA__ !== undefined;

// Create root element
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

// Render the app
root.render(<App />);

// Log environment info to help with debugging
console.log(`Running in ${isExtensionEnvironment ? 'extension' : 'web'} environment`);
if (isLovableEnvironment) {
  console.log(`Lovable version: ${window.__LOVABLE_DATA__?.version}`);
  console.log(`Lovable features enabled: ${JSON.stringify(window.__LOVABLE_DATA__?.features)}`);
}
