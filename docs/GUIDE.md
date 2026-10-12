# CGP Effort guide

Version 1.0.0, updated 2026-10-12. This guide describes that version; a newer plugin may differ in details.

This is the reference for CGP Effort, a Claude Code plugin by Crypto Gameplan. An agent that is asked how the plugin works should answer from this file. Names in quotes are the words the person sees in the app, so they can find them.

## What it does

CGP Effort picks the reasoning effort for every prompt. Before a prompt goes out, a small model reads it and chooses low, medium, high, xhigh or max, and the plugin sends the prompt at that effort. Quick questions run at a low effort and hard jobs at a high one, so the person does not have to change the Effort control by hand.

A bar above the prompt shows the effort, how full the chat is and how long the prompt cache stays warm. From the bar the person can compact the chat or hand it off to a fresh one.

Effort only changes on Opus 5.5 and Sonnet 5.5. On other models a change of effort between two requests rewrites most of the prompt cache, which costs more than the lower effort saves, so the plugin pauses there and the bar says "Paused". Haiku takes no effort setting at all.

## Installing, updating and removing

CGP Effort is listed in the Crypto Gameplan marketplace, `crypto-gameplan/cgp-marketplace`, together with the other Crypto Gameplan plugins. Install in Claude Code with two commands:

```text
/plugin marketplace add crypto-gameplan/cgp-marketplace
/plugin install cgp-effort@crypto-gameplan
```

Then run `/reload-plugins` or restart Claude Code. The plugin works in the desktop app and in the terminal, on macOS, Linux and Windows.

The plugin looks for a new version every six hours. When one is out, a card above the prompt offers "Update" and "Later". "Update" installs it and loads it in the open chat. "Later" hides that version for a day. After an update the card links to the release notes ("What's new").

Updating runs the `claude` command line tool. The desktop app sometimes cannot find it, because the app keeps the PATH it had when the person logged in. The plugin then also looks in `~/.local/bin`, where the installers put it. If the tool is missing entirely, the card says so and offers "Copy install command".

To remove the plugin, open Settings, then "Customize", then "Uninstall", and press it a second time to confirm.

## First setup

After installing, a short setup opens above the prompt. It has four steps and can be skipped or closed at any time. `/cgp-effort setup` opens it again.

1. The judge: "Just Haiku (no key)" or "Add Jev (needs a key)". See the section on judges.
2. The lean: a slider from "Cheaper" to "Smarter". It tips the judge's close calls one step either way.
3. Who writes a Full handoff: the built-in writer or one of the person's own skills.
4. Dark or light panels, or matching Claude Code.

All choices can be changed later in Settings.

## How the effort is picked

The judge reads the new message, the person's previous message and the end of the assistant's last reply. The last reply matters because a short answer such as "B" or "yes" can start a large piece of work, and the reply says what that work is.

Some messages skip the judge:

- A short follow-up such as "go", "ok" or "yes" between two steps of work keeps the effort already picked. After a question from the assistant, it goes to the judge instead, because the answer may start something new.
- A message that names a level, such as "max effort" or "effort: low", runs at that level. This even goes past the person's own limits.
- Slash commands that belong to Claude Code or to CGP Effort are never judged. A skill or custom command the person added is judged, and the judge is told what the skill does.

After the judge answers, the person's settings apply:

- The lean ("Cheaper" to "Smarter") moves a verdict one step only when the judge was unsure. A sure verdict stays as it is.
- "Min" and "Max" are hard limits.
- Save mode, offered when a usage limit runs low, caps the effort at medium.

If a message is typed while a turn is still running, a higher verdict applies at once and a lower one waits until the turn ends, so the running task is not slowed down halfway.

When the person changes the effort in the app themselves, Auto switches off and the bar says so. Their choice wins until they turn Auto on again with the ● / ○ switch or the "Auto" button.

To switch Auto effort off for good without uninstalling, turn off "Auto effort" at the top of the Effort card in Settings, or set `autoEffort` to `off` under `/plugin`. CGP Effort then never changes the effort and the Auto switch stays off, while the bar, the cache timer, compact, handoff and the alerts keep working. Disabling the plugin under `/plugin` switches all of it off.

## Judges

Haiku 5.5 is the default judge. It runs on the person's own Claude login, needs no key and takes about a second.

Jev is optional. It is a faster judge from TypeSafe (about a quarter of a second) and needs a TypeSafe key. With a key, Jev answers first. Haiku makes the call whenever Jev is unsure, takes longer than three seconds or fails. With "Haiku only" in the Judge settings, Jev is never asked, even when a key is set.

