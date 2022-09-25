import { app, BrowserWindow } from "electron";
import * as dotenv from "dotenv";
import {Game} from "../index";

class Window {
    private win: BrowserWindow;
    
    constructor() {
        this.win = new BrowserWindow({
            width: 854,
            height: 480,
            webPreferences: { nodeIntegration: false, contextIsolation: true,  },
            title: "Painel de administrador"
        });

        if(process.platform !== 'darwin') this.win.removeMenu();

        app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
        this.win.loadURL("http://localhost:8080/admin");
        this.win.setTitle("Painel de administrador");

        if(process.env["DEV_ENV"] && process.env["DEV_ENV"] === "true") this.win.webContents.openDevTools({ mode: "detach" });
    }
}

let env = dotenv.config();
if(env.error && process.env.DEBUG) console.log(`${env.error.message}${env.error.stack ? ": " + env.error.stack : ""}`);

new Game();

app.whenReady().then(() => new Window());
app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) new Window(); });