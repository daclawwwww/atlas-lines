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

- **Goal:** survive 24 seasons. Lose if queues reach **160 waiting passengers** (100% congestion), or funds fall below zero after upkeep. Prosperity measures successful deliveries: 5 points each, with no points for construction.
- **Journeys:** each city has a named destination, shown on the map as `+new → destination`. The badge is its current waiting queue. Tap a city to see the destination highlighted and inspect its journey. Passengers only leave the queue when they actually arrive at their destination.
- **Transfers:** passengers can travel along multiple connected lines. Every line on their journey uses one seat; every station visited uses one unit of station throughput. Journeys prefer shortest geographic rail paths and can use alternatives when the shortest path is full. Oldest passengers are served first, with round-robin dispatch among origins of the same age.
- **Capacity:** ordinary lines carry 6 passengers total per season, shared by both directions and transfers. Stations handle 12 passengers per season. Orange lines are forecast to run full. Train animations only appear on lines with forecast traffic.
- **Two actions per season:** building a route or playing a card consumes one. Unused actions expire. Longer geographic routes cost more funds. A direct route can bypass full hubs but costs more than a local connection.
- **Preview first:** selecting two cities shows the route's actual effect on this season's deliveries, queues, and net income. Forecasts run the same simulation as dispatch and include the Grant's extra demand. A disconnected or unnecessary line can deliver zero extra passengers.
- **Demand:** arrives before service each season. It rises at seasons 9 and 17. Prosperous cities attract one extra passenger per season; upgrades attract one, and Boom Towns two. Destinations are deterministic in this MVP.
- **Income:** 3 base subsidy plus 1 fund per 3 delivered passengers, plus 2 for each Boom Town that actually delivers passengers. Upkeep costs 1 per 4 built routes, plus 1 per Express Line, plus 2 during each of the Civic Bonds' five repayment seasons.
- **Cards:** Grant discounts the next line by 4 funds and adds 2 passengers at each endpoint. Survey discounts by 2 and adds 2 seats. Station Upgrade costs 4 funds for 6 extra station throughput and 1 extra demand. Express costs 3 for 4 extra line seats, with 1 upkeep each season. Boom Town adds 2 income when served and 2 demand. Civic Bonds provides 8 now and charges 10 over five seasons. Each replaces itself from a deterministic deck.
- **Dispatch forecast:** tap the forecast beside End Season for every city's queue equation, missing connections, full stations, and the treasury calculation. Completing an unhelpful line cannot reduce queues just by touching a city.
- Optional challenges every four completed seasons reward 4 funds and remove a waiting ticket at every city. Wrong answers and skips have no penalty.
- First-launch onboarding is stored locally and versioned; the `?` button reopens it. Sound is opt-in; reduced-motion preferences disable animations. A run resets on page reload.

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

Browser QA uses Playwright Chromium and WebKit with iPhone viewports, checks overflow in the map and route-preview states, onboarding, city destinations, helpful versus irrelevant line previews, exact forecast/dispatch agreement, cards, challenges, and full winning/losing loops at a GitHub Pages-style subpath. WebKit is a Safari engine compatibility check, not a claim of testing on physical iPhone hardware. Before a public launch, open the actual GitHub Pages URL on an iPhone and verify taps, landscape rotation, audio opt-in, and safe-area layout.
