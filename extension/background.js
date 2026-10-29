/* Copyright 2026 Invite to Calendar contributors. MIT */
// Serialize processing to avoid concurrent updates racing for the same UID.
let queue = Promise.resolve();
async function processMessage(id, calendarId) {
  const bodies = new Set();
  const inline = await browser.messages.listInlineTextParts(id);
  for (const part of inline) {
    if (part.contentType.toLowerCase().split(";")[0].trim() === "text/calendar") bodies.add(part.content);
  }
  const attachments = await browser.messages.listAttachments(id);
  for (const attachment of attachments) {
    if (attachment.contentType.toLowerCase().split(";")[0].trim() === "text/calendar" || /\.ics$/i.test(attachment.name || "")) {
      bodies.add(await (await browser.messages.getAttachmentFile(id, attachment.partName)).text());
    }
  }
  for (const body of bodies) console.info("Invite to Calendar:", await browser.invitationMirror.apply(calendarId, body));
}
async function processList(list, calendarId) {
  do {
    for (const message of list.messages) {
      try { await processMessage(message.id, calendarId); }
      catch (error) { console.error("Invite to Calendar: failed to process message", error); }
    }
    list = list.id ? await browser.messages.continueList(list.id) : null;
  } while (list);
}
browser.messages.onNewMailReceived.addListener((_folder, messages) => {
  queue = queue.then(async () => {
    const { enabled, calendarId } = await browser.storage.local.get(["enabled", "calendarId"]);
    if (enabled && calendarId) await processList(messages, calendarId);
  }).catch(error => console.error("Invite to Calendar:", error));
});
