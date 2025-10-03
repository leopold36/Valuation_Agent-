# Electron + Vite + React + SQLite Template

A modern Electron application template with Vite, React 19, TypeScript, Tailwind CSS, and SQLite database integration.

## Features

- ⚡ **Vite** - Fast development server and build tool
- ⚛️ **React 19** - Latest React with hooks
- 🔷 **TypeScript** - Type-safe code
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🗄️ **SQLite** - Embedded database with better-sqlite3
- 📦 **Electron** - Cross-platform desktop app framework

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

### 1. Clone or fork this repository

```bash
git clone <your-repo-url>
cd template-electron-vite
```

### 2. Install dependencies

```bash
npm install
```

This will automatically rebuild native modules (like better-sqlite3) for Electron via the postinstall script.

### 3. Run the development server

```bash
npm run electron:dev
```

This will:
- Start the Vite dev server on http://localhost:5173
- Launch the Electron app with DevTools open
- Enable hot module replacement for React components

## Available Scripts

- `npm run dev` - Start Vite dev server only
- `npm run electron:dev` - Start both Vite and Electron in development mode
- `npm run build` - Build the app for production
- `npm run dist` - Build and package the app with electron-builder

## Project Structure

```
.
├── src/                    # React application source
│   ├── App.tsx            # Main React component
│   ├── main.tsx           # React entry point
│   └── database.ts        # SQLite database setup
├── main.js                # Electron main process
├── preload.js             # Electron preload script
├── index.html             # HTML entry point
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Database

The template includes better-sqlite3 for SQLite integration. The database is initialized in `src/database.ts` with a sample `projects` table.

### IPC Handlers

The following IPC handlers are available:

- `projects:getAll` - Get all projects
- `projects:create` - Create a new project
- `projects:get` - Get a specific project by ID

## Customization

### Rename the Project

Update the `name` field in `package.json`:

```json
{
  "name": "your-app-name"
}
```

### Add More Database Tables

Edit `src/database.ts` to add more tables in the `init()` function.

### Configure Electron Window

Edit `main.js` to customize window properties, size, and behavior.

## Troubleshooting

### Native Module Issues

If you encounter issues with better-sqlite3 or other native modules:

```bash
npm run postinstall
```

Or manually rebuild:

```bash
npx electron-rebuild
```

### Port Already in Use

If port 5173 is in use, Vite will automatically try another port. Check the console output for the actual URL.

## Building for Production

### Build the App

```bash
npm run build
```

This compiles TypeScript and builds the React app to the `dist/` directory.

### Create Distributable

```bash
npm run dist
```

This creates platform-specific distributables using electron-builder.

## License

ISC
