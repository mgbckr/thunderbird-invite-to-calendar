const select = document.getElementById("calendar");
const enabled = document.getElementById("enabled");
const status = document.getElementById("status");
async function load() {
  const saved = await browser.storage.local.get(["calendarId", "enabled"]);
  const calendars = await browser.invitationMirror.calendars();
  select.add(new Option("Choose a calendar…", ""));
  for (const calendar of calendars) select.add(new Option(`${calendar.name} (${calendar.type})`, calendar.id));
  if (saved.calendarId && !calendars.some(c => c.id === saved.calendarId)) {
    select.add(new Option("Previously selected calendar is unavailable", saved.calendarId));
    status.textContent = "Choose an available calendar.";
  }
  select.value = saved.calendarId || "";
  enabled.checked = saved.enabled === true;
}
document.getElementById("settings").addEventListener("submit", async event => {
  event.preventDefault();
  await browser.storage.local.set({ calendarId: select.value, enabled: enabled.checked });
  status.textContent = "Saved.";
});
load().catch(error => { status.textContent = `Could not load calendars: ${error.message}`; });
