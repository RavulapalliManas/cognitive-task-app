const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = !app.isPackaged;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In production, we load the static file.
    // In dev, you likely want to run 'next dev' separately and load localhost, 
    // OR you can build and load the file. 
    // For this bundling task, we prioritize the build artifact.
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    if (isDev) {
        mainWindow.loadURL(startUrl).catch(() => {
            // Fallback if dev server isn't running, maybe they just built it?
            mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
        });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startBackend() {
    let backendPath;
    let args = [];

    if (isDev) {
        // In dev, use the python interpreter from the env or system
        // We assume 'uvicorn' is installed and we run main:app
        // Alternatively, we run a python script that calls uvicorn
        // Let's assume the user runs backend manually in Dev usually.
        // But if we want to spawn it:
        backendPath = 'python3';
        args = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000', '--app-dir', path.join(__dirname, '../cognitive backend')];
        console.log('Starting Python backend in Dev mode...');
    } else {
        // In production, the backend is an executable in resources
        // The path depends on how we configure electron-builder
        // We will put the executable in a folder named 'backend' inside resources
        backendPath = path.join(process.resourcesPath, 'backend', 'main');
        console.log('Starting Python backend from:', backendPath);
    }

    // Only spawn in PROD automatically, or if desired in DEV.
    // Spawning in DEV can collide with existing terminals.
    // Let's ONLY spawn in production to be safe, or if explicit.
    if (!isDev) {
        backendProcess = spawn(backendPath, args);

        backendProcess.stdout.on('data', (data) => {
            console.log(`Backend: ${data}`);
        });

        backendProcess.stderr.on('data', (data) => {
            console.error(`Backend Error: ${data}`);
        });

        backendProcess.on('close', (code) => {
            console.log(`Backend process exited with code ${code}`);
        });
    }
}

app.on('ready', () => {
    startBackend();
    // Give backend a moment to start? Next.js is static, so it loads instantly.
    // The API calls might fail if backend isn't ready.
    // We could implement a wait-for-localhost, but for now just start window.
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
