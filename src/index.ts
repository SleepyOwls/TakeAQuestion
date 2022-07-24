import { WebServer } from "./WebServer";
import { GameServer } from "./Server/Server";

class Game {
    private readonly webServer: WebServer;
    private gameServer: GameServer;

    constructor() {
        this.webServer = new WebServer();
        this.gameServer = new GameServer(this.webServer);
    }
}

export { Game };

// Compile Project: electron-packager D:\_OTHER\SleepyOwls\Repositories\Charadas-de-fisica Charadas --platform=win32 --arch=x64