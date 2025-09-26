import { sessionManager, saveSessionManagerVariable } from './modules/utils.js';
var localSessionManager = sessionManager;
var asyncTrackerKeys = Object.keys(localSessionManager.asyncTracker)
for (const key of asyncTrackerKeys) {
	await localSessionManager.asyncTracker[key]
}


$("select").each(function () {
	var open = JSON.parse(localSessionManager.settings.open);
	$(this)
		.append('<option value="none">&lt;none&gt;</option>')
		.append('<option value="click">click</option>')
		.append('<option value="shift+click">shift+click</option>')
		.append('<option value="ctrl/cmd+click">ctrl/cmd+click</option>')
		.append('<option value="alt+click">alt/opt+click</option>')
		.find("option[value='" + open[this.id.split("-")[1]] + "']").prop("selected", true);
}).change(function () {
	var open = JSON.parse(localSessionManager.settings.open);
	open[this.id.split("-")[1]] = this.value;
	localSessionManager.settings.open = JSON.stringify(open);
	saveSessionManagerVariable(["settings"])
});

$("[name='pinned-save']").change(function () {
	localSessionManager.settings.pinned = this.value;
	saveSessionManagerVariable(["settings"])
}).filter("[value='" + localSessionManager.settings.pinned + "']").prop("checked", true);

$("#pinned-noreplace").change(function () {
	if (this.checked) {
		localSessionManager.settings.noreplacingpinned = true;
	} else {
		delete localSessionManager.settings.noreplacingpinned;
	}
	saveSessionManagerVariable(["settings"])
}).prop("checked", localSessionManager.settings.noreplacingpinned === "true");

chrome.runtime.sendMessage({ type: "gaTrackEvent", data: { events: [
	{
	name: "trackPage",
	params: {
		"category": "pageview",
		"action": "/options",
		"label": "page"
	}
	}
]} }, function(response) { });

