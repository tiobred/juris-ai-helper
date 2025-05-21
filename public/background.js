
// Background script for JusIA Assistente Jurídico
console.log('JusIA Assistente Jurídico background script initialized');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('JusIA Assistente Jurídico extension installed');
});

// S3 Repository configuration
let s3Config = {
  endpoint: '',
  username: '',
  password: '',
  isConfigured: false
};

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle different message types here
  if (message.type === 'EXTRACT_DOCUMENT') {
    // Process document extraction from PJe
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0].id) {
        sendResponse({ status: 'error', message: 'No active tab found' });
        return;
      }
      
      try {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: extractDocumentsFromPJe,
        }, (results) => {
          if (chrome.runtime.lastError) {
            sendResponse({ 
              status: 'error', 
              message: chrome.runtime.lastError.message 
            });
            return;
          }
          
          sendResponse({ 
            status: 'success', 
            documents: results[0].result 
          });
        });
      } catch (error) {
        sendResponse({ 
          status: 'error', 
          message: error.message 
        });
      }
    });
    return true; // Keep the message channel open for async response
  }
  
  // Handle S3 configuration
  if (message.type === 'SET_S3_CONFIG') {
    s3Config = {
      ...message.config,
      isConfigured: true
    };
    // Store configuration in chrome storage for persistence
    chrome.storage.local.set({ s3Config }, () => {
      console.log('S3 configuration saved');
    });
    sendResponse({ status: 'success', message: 'S3 configuration saved' });
  }
  
  // Handle S3 document fetch request
  if (message.type === 'FETCH_S3_DOCUMENT') {
    fetchS3Document(message.documentHash)
      .then(content => {
        sendResponse({ status: 'success', content });
      })
      .catch(error => {
        sendResponse({ status: 'error', message: error.message });
      });
    return true; // Indicates async response
  }
  
  // Handle direct document extraction from current PJe page
  if (message.type === 'EXTRACT_PJE_DOCUMENTS') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0].id) {
        sendResponse({ status: 'error', message: 'No active tab found' });
        return;
      }
      
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: extractDocumentsFromPJe
      }, (results) => {
        if (chrome.runtime.lastError) {
          sendResponse({ 
            status: 'error', 
            message: chrome.runtime.lastError.message 
          });
          return;
        }
        
        sendResponse({ 
          status: 'success', 
          documents: results[0].result 
        });
      });
    });
    return true; // Indicates async response
  }
  
  // Return true to indicate async response
  return true;
});

// Function to fetch document from S3 repository
async function fetchS3Document(documentHash) {
  if (!s3Config.isConfigured) {
    throw new Error('S3 repository not configured');
  }
  
  try {
    // Basic auth headers
    const headers = new Headers();
    const authString = `${s3Config.username}:${s3Config.password}`;
    headers.append('Authorization', `Basic ${btoa(authString)}`);
    
    const response = await fetch(`${s3Config.endpoint}/${documentHash}`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    // Depending on the document type, handle differently
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      return { type: 'pdf', data: arrayBuffer };
    } else {
      const text = await response.text();
      return { type: 'text', data: text };
    }
  } catch (error) {
    console.error('Error fetching from S3:', error);
    throw error;
  }
}

// Function to extract documents from the PJe interface
function extractDocumentsFromPJe() {
  try {
    const documents = [];
    
    // Extract document IDs from various PJe elements
    // Look for document links based on the screenshot
    const documentLinks = document.querySelectorAll('a[onclick*="exibirDocumento"], a[onclick*="abrirDocumento"]');
    documentLinks.forEach(link => {
      const onclick = link.getAttribute('onclick') || '';
      
      // Extract document ID from onclick attribute
      const idMatch = onclick.match(/\d{8,}/);
      if (idMatch) {
        const docId = idMatch[0];
        const docTitle = link.textContent.trim() || `Documento ${docId}`;
        documents.push({ id: docId, title: docTitle });
      }
    });
    
    // Look for document elements with IDs
    document.querySelectorAll('[id*="documento"]').forEach(elem => {
      const idAttribute = elem.getAttribute('id') || '';
      const idMatch = idAttribute.match(/\d{8,}/);
      if (idMatch) {
        const docId = idMatch[0];
        const docTitle = elem.textContent.trim() || `Documento ${docId}`;
        if (!documents.some(doc => doc.id === docId)) {
          documents.push({ id: docId, title: docTitle });
        }
      }
    });
    
    // Extract document numbers from the document content based on the screenshot
    const processBlocks = document.querySelectorAll('.processo-numero, .processo-texto, h1, h2');
    processBlocks.forEach(block => {
      const text = block.textContent || '';
      // Look for document numbers in format like '499532088'
      const matches = text.match(/\b\d{8,9}\b/g) || [];
      
      matches.forEach(docId => {
        if (!documents.some(doc => doc.id === docId)) {
          documents.push({ 
            id: docId, 
            title: `Documento ${docId}`,
            context: text.substring(0, 100).trim()
          });
        }
      });
    });
    
    // If we're looking at a specific document page (based on screenshot)
    const documentHeader = document.querySelector('h1, .cabecalhoDocumento');
    if (documentHeader) {
      const headerText = documentHeader.textContent || '';
      const docIdMatch = headerText.match(/\b\d{8,9}\b/);
      
      if (docIdMatch && !documents.some(doc => doc.id === docIdMatch[0])) {
        documents.push({
          id: docIdMatch[0],
          title: headerText.trim(),
          isCurrent: true
        });
      }
    }
    
    // If no documents found, look for any numbers that might be document IDs
    if (documents.length === 0) {
      // Look for any numbers that might be document IDs in the page content
      const bodyText = document.body.innerText;
      const potentialIds = bodyText.match(/\b\d{8,9}\b/g) || [];
      
      potentialIds.forEach(docId => {
        if (!documents.some(doc => doc.id === docId)) {
          documents.push({ id: docId, title: `Documento ${docId}` });
        }
      });
    }
    
    return documents;
  } catch (error) {
    console.error('Error extracting documents:', error);
    return { error: error.message };
  }
}

// Load saved configuration on startup
chrome.storage.local.get(['s3Config'], (result) => {
  if (result.s3Config) {
    s3Config = result.s3Config;
    console.log('Loaded S3 configuration from storage');
  }
});
