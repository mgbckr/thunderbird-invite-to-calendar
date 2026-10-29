# Invite to Calendar

An experimental Thunderbird extension that copies newly received iCalendar invitations into a selected Thunderbird calendar, without accepting or declining them. The copy is a normal calendar event, not an iTIP response. The extension uses the Thunderbird calendar provider directly, removes organizer, attendees and alarms from copies, and does not use a mail-sending API. For an update it finds the same UID and only changes entries previously created by this extension. A cancellation marks the existing copy `CANCELLED`.

**Status: early prototype, not a production release.** The calendar core was smoke-tested on Thunderbird 153.6 using a disposable profile and a memory calendar. Real incoming mail, SOGo/CalDAV synchronization, server behavior, and the settings UI have not yet been tested end to end. Start with a separate local calendar and test with invitations you control. A calendar server may have independent notification or scheduling behavior; this extension cannot guarantee what that server does.

## Try it

1. Use Thunderbird **153.x**. This version range is intentional: the extension uses Thunderbird internals that can change between releases. Open Calendar and create a separate local test calendar.
2. In Add-ons and Themes, open the gear menu and choose **Install Add-on From File**, then select the built `dist/invite-to-calendar.xpi`. Alternatively, choose **Debug Add-ons**, load the `extension/manifest.json` file temporarily, and keep Thunderbird open. A temporary installation is removed when Thunderbird exits.
3. Open the add-on's settings, select the test calendar, enable automatic processing, and save.
4. While Thunderbird is running, send an invitation to the account, then send an update and a cancellation. Check the calendar, and check that no response was sent. Inspect the add-on console for errors if needed.

Thunderbird will warn that the Experiment has **full, unrestricted access to Thunderbird and the computer**. This is inherent to Thunderbird's Experiment mechanism, not a narrow calendar permission. Review the source and install only if comfortable with that access.

## What it does and does not do

- Processes new mail in the folders watched by Thunderbird's `onNewMailReceived` event. It handles inline `text/calendar` and `.ics` attachments and follows paginated message lists. It does not scan existing mail or replay messages received while the extension was disabled or Thunderbird was closed.
- Processes one event per calendar part for `METHOD:REQUEST` and `METHOD:CANCEL`. Normal recurring masters can be copied; **single-occurrence updates and cancellations are ignored**. Multiple events in one part, incomplete invitations and other methods are ignored.
- Matches by UID within the selected calendar and refuses to change an existing item that lacks the extension's marker. The organizer must match the original; sequence and DTSTAMP prevent older or duplicate updates. A cancellation without a pre-existing mirror is ignored, so a later out-of-order older request can still appear.
- Organizer matching is not authentication: forged mail can impersonate an organizer and alter a matching mirrored event. This tool is not suitable where calendar integrity depends on verifying invitations.
- No organizer, attendee or reminder is carried into the copy. Cancellation is represented by event status, not deletion; how cancelled events display depends on the calendar. Changing the selected calendar does not migrate or clean up copies in the old calendar. Failures are logged to the add-on console; no retry queue is provided.

## Development

Node 20+ and the `zip` command are required for packaging. No npm dependencies are needed.

```sh
npm test
npm run package
```

The test suite uses mocks to exercise revisions, cancellations, duplicate handling, and collision protection. The isolated Thunderbird smoke test also exercised the real calendar parser and memory provider, but is not yet automated in this repository. Full integration tests should cover the mail event, MIME decoding, local and SOGo calendars, restarts, offline behavior, recurring exceptions, and actual outbound scheduling behavior.

The included dev container supports developing and running the tests in GitHub Codespaces. A GitHub Actions workflow template is provided in `.github/workflow-templates/test.yml`; move it into `.github/workflows/` to enable it after granting the GitHub credential permission to update workflows. The Thunderbird UI and real-calendar integration tests still require a local Thunderbird installation or a suitably configured graphical test environment. Before publishing, choose a permanent extension ID on a domain you control, and review the Experiment, privacy implications, and Thunderbird Add-ons policies.

## References

- [Thunderbird's Experiment API documentation](https://developer.thunderbird.net/add-ons/mailextensions/experiments)
- [Thunderbird Calendar Experiment draft](https://github.com/thunderbird/webext-experiments/tree/main/calendar) (the draft lists Thunderbird 128 compatibility; this project implements a small purpose-built experiment tested on 153 rather than vendoring it)
- [Thunderbird messages API](https://webextension-api.thunderbird.net/en/mv2/messages.html)

MIT licensed; see [LICENSE](LICENSE).
