export let sessionManager = {asyncTracker: {}}; 
sessionManager.asyncTracker["mainSettings"] = ensureSessionManagerKey(["settings"])

export async function saveSessionManagerVariable(keys){
  if(keys === undefined || keys === null){
    await chrome.storage.local.set(sessionManager);
    return
  }
  let tmpData = {}
  if(keys.prop && keys.prop.constructor === Array){
    keys.forEach(function(name){
      tmpData[name] = sessionManager[name]
    });
  }
  else{
    tmpData[keys] = sessionManager[keys]
  }

  await chrome.storage.local.set(tmpData);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureSessionManagerKey(keys){
  let index=0
  while(index<(keys.length)){
    if((sessionManager[keys[index]] === undefined) || sessionManager[keys[index]] === null){
      index++;
      continue;
    }
    keys.splice(index, 1);
  }

  await setSessionManagerVariable(keys)  
}

export async function setSessionManagerVariable(keys){
  sessionManager.setKeys = (sessionManager.setKeys ?? [])
  keys.forEach(function (name) {
    if(sessionManager.setKeys.includes(name)){
      keys.splice(keys.indexOf(name), 1);
      return
    }
  });

  const defaultSetting = {
    "sessions": {},
    "open": '{"add":"click", "replace":"shift+click", "new":"ctrl/cmd+click", "incognito":"alt+click"}',
    "pinned": "skip"
  }

  let result = await chrome.storage.local.get(keys)
  if(keys.includes("settings")){
    if(result.settings === undefined || result.settings === null){
      result.settings = defaultSetting
      await chrome.storage.local.set({ "settings": result.settings });
    }

    Object.keys(defaultSetting).forEach(function(name){
      if((result.settings[name] !== undefined) && (result.settings[name] !== null)){
        return
      }

      result.settings[name] = defaultSetting[name]
    });
  }

  keys.forEach(function (name) {
    sessionManager[name] = result[name]
    sessionManager.setKeys.splice(sessionManager.setKeys.indexOf(name), 1);
  });   
}

export function gaTrackEvent(request, sender, sendResponse){
  ensureSessionManagerKey(["ga"])
  if(sessionManager.ga.clientId === ''){
    sendResponse({ status: "success" });
    return
  }

  // Replace 'YOUR_MEASUREMENT_ID' with your actual GA4 Measurement ID
  // Replace 'event_name' and 'event_parameters' with your specific event details
  // events:
  //   [{
  //       name: "event_name",
  //       params: {
  //         // Your event parameters
  //         category: "Extension Interaction",
  //         action: "Button Click",
  //         label: "Specific Button"
  //       }
  //     }]
  fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${sessionManager.ga.measurementId}&api_secret=${sessionManager.ga.secret}`, {
    method: "POST",
    body: JSON.stringify({
      client_id: sessionManager.ga.clientId, // Generate or retrieve a unique client ID for each user
      events: request.data.events
    })
  });
  sendResponse({ status: "success" });
}

export function openSession(request, sender, sendResponse) {
  ensureSessionManagerKey(["settings"])
  var open = JSON.parse(sessionManager.settings.open);
  var action = request.data.event ? (((request.data.event.ctrlKey || request.data.event.metaKey) && "ctrl/cmd+click") || (request.data.event.shiftKey && "shift+click") || (request.data.event.altKey && "alt+click") || "click") : open.add;
  var cwinId = request.data.cwinId
  var urls = request.data.urls
  
  for (var k in open) {
    if (action === open[k]) {
      action = k;
      break;
    }
  }
  
  if (action === "add") {
    urls.forEach(function (v) {
      chrome.tabs.create({ windowId: cwinId, url: v });
    });
  } else if (action === "replace") {
    chrome.tabs.query({ windowId: cwinId }, function(tabs) {
      request.data.cwinId = win.id
      request.data.urls = urls
      openSession(request, sender, sendResponse);
      
      if (localStorage.noreplacingpinned) {
        tabs = tabs.filter(function (t) { return !t.pinned; });
      }
      
      tabs.forEach(function (tab) {
        chrome.tabs.remove(tab.id);
      });
    });
  } else if (action === "new" || action === "incognito") {
    chrome.windows.create({ url: urls.shift(), incognito: action === "incognito" }, function (win) {
      request.data.cwinId = win.id
      request.data.urls = urls
      openSession(request, sender, sendResponse);
    });
  } else {
    sendResponse({ status: "error" });
    return false;
  }

  if(request.data.event != null){
    if(request.data.gaEvents !== null){
      request.data.gaEvents = []
    }
    request.data.gaEvents.add({
      name: "trackSession",
      params: {
        "category": "session",
        "action": action,
        "label": isTemp ? "Temp" : "Session"
      }
    })
  }

  if(request.data.gaEvents !== null){
    if(request.data.gaEvents.length > 0){
      chrome.runtime.sendMessage({ type: "gaTrackEvent", data: { events: request.data.gaEvents} }, function(response) { });
    }
  }
  sendResponse({ status: "success" });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("hi")
  if (request.action === "gaTrackEvent") {
    gaTrackEvent(request, sender, sendResponse)
    return
  }

  if (request.action === "openSession") {
    openSession(request, sender, sendResponse)
    return
  }
});
// export { sleep, saveSessionManagerVariable, ensureSessionManagerKey, setSessionManagerVariable, gaTrackEvent, openSession };