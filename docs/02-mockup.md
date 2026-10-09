# Mockup

What WorkBud looks like, with its real colours, type, spacing and content. Every
image below is in [assets/](assets/) and was captured from the deployed app at
[workbud-ph.vercel.app](https://workbud-ph.vercel.app/) in a phone-sized
viewport, because the app is built mobile first.

## Screens

These are the five screens in the [proposal](01-proposal.md), plus Settings,
which the proposal keeps as a secondary sheet opened from Home.

| Auth | Onboarding | Home (Dashboard) |
|---|---|---|
| ![Sign-in screen](assets/01-signin.png) | ![Onboarding](assets/02-onboarding.png) | ![Dashboard](assets/03-dashboard.png) |

| Log a day | Export | Settings |
|---|---|---|
| ![Log sheet](assets/04-log-sheet.png) | ![Export sheet](assets/05-export.png) | ![Settings](assets/06-settings.png) |

## What each one shows

- **Auth.** Sign in, create an account, or reset a password. Signup and reset
  both finish with an emailed code typed into the app.
- **Onboarding.** The first-run setup: name, occupation and currency, then the
  first job with its target hours.
- **Home.** Job tabs, the hours ring, the pace card, stat tiles, milestones, the
  budget meters and the activity feed.
- **Log a day.** Date shortcuts, time in and out, break minutes, a note, and the
  day's expenses as separate items.
- **Export.** A date range and a choice between the plain time log and the full
  record.
- **Settings.** Profile details, profile picture, currency, password and sign
  out.

## Where the build differs from the plan

- **Empty states.** A new account's dashboard has no dedicated empty state or
  loading skeleton yet. It is listed under next steps in the main
  [README](../README.md).
- **Expenses.** Individual expense lines can be added, but editing and deleting
  a single line is not finished.
