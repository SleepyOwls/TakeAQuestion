import {Character, TriangleType} from "./Enums.js";

class InitialBoardInfo {
    private readonly boardSize: number;
    private readonly triangles: TriangleType[];
    private readonly players: { playerName: string, uuid: string, position: number, character: Character }[];

    constructor(info: { boardSize: number, triangles: number[], players: { playerName: string, uuid: string, position: number, character: Character }[] }) {
        this.boardSize = info.boardSize;
        this.triangles = info.triangles;
        this.players = info.players;
    }

    public getBoardSize() {
        return this.boardSize;
    }

    public getTriangleTypes() {
        return this.triangles;
    }

    public getPlayers() {
        return this.players;
    }

    public static serialize(info: InitialBoardInfo) {
        return JSON.stringify({ boardSize: info.getBoardSize(), triangles: info.triangles, players: info.players });
    }

    public static deserialize(info: string) {
        let triangles: TriangleType[] = [];
        let parsedInfo: Info = JSON.parse(info);

        for(let i of parsedInfo.triangles) {
            if(i == TriangleType.INITIAL.valueOf()) triangles.push(TriangleType.INITIAL);
            if(i == TriangleType.EMPTY.valueOf()) triangles.push(TriangleType.EMPTY);
            if(i == TriangleType.SURPRISE.valueOf()) triangles.push(TriangleType.SURPRISE);
        }

        return new InitialBoardInfo({ boardSize: parsedInfo.boardSize, triangles: triangles, players: parsedInfo.players });
    }
}

type Player = {
    playerName: string,
    uuid: string,
    position: number,
    character: Character,
}

interface Info {
    boardSize: number,
     triangles: number[],
    players: Player[]
}

export { InitialBoardInfo };