# Atlas Lines

A mobile-first, illustrated Northeast railway strategy game. Connect ten cities, manage growing passenger queues, play cards with costs and consequences, and survive 24 seasons. Designed for a relaxed 10–15 minute run; turns are player-paced, never timed.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. To test the production output:

```sh
npm test
npm run build
npx vite preview --host 0.0.0.0
```

## Exact GitHub Pages deployment

1. Create a GitHub repository and push these files (including `package-lock.json` and `.github/workflows/pages.yml`) to its `main` branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Open **Actions → Deploy Atlas Lines → Run workflow**, select `main`, and click **Run workflow**. Subsequent pushes to `main` deploy automatically.
5. Wait for the workflow's `deploy` job to finish. Open the URL shown in the deployment step or **Settings → Pages**: `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

No backend, API keys, domain, or server configuration required. Vite builds with relative asset paths so repository subpaths work. Do not deploy the raw source files via “Deploy from a branch”; deploy `dist` using the supplied workflow.

## Rules

- Two actions each season. Building a route or playing a card consumes one action. Unused actions expire.
- Route cost uses approximate geographic distance. Each route serves 3 passengers at **each endpoint** per season. Capacity stacks across routes; the MVP abstracts passenger destinations.
- Each season adds demand, serves queues, awards score, then pays income (5 base funds plus 1 per served city). Demand rises at seasons 7, 13, and 19, and prosperous cities attract up to 3 extra passengers per season.
- Congestion is total waiting passengers divided by 160, expressed as a percentage. At 100% the game ends. Survive season 24 to win.
- Cards are replaced immediately in a deterministic deck. Grants and surveys apply to the next route; stations and boom towns permanently attract demand; express service and bonds incur upkeep.
- Optional challenges every four completed seasons reward 4 funds and reduce every city's queue by one. Wrong answers and skips carry no penalty.
- Tap a card to read its complete effect. After selecting a city-targeted card, tap its city. Express Line targets the rail line itself.
- First-launch onboarding is stored locally. The `?` button reopens it. Sound is opt-in; reduced-motion preferences disable animations. A run resets on page reload.

## Structure and validation

`game.js` is a deterministic, DOM-independent simulation. `app.js` renders it and handles interaction. `style.css` and the functional SVG board handle responsive presentation. Google Fonts are optional; readable system fallbacks remain offline.

```sh
npm test
npx playwright install --with-deps chromium webkit
npm run build
# In one terminal:
mkdir -p /tmp/atlas-preview/atlas-lines
cp -r dist/* /tmp/atlas-preview/atlas-lines/
python3 -m http.server 4173 --directory /tmp/atlas-preview
# In another:
npm run test:browser
```

Browser QA uses Playwright Chromium and WebKit with iPhone viewports, checks overflow, onboarding, cards, route construction, challenges, and full winning/losing loops at a GitHub Pages-style subpath. WebKit is a Safari engine compatibility check, not a claim of testing on physical iPhone hardware. Before a public launch, open the actual GitHub Pages URL on an iPhone and verify taps, landscape rotation, audio opt-in, and safe-area layout.
