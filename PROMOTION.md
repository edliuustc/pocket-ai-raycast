# Pocket AI sharing kit

## Published

- [Website and interactive demo](https://edliuustc.github.io/pocket-ai-raycast/)
- [Installation and setup guides](https://edliuustc.github.io/pocket-ai-raycast/guides.html)
- [Launch announcement and discussion](https://github.com/edliuustc/pocket-ai-raycast/discussions/1)
- [Raycast Store draft PR #33370](https://github.com/raycast/extensions/pull/33370)
- [1280x640 share image](media/social-preview.png), [genuine Windows screenshot](media/native-dictionary.png), and [30-second illustrated walkthrough](media/workflow-demo.gif)

The website has canonical URLs, crawlable HTML, description/title metadata, Open Graph/Twitter preview tags, application structured data, and a [sitemap](https://edliuustc.github.io/pocket-ai-raycast/sitemap.xml). Repository description/topics and homepage identify Pocket AI as a Raycast AI alternative.

On November 10, 2026, the two public website pages were submitted to IndexNow. Its endpoint returned **HTTP 202: received, ownership validation pending**. The project-scoped verification file is intentionally public. This is not a claim that the pages are indexed, and it is not a Google Search Console submission. [IndexNow response definitions](https://www.indexnow.org/documentation).

## Owner actions that need separate access

### GitHub repository social preview

The website's share card is active through its Open Graph metadata. The repository's own social preview is a separate setting and has **not** been set.

In the repository's **Settings > Social preview > Edit > Upload an image**, upload `media/social-preview.png`. It is 1280x640 and under 1 MB. [GitHub's upload instructions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

### Google Search Console

1. Sign into [Search Console](https://search.google.com/search-console/) with the Google account that should manage this site.
2. Add a **URL-prefix** property for `https://edliuustc.github.io/pocket-ai-raycast/`, not the whole `github.io` domain.
3. Choose HTML-file verification. Put Google's exact verification file in this repository's `docs` folder without changing its filename/content. Commit/push it, wait for Pages deployment, confirm its public URL works, then click Verify.
4. Submit `sitemap.xml` under Sitemaps.
5. Inspect the landing page and `guides.html`; use **Request Indexing** if available.

Keep the verification file after verification. Search Console owner/full-user access is required to request indexing. Neither submission nor verification guarantees inclusion or ranking. [Google's indexing guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

### Raycast Store readiness

The Store PR is **draft**, not accepted, published, or marked ready for review.

1. Provide your registered Raycast author username. The upstream Store validator rejected `edliu_microsoft` with **404 / Invalid author**; the public `edliuustc` profile also returned 404. The draft keeps the existing author rather than inventing an identity. Once your actual account is available, update the draft's author and rerun validation.
2. Use Raycast's **Capture Window** to save genuine **2000x1250 PNG** metadata captures. Aim for three: chat/model selection, a dictionary/writing workflow, and remote-agent activity. The README screenshot is genuine Windows UI but is not Store-format metadata; the GIF is explicitly an illustration.
3. Resolve the guideline against separate configuration commands with a Store-appropriate UX decision. The draft identifies the current Remote Agents/provider/settings commands. The working source product has not been silently changed to remove them.
4. Exercise the exact final distribution build in native Raycast after any changes, then mark the PR ready and respond to review.

The draft already includes the runtime source, lockfile, used 512px icon, onboarding help, changelog, tests, and media outside runtime assets. [Store requirements](https://developers.raycast.com/basics/prepare-an-extension-for-store).

## Ready-to-post community messages

Only the project's own GitHub announcement has been posted. The following external messages are **prepared, not posted**. Use an account you control and a channel that permits project showcases; do not use upstream bug trackers as advertising channels.

### Raycast community

> Pocket AI is an open-source Raycast AI alternative for macOS and Windows. Bring your own OpenAI-compatible provider, stream rich replies, and ask follow-ups in the top input bar. Dictionary, translation, polishing, and custom tools support your own shortcuts and prompts. Ask AI can also connect to your Hermes/OpenClaw harness. No Raycast Pro required; provider costs are separate. Source installation is available now; Store submission is still draft.
>
> Demo and installation: https://edliuustc.github.io/pocket-ai-raycast/
>
> Source: https://github.com/edliuustc/pocket-ai-raycast

Use the [Raycast community](https://www.raycast.com/community) and choose an appropriate showcase/extensions channel after reading its current posting rules.

### Hermes community

> Running Hermes on another machine? Pocket AI can use Raycast as its frontend: discovered agent profiles, streamed responses, server-owned sessions, tool activity, approvals, and cancellation. The harness keeps execution and context; Raycast is the client. Built-in Ask AI switches between Hermes, OpenClaw, and direct models without replaying drafts. Free/open-source extension for Mac and Windows; your server/provider costs are separate. Protocol boundaries and setup are documented.
>
> Setup: https://github.com/edliuustc/pocket-ai-raycast/blob/main/REMOTE-AGENTS.md
>
> Demo: https://edliuustc.github.io/pocket-ai-raycast/

### OpenClaw community

> Pocket AI adds a native Raycast frontend for your OpenClaw gateway on Mac and Windows. It uses the official gateway client with device pairing, isolated server sessions, streamed chat/tool activity, approvals, and remote abort. Switch back to direct models or Hermes inside Ask AI; contexts stay separate. The gateway still owns tools and execution. No Raycast Pro required; gateway/provider access is yours.
>
> Setup and supported protocol: https://github.com/edliuustc/pocket-ai-raycast/blob/main/REMOTE-AGENTS.md
>
> Demo: https://edliuustc.github.io/pocket-ai-raycast/

For Hermes/OpenClaw, use the community links in each upstream project's current README, then its showcase/integrations channel. Neither project's disabled GitHub Discussions nor issue tracker has received a promotional post.

### Short social post

> Your models. Your agents. Inside Raycast.
>
> Pocket AI: open-source Raycast AI alternative for Mac + Windows. Streaming chat, dictionary, translation, writing tools, and Hermes/OpenClaw. No Pro required; provider costs separate.
>
> https://edliuustc.github.io/pocket-ai-raycast/

Attach `media/social-preview.png`. Label `media/workflow-demo.gif` an **illustrated walkthrough**, not a native screen recording.
