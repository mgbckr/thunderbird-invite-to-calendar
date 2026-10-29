/* Copyright 2026 Invite to Calendar contributors. MIT */
var { ExtensionCommon: { ExtensionAPI } } = ChromeUtils.importESModule("resource://gre/modules/ExtensionCommon.sys.mjs");
var { cal } = ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs");

// Deliberately use calendar provider operations directly, not Thunderbird's iTIP
// invitation transaction: the copies have no organizer, attendees, or alarms.
const MARK = "X-INVITATION-MIRROR";
const ORGANIZER = "X-INVITATION-MIRROR-ORGANIZER";
const STAMP = "X-INVITATION-MIRROR-DTSTAMP";
const CANCELLED = "X-INVITATION-MIRROR-CANCELLED";

function revision(item) {
  const raw = item.getProperty("SEQUENCE");
  const sequence = Number(raw || 0);
  if (!Number.isSafeInteger(sequence) || sequence < 0) throw new Error("Invalid SEQUENCE");
  const value = item.getProperty("DTSTAMP");
  return { sequence, stamp: value?.icalString || String(value || "") };
}
function order(a, b) {
  return a.sequence - b.sequence || a.stamp.localeCompare(b.stamp);
}
function organizerOf(item) {
  return (item.organizer?.id || "").trim().toLowerCase();
}
function clean(item) {
  item.organizer = null;
  for (const attendee of item.getAttendees()) item.removeAttendee(attendee);
  for (const alarm of item.getAlarms()) item.deleteAlarm(alarm);
  // Exceptions can carry their own scheduling data too.
  if (item.recurrenceInfo) {
    for (const id of item.recurrenceInfo.getExceptionIds()) {
      const exception = item.recurrenceInfo.getExceptionFor(id).clone();
      clean(exception);
      item.recurrenceInfo.modifyException(exception, true);
    }
  }
  item.deleteProperty("X-MOZ-SEND-INVITATIONS");
  return item;
}
function getCalendar(id) {
  const calendar = cal.manager.getCalendarById(id);
  if (!calendar || calendar.readOnly || calendar.getProperty("disabled")) {
    throw new Error("Selected calendar is missing, disabled, or read-only.");
  }
  return calendar;
}
async function applyInvitation(calendar, ical) {
  if (ical.length > 2_000_000) throw new Error("Calendar part exceeds size limit.");
  const parser = Cc["@mozilla.org/calendar/ics-parser;1"].createInstance(Ci.calIIcsParser);
  parser.parseString(ical);
  const properties = parser.getProperties();
  const method = String(properties.find(p => p.propertyName === "METHOD")?.value || "").toUpperCase();
  if (!["REQUEST", "CANCEL"].includes(method)) return "ignored: method";
  const items = parser.getItems();
  // A detached occurrence gets a fake master from Thunderbird's parser. Avoid
  // altering the entire series until occurrence-level revisions are supported.
  if (parser.getParentlessItems().length || items.length !== 1) return "ignored: unsupported recurrence or multiple events";
  const source = items[0];
  if (!source.isEvent() || !source.id || !organizerOf(source)) return "ignored: incomplete invitation";
  const incoming = revision(source);
  const old = await calendar.getItem(source.id);
  if (old) {
    if (old.getProperty(MARK) !== "1") return "ignored: UID already belongs to another event";
    if (String(old.getProperty(ORGANIZER) || "") !== organizerOf(source)) return "ignored: organizer mismatch";
    const previous = { sequence: Number(old.getProperty("SEQUENCE") || 0), stamp: String(old.getProperty(STAMP) || "") };
    const comparison = order(incoming, previous);
    if (comparison < 0 || (comparison === 0 && (method !== "CANCEL" || old.getProperty(CANCELLED) === "1"))) return "ignored: duplicate or older";
  } else if (method === "CANCEL") {
    return "ignored: cancellation without an existing event";
  }
  let copy;
  if (method === "CANCEL") {
    copy = old.clone();
    copy.setProperty("STATUS", "CANCELLED");
    copy.setProperty(CANCELLED, "1");
  } else {
    if (!source.startDate) return "ignored: event has no start date";
    copy = clean(source.clone());
    copy.deleteProperty(CANCELLED);
  }
  copy.id = source.id;
  copy.setProperty(MARK, "1");
  copy.setProperty(ORGANIZER, organizerOf(source));
  copy.setProperty(STAMP, incoming.stamp);
  copy.setProperty("SEQUENCE", incoming.sequence);
  copy.calendar = calendar.superCalendar;
  if (old) await calendar.modifyItem(copy, old);
  else await calendar.addItem(copy);
  return method === "CANCEL" ? "cancelled" : old ? "updated" : "created";
}
this.invitationMirror = class extends ExtensionAPI {
  getAPI() {
    return { invitationMirror: {
      async calendars() {
        return cal.manager.getCalendars().filter(c => !c.readOnly && !c.getProperty("disabled"))
          .map(c => ({ id: c.id, name: c.name, type: c.type }));
      },
      async apply(id, ical) { return applyInvitation(getCalendar(id), ical); }
    }};
  }
  onShutdown(isAppShutdown) {
    if (!isAppShutdown) Services.obs.notifyObservers(null, "startupcache-invalidate", null);
  }
};
