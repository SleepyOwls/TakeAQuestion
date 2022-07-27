import {Socket} from "socket.io";
import {Character} from "../Utils/Enums";

class Player {
    private readonly playerName: string;
    private readonly character: Character;
    private position: number;
    private clientSocket: Socket;
    private connected: boolean;
    private uuid: string;

    constructor(position: number = 0, playerName: string, character: Character, clientSocket: Socket, uuid: string) {
        this.position = position;
        this.playerName = playerName;
        this.clientSocket = clientSocket;
        this.uuid = uuid;
        this.connected = true;
        this.character = character;
    }

    public moveTo(position: number) {
        this.position = position;
    }

    public getPosition() {
        return this.position;
    }

    public getPlayerName() {
        return this.playerName;
    }

    public getCharacter() {
        return this.character;
    }

    public getSocket() {
        return this.clientSocket;
    }

    public getId() {
        return this.uuid;
    }

    public isConnected() {
        return this.connected;
    }

    public setSocket(socket: Socket) {
        this.clientSocket = socket;
    }

    public setConnected(connected: boolean) {
        this.connected = connected;
    }
}

export { Player };