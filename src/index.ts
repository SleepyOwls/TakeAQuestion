import { WebServer } from "./WebServer";
import * as dotenv from "dotenv";
import { GameServer } from "./Server/Server";

class Game { // https://socket.io/   Use canvas
    private webServer: WebServer;
    private gameServer: GameServer;

    constructor() {
        var env = dotenv.config();
        if(env.error) console.log(console.log(`${env.error.message}${env.error.stack ? ": " + env.error.stack : ""}`));

        this.webServer = new WebServer();
        this.gameServer = new GameServer(this.webServer);
    }
}

const game = new Game();