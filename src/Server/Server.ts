import {Server, Socket} from "socket.io";
import {WebServer} from "../WebServer";
import {ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo";
import {BoardServer} from "./BoardServer";
import {MatchData} from "../Utils/MatchData";
import {Player} from "./Player";

import {v4 as uuid} from "uuid";
import {Character} from "../Utils/Enums";

class GameServer {
    private server: Server;
    private board: BoardServer;

    private adminSocket: Socket;
    private matchOpen: boolean;

    private readonly players: { [key: string]: Player };
    
    constructor(expressServer: WebServer) {
        this.matchOpen = false;
        this.players = {};
        this.server = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(expressServer.getServer());

        this.server.on("connection", (socket) => {
            socket.on("disconnect", () => {
                socket.removeAllListeners();

                if(this.doesPlayerExist(socket.data.uuid)) {
                    let p = this.getPlayer(socket.data.uuid);
                    p.setConnected(false);

                    setTimeout(() => {
                        if(!p.isConnected()) {
                            this.server.in(["playing", "admin"]).emit("playerDisconnected", { playerName: p.getPlayerName(), uuid: socket.data.uuid });
                            this.removePlayer(socket.data.uuid);
                        }
                    }, 8000);
                }
            });

            socket.once("reconnecting", (userId) => {
                if(this.doesPlayerExist(userId)) {
                    let p = this.getPlayer(userId);
                    if(socket.id != p.getSocket().id) return;

                    p.setConnected(true);

                    socket.data.username = p.getPlayerName();
                    socket.data.uuid = userId;

                    socket.join("playing");
                    socket.emit("initialGameInfo", InitialBoardInfo.serialize(new InitialBoardInfo(this.serializeInfo())));
                    socket.emit("playerInfo", { uuid: userId, position: p.getPosition() });
                }
            });

            socket.once("joinGame", (info) => {
                let name = info.username || null;

                if(!name || !info.character) return;
                if(name.length < 4 || name.length > 15) return;

                let pos: number = 0;

                if(!socket.data.uuid) {
                    socket.data.username = name;
                    socket.data.character = info.character;
                    socket.data.uuid = uuid();
                    this.addPlayer(socket);
                } else pos = this.getPlayer(socket.data.uuid).getPosition();

                socket.join("playing");
                socket.emit("initialGameInfo", InitialBoardInfo.serialize(new InitialBoardInfo(this.serializeInfo())));
                socket.emit("playerInfo", { uuid: socket.data.uuid, position: 0 });

                this.server.in(["playing", "admin"]).emit("playerJoined", { playerName: name, character: info.character, position: pos, uuid: socket.data.uuid });
            });

            socket.on("isMatchOpen", (callback) => {
                callback(this.matchOpen);
            });

            socket.once("loginAdmin", () => {
                // Only a socket from localhost can be assigned as admin
                if(socket.handshake.address == "::1") {
                    this.adminSocket = socket;
                    socket.join("admin");

                    socket.on("createNewMatch", (data, callback) => {
                        this.createMatch(data);
                        callback();
                    });

                    socket.on("getBoard", (callback) => {
                        callback(InitialBoardInfo.serialize(new InitialBoardInfo(this.serializeInfo())));
                    });
                }
            });
        });
    }

    public serializeInfo() {
        let serializedBoard = this.board.serializeBoard();
        let parsedPlayers: { playerName: string, uuid: string, position: number, character: Character }[] = [];

        for(let playerId in this.players) {
            let p = this.players[playerId];

            parsedPlayers.push({
                playerName: p.getPlayerName(),
                uuid: p.getId(),
                character: p.getCharacter(),
                position: p.getPosition()
            });
        }

        return { boardSize: serializedBoard.boardSize, triangles: serializedBoard.triangles, players: parsedPlayers };
    }

    public doesPlayerExist(uuid: string) {
        let p = this.players[uuid] || undefined;
        if(p) return true;
    }

    public addPlayer(socket: Socket) {
        this.players[socket.data.uuid] = new Player(0, socket.data.username, socket.data.character, socket, socket.data.uuid);
    }

    public removePlayer(uuid: string) {
        delete this.players[uuid];
    }

    public getPlayer(uuid: string) {
        return this.players[uuid] || undefined;
    }

    public createMatch(data: MatchData) {
        if(data.boardSize < 5 || data.boardSize > 101 || data.boardSize % 2 == 0) return;
        if(data.triangles.length != data.boardSize + (data.boardSize - 3) * 2 + 1) return;

        this.board = new BoardServer(data.boardSize, data.triangles);
        this.matchOpen = true;
        this.server.sockets.emit("matchOpen");
    }

}

export { GameServer };