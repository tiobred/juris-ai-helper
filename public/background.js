
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
    // Handle document extraction request
    sendResponse({ status: 'received' });
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

// Load saved configuration on startup
chrome.storage.local.get(['s3Config'], (result) => {
  if (result.s3Config) {
    s3Config = result.s3Config;
    console.log('Loaded S3 configuration from storage');
  }
});
