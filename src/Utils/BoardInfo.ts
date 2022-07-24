import {TriangleType} from "./Enums.js";

class InitialBoardInfo {
    private readonly boardSize: number;
    private readonly triangles: TriangleType[];

    constructor(info: { boardSize: number, triangles: number[] }) {
        this.boardSize = info.boardSize;
        this.triangles = info.triangles;
    }

    public getBoardSize() {
        return this.boardSize;
    }

    public getTriangleTypes() {
        return this.triangles;
    }

    public static serialize(info: InitialBoardInfo) {
        return JSON.stringify({ boardSize: info.getBoardSize(), triangles: info.triangles });
    }

    public static deserialize(info: string) {
        return new InitialBoardInfo(JSON.parse(info));
    }
}

export { InitialBoardInfo };