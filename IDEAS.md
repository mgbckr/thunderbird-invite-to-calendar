# Ideas

Ideas in this file are proposals, not implemented features.

## Optional AI extraction from ordinary email

Add an opt-in way to turn an ordinary email into a calendar event even when it has no iCalendar invitation. For example, an email saying “Let's meet next Tuesday at 2 pm” could be analyzed to suggest a title, date, time, location, and description.

Possible approach:

- Offer this as a separate, explicitly enabled feature alongside the existing iCalendar invitation handling.
- Let users invoke it on a selected message, then review and edit the proposed event before saving it to their chosen calendar.
- Support a locally running model through Ollama as one possible provider. Consider other providers later, with clear disclosure and consent before any email content leaves the user's computer.
- Handle ambiguous dates, time zones, missing details, and multiple possible events without silently guessing. Avoid duplicate events and link back to the source email where practical.
- Create a calendar event without automatically sending an invitation response or inviting attendees.

[Mail2Cal-AI](https://services.addons.thunderbird.net/EN-US/thunderbird/addon/mail2cal-ai/) is an existing Thunderbird add-on worth studying for inspiration: it uses local Ollama to extract event details from email and lets the user review them before registration. This proposal does not imply a connection to that project. If code is reused, review its license and attribution requirements first.

Open questions: which model sizes perform reliably, how much setup users should need, how to handle private content and prompt injection in emails, and whether automatic processing would ever be desirable in addition to manual review.
