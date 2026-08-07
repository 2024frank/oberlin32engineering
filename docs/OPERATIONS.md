# Operating checklist

## Weekly during the founding term

- Review new form submissions and mark them reviewed or archived.
- Confirm that public project and event statuses still match reality.
- Remove expired opportunities or correct their deadlines.
- Check for broken links in the resource library.
- Record project decisions and next steps before they are forgotten.

## Before publishing an event

Confirm the responsible organizer, date, start and end time, room, reservation, accessibility details, food details, registration method, expected cost, and cancellation contact.

## Before changing a project to active

Confirm a project lead, at least one other participant, a first milestone, a meeting plan, required tools, permission for the workspace or deployment location, and any safety review.

## At the end of a term

Publish a short report with what happened, what did not happen, participation counts that can be supported, project status, money spent, files future officers need, and recommended next actions.

## Database content cutover

Keep `NEXT_PUBLIC_USE_DATABASE=false` while schema changes or seed content are pending. After the migration and seed succeed, set it to `true`, deploy, and compare the public projects, events, resources, and leadership pages against the officer portal. Set it back to `false` if stale or incomplete records appear.

## Access review

At least once per term, remove officer access for people who no longer need it, deactivate unused role definitions, and confirm that at least two trusted administrators can reach the portal.
