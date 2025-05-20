
// Background script for JusIA Assistente Jurídico
console.log('JusIA Assistente Jurídico background script initialized');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('JusIA Assistente Jurídico extension installed');
});

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle different message types here
  if (message.type === 'EXTRACT_DOCUMENT') {
    // Handle document extraction request
    sendResponse({ status: 'received' });
  }
  
  // Return true to indicate async response
  return true;
});
