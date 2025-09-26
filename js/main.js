import { initVariables, sessionManager } from './modules/setup.js';

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_MEASUREMENT_ID = `G-`;
const GA_API_SECRET = ``;
const GA_CLIENT_ID = ``;
const version = "3.5.1";

sessionManager.asyncTracker["mainInit"] = initVariables(version, {"endpoint": GA_ENDPOINT, "measurementId": GA_MEASUREMENT_ID, "secret": GA_API_SECRET, "clientId": GA_CLIENT_ID });

///////////////////////////////////////////////////////////////////////////////
// Omnibox
///////////////////////////////////////////////////////////////////////////////
chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
	var sessions = JSON.parse(localStorage.sessions);
	text = text.trim();
	var ltext = text.toLowerCase();
	var suggestions = [];
	var indexes = {};
	
	if (text.length) {
		chrome.omnibox.setDefaultSuggestion({
			description: "Open <match>" + text + "</match>" + (sessions[text] ? "" : " ...") + " in this window"
		});
		
		Object.keys(sessions).forEach(function (name) {
			var index = name.toLowerCase().indexOf(ltext);
			
			if (index !== -1) {
				var match = "<match>" + name.slice(index, index + text.length) + "</match>";
				
				suggestions.push({
					content: name,
					description: name.slice(0, index) + match + name.slice(index + text.length)
				});
				
				indexes[name] = index;
			}
		});
		
		suggestions.sort(function (a, b) {
			return indexes[a.content] === indexes[b.content]
				? (a.content.length === b.content.length ? 0 : a.content.length - b.content.length)
				: indexes[a.content] - indexes[b.content];
		});
		
		suggest(suggestions);
	} else {
		chrome.omnibox.setDefaultSuggestion({ description: "Open a session in this window" });
	}
});

chrome.omnibox.onInputEntered.addListener(function (name) {
	var sessions = JSON.parse(localStorage.sessions);
	
	if (sessions[name]) {
    chrome.runtime.sendMessage({ type: "openSession", data: { 
      cwinId: null, 
      urls: sessions[name], 
      event: null, 
      isTemp: false,
      gaEvents: [{
        name: "trackSession",
        params: {
          "category": "session",
          "action": "Omnibox",
        }
      }]
     } }, function(response) { });
	}
});

chrome.omnibox.setDefaultSuggestion({ description: "Open a session in this window" });


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "gaTrackEvent") {
    gaTrackEvent(request, sender, sendResponse)
    return
  }

  if (request.action === "openSession") {
    openSession(request, sender, sendResponse)
    return
  }
});