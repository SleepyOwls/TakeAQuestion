import {Character} from "../Utils/Enums";
import {Renderer} from "./Renderer.js";
import {Client} from "./Client.js";
import {BoardClient} from "./BoardClient.js";
import {Vector2f} from "../Utils/Vector2f.js";

class Player {
    private _position: number;
    private readonly _character: HTMLImageElement;
    private readonly _playerName: string;

    private renderer: Renderer;
    private board: BoardClient;
    private client: Client;

    private animateTo: Vector2f;
    private animMovementSpeed: Vector2f;
    private animCurrentPos: Vector2f;

    private previousFPS: number = 60;

    constructor(playerName: string, position: number, character: Character, renderer: Renderer, client: Client) {
        this.renderer = renderer;
        this.board = client.board;
        this.client = client

        this._playerName = playerName;
        this._character = Client.characters[character];

        this._position = position;
        this.position = position;
    }

    public render() {
        if(this.animateTo.x != this.animCurrentPos.x || this.animateTo.y != this.animCurrentPos.y) {
            let toFinishAnimX = +Math.abs(this.animateTo.x - this.animCurrentPos.x).toFixed(1);
            let toFinishAnimY = +Math.abs(this.animateTo.y - this.animCurrentPos.y).toFixed(1);

            let fps = this.client.framerate == 0 ? this.previousFPS : this.client.framerate;
            this.previousFPS = fps;

            let movementX = +((this.animateTo.x - this.animCurrentPos.x) / (1.5 * fps)).toFixed(1);
            let movementY = +((this.animateTo.y - this.animCurrentPos.y) / (1.5 * fps)).toFixed(1);
            this.animMovementSpeed = new Vector2f(movementX, movementY);

            if(this.animMovementSpeed.x > toFinishAnimX) this.animMovementSpeed.x = this.animateTo.x;
            if(this.animMovementSpeed.y > toFinishAnimY) this.animMovementSpeed.y = this.animateTo.y;

            this.animCurrentPos = this.animCurrentPos.add(this.animMovementSpeed);

            if (this.animCurrentPos.x == this.animateTo.x && this.animCurrentPos.y == this.animateTo.y) {
                this.animMovementSpeed = new Vector2f(0, 0);
                this.animCurrentPos = this.animateTo;
            }
        }

        this.renderer.drawText(this._playerName, this.animCurrentPos.x, this.animCurrentPos.y - 120, "white",
            false, 50, "Arial");
        this.renderer.drawImage(this.animCurrentPos.x, this.animCurrentPos.y, 180, 180, this._character);
    }

    get playerName() {
        return this._playerName;
    }

    get character() {
        return this._character;
    }

    set position(value: number) {
        this.animateTo = this.board.getTriangle(value).getPosition();
        this.animCurrentPos = this.board.getTriangle(this._position).getPosition();

        this._position = value;
    }
}

export { Player }