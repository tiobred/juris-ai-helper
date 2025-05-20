
/// <reference types="vite/client" />
/// <reference path="./types/chrome.d.ts" />

// Declare global Lovable types for the latest version
interface Window {
  __LOVABLE_DATA__?: {
    version: string;
    features: {
      select: boolean;
      [key: string]: boolean;
    };
  };
}
