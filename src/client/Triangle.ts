import {Vector2f} from "../Utils/Vector2f";
import {BoardClient} from "./BoardClient";

class Triangle {
    private readonly position: Vector2f;
    private readonly upsideDown: boolean;
    private readonly color: string;
    private readonly index: number;

    private board: BoardClient;

    constructor(position: Vector2f, upsideDown: boolean, color: string, index: number, board: BoardClient) {
        this.position = position;
        this.upsideDown = upsideDown;
        this.color = color;
        this.index = index;

        this.board = board;
    }

    public render() {
        this.board.renderTriangle(this.position.x, this.position.y, this.color, this.upsideDown);
    }

    public getPosition() {
        return this.position;
    }

    public getIndex() {
        return this.index;
    }

    public isUpsideDown() {
        return this.upsideDown;
    }
}

export { Triangle };