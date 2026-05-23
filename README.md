# Switchtec Pricing Engine

Premium React + TypeScript quoting app for Australian residential solar and battery installs.

## Local Development

Use Node 20.19 or newer. Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/`. Use `npm run preview` to test the built app locally.

## Windows Desktop App

The app can be packaged as a Windows desktop app with Electron. The desktop app loads the built Vite app locally, works offline after install, and keeps settings/quotes in the app's local storage on that computer.

```bash
npm install
npm run electron:build
```

Build output is generated in `dist-electron/`.

Expected Windows artifacts:

- Installer `.exe`
- Portable `.exe`

For development with a live Vite server inside Electron:

```bash
npm run electron:dev
```

The desktop window is configured as **Switchtec Pricing Engine** with a 1400 x 900 default size and secure renderer settings (`contextIsolation: true`, `nodeIntegration: false`).

## Phone / PWA Install

The web app includes a manifest and service worker so it can be installed from a browser on phones and tablets.

After deploying online:

1. Open the deployed app URL on the phone.
2. On iPhone Safari, tap **Share** then **Add to Home Screen**.
3. On Android Chrome, tap the menu then **Install app** or **Add to Home screen**.

Phone data is stored locally on that phone using browser `localStorage`. Settings, quotes and supplier data are not shared between devices unless a backend is added later.

## How to install on iPhone

1. Open the app link in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.
5. Open **Switchtec** from the home screen.

Settings and quotes save locally on that iPhone. PDF export depends on the print/share support available in the installed Safari web app.

## Deploying Online

This is a standard Vite + React app. Push the repo to GitHub, then connect it to a hosting provider.

Upload the project source files to GitHub, not only `dist/index.html`. The repo must include:

- `src/`
- `public/`
- `electron/`
- `index.html`
- `package.json`
- `package-lock.json`
- `electron-builder.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `tsconfig.json`
- `tsconfig.node.json`
- `vercel.json`
- `netlify.toml`
- `README.md`

Do not upload `node_modules/`, `dist/`, `dist-electron/`, `.vite-temp/`, old ZIP files, logs, or TypeScript build info files.

The production styling depends on the CSS entry files inside `src/`, especially `src/index.css` and `src/tailwind.generated.css`. If either the `src/` folder, `tailwind.config.js`, or `postcss.config.js` is missing from GitHub, Vercel may build a tiny CSS file and the app will look like raw HTML.

Before deploying locally, use Node 20.19+ and run:

```bash
npm install
npm run build
npm run preview
```

### Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New Project** and import the GitHub repo.
3. Use the Vite defaults:
   - Framework preset: `Vite`
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

Vercel will build the app from source and serve the generated `dist` folder. The Switchtec logo is stored in `public/switchtec-logo.png`, so it is copied into the production build automatically.

### Netlify

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site** then **Import an existing project**.
3. Connect the GitHub repo.
4. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20.19` or newer
5. Deploy.

### Local Storage Notes

The app stores user data in the browser using `localStorage`, including:

- Pricing settings
- Manual products
- Saved quotes
- Imported Tradezone products
- Supplier product overrides

This means each browser/device keeps its own local quoting data. Deploying online does not create a shared database or user accounts.

## Features

- Dashboard calculator with solar, battery, roof, phase and inverter inputs
- Central inverter and pricing config in `src/config/pricing.json`
- Editable settings persisted to local storage
- 2026 tiered battery rebate logic
- Solar STC calculation with editable deeming years
- Install/margin rule with stepped pricing
- Saved local quotes and re-open workflow
- Printable client quote page with browser PDF export
