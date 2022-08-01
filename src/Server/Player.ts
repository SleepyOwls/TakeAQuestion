import {Socket} from "socket.io";
import {Character} from "../Utils/Enums";
import {ActionExecutor} from "./Cards";
import {BoardServer} from "./BoardServer";

class Player {
    private readonly _playerName: string;
    private readonly _character: Character;
    private _position: number;
    private _clientSocket: Socket;
    private _connected: boolean;
    private readonly _uuid: string;

    private board: BoardServer;

    private _advanceMultiplier: number;
    private _playerRoundCallback: () => Promise<void>;
    private _pass: boolean;
    private readonly _actionExecutor: ActionExecutor;
    private _previousSurpriseTriangle: number;
    private _movedForward: boolean = false;

    constructor(position: number = 0, playerName: string, character: Character, clientSocket: Socket, uuid: string, board: BoardServer) {
        this._position = position;
        this._playerName = playerName;
        this._clientSocket = clientSocket;
        this._uuid = uuid;
        this._connected = true;
        this._character = character;

        this.board = board;

        this._advanceMultiplier = 1;
        this._playerRoundCallback = () => { return new Promise<void>((resolve) => resolve()); };
        this._pass = false;
        this._actionExecutor = new ActionExecutor(this);
        this._previousSurpriseTriangle = -1;
    }

    public move(increment: number) {
        let i = increment * this.advanceMultiplier;
        if((increment < 0 && i > 0) || (increment > 0 && i < 0)) i *= -1;

        this._movedForward = increment > 0;
        this.previousSurpriseTriangle = -1;

        let toTheEnd = (this.board.boardSize) - (this.position);

        this.position = i >= toTheEnd ? 0 : this.position + i;
        this.advanceMultiplier = 1;
        console.log(`Moved player ${this.playerName} ${increment} houses! New Player Position is: ${this.position}`);
    }

    get position() {
        return this._position;
    }

    get playerName() {
        return this._playerName;
    }

    get character() {
        return this._character;
    }

    get socket() {
        return this._clientSocket;
    }

    get uuid() {
        return this._uuid;
    }

    get connected() {
        return this._connected;
    }

    get doPass() {
        let r = this._pass;
        this._pass = false
        return r;
    }

    get movedForward() {
        let r = this._movedForward;
        this._movedForward = false;
        return r;
    }

    get previousSurpriseTriangle() {
        return this._previousSurpriseTriangle;
    }

    get advanceMultiplier() {
        return this._advanceMultiplier;
    }

    set previousSurpriseTriangle(value) {
        this._previousSurpriseTriangle = value;
    }

    set pass(value: boolean) {
        this._pass = value;
    }

    set socket(value) {
        this._clientSocket = value;
    }

    set connected(value) {
        this._connected = value;
    }

    get playerRoundCallback() {
        return this._playerRoundCallback;
    }

    get actionExecutor() {
        return this._actionExecutor;
    }

    set playerRoundCallback(value) {
        this._playerRoundCallback = value;
    }

    set advanceMultiplier(value) {
        if(value <= 0) this._advanceMultiplier = 1;
        this._advanceMultiplier = value;
    }

    set position(value: number) {
        if(value < 0) value = 0;
        this._position = value;
    }
}

export { Player };