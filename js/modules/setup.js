import { setSessionManagerVariable, sessionManager } from './utils.js';

function initVariables(version, gaData){
  chrome.storage.local.set({ "version": version, "ga": gaData }, function() {
    if (chrome.runtime.lastError) {
      console.error("Error setting value:", chrome.runtime.lastError);
      return
    }
  });
  setSessionManagerVariable(["version", "ga", "settings"])
  
}

export { initVariables, sessionManager};
