# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application built with:
- **Electron** (main process in Node.js/CommonJS)
- **React 19** + **TypeScript** (renderer process)
- **Vite** (dev server and build tool)
- **better-sqlite3** (local SQLite database)
- **Tailwind CSS** (styling)

The app follows a classic Electron architecture with three main components:
1. **Main process** (`main.js`) - manages windows, lifecycle, and IPC handlers
2. **Preload script** (`preload.js`) - exposes safe APIs to renderer via context bridge
3. **Renderer process** (`src/`) - React app that runs in the browser window

## Development Commands

```bash
# Install dependencies (automatically rebuilds native modules for Electron)
npm install

# Run app in development mode (starts Vite dev server + Electron)
npm run electron:dev

# Build React app for production
npm run build

# Create distributable packages
npm run dist

# Run Vite dev server only
npm run dev

# Rebuild native modules if needed
npm run postinstall
# or
npx electron-rebuild
```

## Architecture

### IPC Communication Pattern

Communication between React (renderer) and Node.js (main) happens via IPC:

1. **Main process** (`main.js`) - registers IPC handlers in `setupIPC()`:
   - `projects:*` - CRUD operations for projects
   - `db:*` - database introspection methods

2. **Preload script** (`preload.js`) - exposes typed API to renderer:
   ```javascript
   window.electronAPI.projects.getAll()
   window.electronAPI.db.getTables()
   ```

3. **React components** - call APIs via `window.electronAPI`

### Database Layer

`src/database.js` (CommonJS) exports a singleton `DatabaseManager`:
- Initializes SQLite database in user data directory
- Creates schema on first run
- Provides methods for CRUD and introspection
- Database file location: `app.getPath('userData')/app.db`

### React Application Structure

- `src/main.tsx` - entry point, mounts React app
- `src/App.tsx` - main component with project list, detail view, and database viewer
- `src/DatabaseViewer.tsx` - modal component for browsing database tables
- `src/types.ts` - TypeScript type definitions

## Important Notes

### Native Modules

This project uses `better-sqlite3`, a native Node module. After installing dependencies or changing Node/Electron versions, native modules must be rebuilt for Electron:

```bash
npm run postinstall
```

If you see errors about missing modules during `npm run electron:dev`, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Development Mode

In development (`npm run electron:dev`):
- Vite dev server runs on `http://localhost:5173`
- Main process waits for Vite to be ready before launching window
- DevTools open automatically
- Hot module replacement enabled for React components

If port 5173 is in use, Vite will try another port, but the script expects 5173 - kill any processes on that port first.

### Production Build

The build process:
1. `npm run build` - TypeScript compilation + Vite build → `dist/` folder
2. `npm run dist` - runs build + electron-builder → creates installers

In production, `main.js` loads `dist/index.html` instead of `http://localhost:5173`.