Where the key is kept:

- A key pasted in the setup or in Settings, "Judge", is saved through Claude Code into its secure storage (the Keychain on macOS). If Claude Code refuses, the key is not saved anywhere and the person is told to use `/plugin configure cgp-effort@crypto-gameplan`.
- `/plugin configure cgp-effort@crypto-gameplan` also stores it in secure storage.
- The plugin also reads the environment variable `TYPESAFE_API_KEY`, and, only when the judge is set to Jev outright, an existing `~/.config/jev/.env`. It never writes that file.

The "Test" button in the Judge settings sends one sample prompt to the chosen judge and says whether it answered and how fast.

If Jev stops answering, a "Judge down" alert says why (for example a rejected key or no credits) and Haiku judges in its place. If Haiku gets no answer, the prompt runs at the effort already picked.

## The bar

| On the bar | Meaning |
|---|---|
| High · Opus | The effort picked for this prompt and the model the chat runs on. "Deciding" while the judge thinks. A new effort flashes briefly. |
| ◔ 38% | How full the chat's context is. When Claude Code compacts earlier than the model's full window, the share counts against that smaller window. |
| cache 59:00 | Time until the prompt cache goes cold. |
| Auto | Switches the judge on and off. |
| Compact | Compacts the chat. It turns into "Handoff" when Haiku advises a fresh chat. |
| ⚙ | Settings. |

Hovering over the effort or the cache countdown shows a short explanation.

Settings, "Customize", "Look" switches between the bar ("Dashboard") and "Minimal", which shows only small buttons in the footer.

## Prompt cache and cold chats

Every request rereads the whole chat. Anthropic serves the repeated part from a prompt cache at a fraction of the price, but only while the cache is warm. It lives for one hour after the last request in most Claude Code use, sometimes five minutes. The countdown shows the time left.

Once the cache has gone cold, the next message pays full price to write the whole chat to the cache again. On a big chat (from 150,000 tokens) the bar then turns into a "Chat went cold" alert with "Compact", "Handoff" and "Not now".

### Keeping the cache warm

Settings, "Handoff & alerts", "Keep cache warm" offers "Off" (the default), "1 h", "2 h" and "3 h".

When it is on and the chat is big (from 150,000 tokens), the plugin sends a short request just before the cache would go cold. The request asks for a one-word reply on top of the chat, so the chat is read from the cache, which restarts its lifetime. It keeps doing this for the chosen time after the person's last message, then lets the cache go.

Each warm-up costs about a tenth of rereading the chat at full price, and a cold cache costs about 1.25 times on the next message. Keeping it warm pays when the person comes back within those hours. It never runs while a turn or a compaction is running, and never once the cache is already cold, because a request then would itself pay the full rewrite. `/cgp-effort stats` shows how often it ran and what it took.

## Compact and handoff

"Compact" summarizes the chat in place. The bar first asks for an optional note on what the summary should keep. By default Haiku 5.5 writes the summary of every compaction, including `/compact` and the automatic one, because it costs a fraction of the chat's own model. If Haiku fails, Claude Code compacts as usual. Settings, "Model", "Compact with" switches to the chat's own model.

"Handoff" writes a summary and continues in a clean chat:

- "Quick" takes a few seconds.
- "Full" checks git and saves the handoff as a file in the system's temp folder (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows), never in the project, so it cannot end up in a commit. If a handoff skill is set in Settings, that skill writes it instead.

Every handoff names the goal, what is done and how it was checked, what is open, git as last seen, the next steps (the first one runnable, steps for the person marked "needs user"), how to resume, what not to redo, and the skills the next chat should use. Anything the chat did not check itself is marked "(unverified)". Specs, issues, PRs and commits appear as paths or links, not copies. Keys, passwords and personal data are left out. The fresh chat receives the handoff as notes from the previous chat, not as the person's instructions, and asks before anything destructive or outward-facing.

`/cgp-effort handoff <what comes next>` aims the handoff at what the next chat is for, for example `/cgp-effort handoff full fix the login bug`. It keeps what bears on that and drops the rest. A handoff skill receives the same text as its argument.

Afterwards the handoff can clear the chat and carry on, clear it and wait for the person, or keep the chat and copy the handoff to the clipboard.

