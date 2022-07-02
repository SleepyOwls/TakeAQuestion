import { Server, Socket } from "socket.io";
import { WebServer } from "../WebServer";

class GameServer {
    private server: Server;
    
    constructor(expressServer: WebServer) {
        this.server = new Server(expressServer.getServer());

        this.server.on("connection", (socket) => {
            console.log("Connection made!");
        });
    }
}

export { GameServer };