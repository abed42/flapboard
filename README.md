<p align="center">
  <img src="public/flapboard-logo.svg" alt="Flapboard" width="120" height="120">
</p>

<h1 align="center">Flapboard</h1>

<p align="center">
  A live split-flap signup board for your product — the kind you'd mount on the office wall.
</p>

<p align="center">
  <a href="#what-it-does"><strong>What it does</strong></a> ·
  <a href="#quick-start"><strong>Quick start</strong></a> ·
  <a href="#how-it-works"><strong>How it works</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy</strong></a> ·
  <a href="#kiosk-mode"><strong>Kiosk mode</strong></a> ·
  <a href="#customization"><strong>Customization</strong></a>
</p>

<br/>

## What it does

Flapboard renders your live user count on an animated split-flap display —
the mechanical departure boards from old train stations — complete with the
clattering flip sound. Every time someone signs up:

- the count flips up in real time (no refresh, no polling),
- confetti and emoji cannons fire,
- a celebration sound plays.

Leave it fullscreen on a TV in the office and watch signups roll in.

**Built with:** [Next.js](https://nextjs.org) (App Router) ·
[Supabase](https://supabase.com) (auth, database, realtime) ·
[Tailwind CSS](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) ·
[Motion](https://motion.dev) · [canvas-confetti](https://github.com/catdad/canvas-confetti)

It also ships with Supabase's complete password-based auth flow
(sign-up, login, forgot/update password, protected pages), so the signups it
counts can come from this very app — or from any other app pointed at the same
Supabase project.

## Quick start

### 1. Get the code

This repo is a template — click **Use this template** on GitHub (or fork it),
then clone your copy:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
pnpm install   # or npm install / yarn
```

### 2. Create a Supabase project

Create a free project at [database.new](https://database.new) (skip this if
you already have one — Flapboard can point at an existing project and count
its existing users).

### 3. Set up the database

Open your project's **SQL Editor** in the Supabase dashboard, paste the
contents of [`supabase/setup.sql`](supabase/setup.sql), and run it. It creates:

- a `signup_events` table whose inserts drive the realtime updates,
- a `get_signup_count()` function the board calls for the total,
- a trigger that records an event whenever a user signs up.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in both values from **Project Settings → API keys** in your Supabase
dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

> [!NOTE]
> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` refers to Supabase's new
> **publishable** key format, but legacy **anon** keys work in this variable
> too — paste whichever your dashboard shows.

### 5. Run it

```bash
pnpm dev
```

Open [localhost:3000](http://localhost:3000), click **ENTER** at the gate
(the click unlocks browser audio), and the board cascades in with your live
count. Sign up a test user at `/auth/sign-up` to watch it flip.

## How it works

```
new user signs up (any app on this Supabase project)
        │
        ▼
auth.users INSERT ──trigger──▶ public.signup_events INSERT
                                       │
                                       ▼  Supabase Realtime
                          board hears the INSERT, calls
                          get_signup_count() ──▶ count flips up,
                          confetti + sound fire
```

- The board server-renders the initial count via the `get_signup_count()` RPC
  (a `SECURITY DEFINER` function, so the client key never reads `auth.users`
  directly — only a single number crosses the wire).
- The client subscribes to `INSERT` events on `signup_events` over Supabase
  Realtime and re-fetches the count when one arrives. The events table is
  deliberately content-free (just an id and timestamp), so nothing sensitive
  is ever broadcast.
- Because the trigger sits on `auth.users`, **any** app using the same
  Supabase project feeds the board — your real product's signups count, not
  just this app's.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabed42%2Fflapboard&project-name=flapboard&repository-name=flapboard)

Or push your copy to GitHub and import it at
[vercel.com/new](https://vercel.com/new). Set the two environment variables
from step 4 in the Vercel project settings — that's the entire configuration.

## Kiosk mode

Flapboard is built to run unattended on a wall-mounted display:

- The **fullscreen toggle** (bottom corner) takes the board fullscreen; the
  **sound toggle** mutes/unmutes without reloading.
- Browsers block audio until a user gesture, which is what the ENTER gate is
  for. On a dedicated kiosk, launch Chrome with
  `--autoplay-policy=no-user-gesture-required` and the gate skips itself —
  the board starts on its own after every reboot.
- Chrome also learns to allow autoplay on sites you use often (Media
  Engagement), so the gate tends to disappear naturally on a machine that
  shows the board daily.

## Customization

| What | Where |
| --- | --- |
| Board title, footer, quote | `components/signup-split-flap-board.tsx` — `title`, `footer`, `quote` consts |
| Delay before the quote flips in | `QUOTE_DELAY_MS` in the same file |
| Confetti emoji | `emojiSet` in the same file |
| Signup celebration sound | replace `public/signup-sound.mp3` |
| Flap click sound sprite | `public/sounds/sound.ogg`, sliced in `lib/flap-sound.ts` |
| Logo | replace `public/flapboard-logo.svg` (used in the nav and the ENTER gate) |
| Board dimensions | `rowCount` / `colCount` props on `TextFlippingBoard` |
| Site title & description | `app/layout.tsx` metadata |
| Favicon & social images | `app/favicon.ico`, `app/opengraph-image.png`, `app/twitter-image.png` |

The split-flap component itself lives in
`components/ui/text-flipping-board.tsx` and is self-contained — feel free to
lift it into other projects.

## License

[MIT](LICENSE) — use it, fork it, mount it on your wall.
