import { Server, Socket } from "socket.io";
import { WebServer } from "../WebServer";
import {ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo";
import {BoardServer} from "./BoardServer";
import {MatchData} from "../Utils/MatchData";

class GameServer {
    private server: Server;
    private board: BoardServer;

    private adminSocket: Socket;
    private matchOpen: boolean;
    
    constructor(expressServer: WebServer) {
        this.matchOpen = false;
        this.server = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(expressServer.getServer());

        this.server.on("connection", (socket) => {
            socket.once("joinGame", (username) => {
                let name = username || null;
                if(!name) return; // TODO: Send information to the client saying it's an invalid name

                socket.data.username = username;
                socket.join("playing");
                socket.emit("initialGameInfo", InitialBoardInfo.serialize(new InitialBoardInfo(this.board.serializeBoard())));
            });

            socket.once("loginAdmin", () => {
                // Only a socket from localhost can be assigned as admin
                if(socket.handshake.address == "::1") {
                    this.adminSocket = socket;

                    socket.on("createNewMatch", (data, callback) => {
                        this.createMatch(data);
                        callback(true);
                    });
                }
            });

            socket.on("isMatchOpen", (callback) => {
                callback(this.matchOpen);
            });


        });
    }

    public createMatch(data: MatchData) { // TODO: Do sanity check to verify if the length of the triangles array is correct
        this.board = new BoardServer(data.boardSize, data.triangles);
        this.matchOpen = true;
        this.server.sockets.emit("matchOpen");
    }

}

export { GameServer };