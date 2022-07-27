import {Character} from "../Utils/Enums";
import {Renderer} from "./Renderer.js";
import {Client} from "./Client.js";
import {BoardClient} from "./BoardClient.js";

class Player {
    private position: number;
    private readonly character: HTMLImageElement;
    private readonly playerName: string;

    private renderer: Renderer;
    private board: BoardClient;

    constructor(playerName: string, position: number, character: Character, renderer: Renderer, board: BoardClient) {
        this.playerName = playerName;
        this.position = position;
        this.character = Client.characters[character];

        this.renderer = renderer;
        this.board = board;
    }

    public render() {
        let pos = this.board.getTriangle(this.position).getPosition();

        this.renderer.drawText(this.playerName, pos.x, pos.y - 120, "white", false, 50, "Arial");
        // this.renderer.drawText(this.playerName, pos.x, pos.y - 120, "black", true, 50, "Arial");
        this.renderer.drawImage(pos.x, pos.y, 180, 180, this.character);
    }
}

export { Player }