From 30% of context, Haiku looks at every second message and decides whether a fresh chat would serve better, for example because a task just finished and the next message starts something else. When it says yes, "Compact" turns into a lit "Handoff" with the reason. Settings, "Handoff & alerts", "Handoff button" set to "Always" keeps "Handoff" on the bar all the time.

## Alerts

| Alert | When it shows |
|---|---|
| Chat went cold | The cache has gone cold on a chat of 150,000 tokens or more. |
| Context | The context fills the share set in "Compact alert at" (70% by default). |
| Running hot | A 5-hour or weekly usage limit passes 80%. It offers "Save mode", which caps the effort at medium until the limit resets. Closed, it stays closed until the limit resets and comes back once at 95%. |
| Judge down | Jev stopped answering. Haiku judges in its place until Jev works again. |

Each alert has a ✕ that closes it for now. Settings, "Handoff & alerts", switches the context, running hot and cold cache alerts off for good.

## Settings

The settings open with ⚙ or `/cgp-effort settings`. Changes apply when "Save" is pressed.

| Card | What it holds |
|---|---|
| Effort | "Auto effort", the lean from cheapest to smartest, "Min" and "Max", and "Helpers". |
| Model | Whether a simple prompt may run on a cheaper model, and "Compact with". |
| Handoff & alerts | The handoff skill, "Compact alert at", "Handoff button", "Keep cache warm" and the alert switches. |
| Customize | "Look", "Appearance", the cache timer, the judge's line, "Animations" and "Uninstall". |
| Judge | Haiku with or without Jev, the TypeSafe key and "Test". |

"Helpers" (off by default) lets the judge pick an effort for each subagent the chat starts, never below medium. With it off, subagents run at the effort of the turn that started them.

"Cheaper when it can" in the Model card is experimental and off by default. It lets a prompt the judge calls simple run on Haiku 5.5 or Sonnet instead of the chat's model. It rarely pays in a chat that is in use, because each model keeps its own prompt cache and the other model first has to write the whole chat into its cache.

"Animations" in Customize stops the moving art in the bar and the alerts. The drawings then stand still.

## Commands

| Command | What it does |
|---|---|
| `/cgp-effort settings` | Opens the settings. |
| `/cgp-effort setup` | Opens the first-run setup again. |
| `/cgp-effort auto` | Switches Auto on or off for this chat. With "Auto effort" off in Settings it only says so. |
| `/cgp-effort handoff`, `/cgp-effort handoff full` | Hands off without the bar. Text after it says what the next chat is for. |
| `/cgp-effort stats` | What the prompts Auto steered cost this session, per effort, what the judge took, and the cache warm-ups. |
| `/cgp-effort save` | Switches save mode on or off. |
| `/cgp-effort cold`, `swamp`, `hot`, `down` | Shows that alert now, to try it. |
| `/cgp-effort bench` | Scores each available judge on labelled sample prompts. |
| `/cgp-effort debug` | What the plugin sees, including the model and effort of the last request. |
| `/cgp-effort update` | Checks for a new version now. |

## Data and costs

The prompt goes to the judge the person uses: Haiku through their Claude login, and with a TypeSafe key also to TypeSafe. The plugin sends nothing else anywhere. It runs `claude` to update or uninstall itself, `git` to see whether a new version is out, and a file copy of the new version on update.

The judge costs a small number of Haiku tokens per prompt, and the handoff advice a few more from 30% of context. Keeping the cache warm costs what is described above, and only when switched on.

## The terminal

The plugin draws in the terminal too, with small pixel art in its alerts. Below 90 columns the art is left out. If `/cgp-effort` says the plugin is not loaded after a restart, add this to `~/.claude/settings.json` and restart:

```json
{ "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" } }
```

## Troubleshooting

| What the person sees | What to do |
|---|---|
| `/cgp-effort` says the plugin is not loaded | Restart Claude Code. In the terminal, set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` as shown above. |
| The bar says "Paused" | The chat runs on a model where effort does not change. Switch to Opus 5.5 or Sonnet 5.5. |
| Auto is off without being switched off | The effort was changed in the app. Turn Auto back on. |
| "Judge down" | Check the reason in the alert, then the TypeSafe key, or switch to "Haiku only". |
| "Update failed" | Follow the message. If it names the Claude Code CLI, install it with the copied command and reopen the app. |
| A pasted key was not saved | Use `/plugin configure cgp-effort@crypto-gameplan`. |
| Bugs | Settings, "Report a bug", opens an issue on GitHub. |
