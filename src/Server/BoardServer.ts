import {TriangleType} from "../Utils/Enums";

class BoardServer {
    private readonly size: number;
    private readonly triangles: TriangleServer[];

    constructor(size: number, triangles: number[] = []) {
        this.size = size;
        this.triangles = [];

        for(let i = 0; i < triangles.length; i++) {
            let t = triangles[i];

            if(t == TriangleType.INITIAL.valueOf()) this.triangles[i] = new TriangleServer(TriangleType.INITIAL);
            else if(t == TriangleType.EMPTY.valueOf()) this.triangles[i] = new TriangleServer(TriangleType.EMPTY);
            else if(t == TriangleType.SURPRISE.valueOf()) this.triangles[i] = new TriangleServer(TriangleType.SURPRISE);
        }
    }

    public isTriangleSurpriseType(index: number) {
        return this.triangles[index].type == TriangleType.SURPRISE;
    }

    public serializeBoard() {
        let serializedTriangles: number[] = [];

        for(let i = 0; i < this.triangles.length; i++) serializedTriangles.push(this.triangles[i].type.valueOf());
        return { boardSize: this.size, triangles: serializedTriangles };
    }

    get boardSize(){
        return this.triangles.length;
    }
}

class TriangleServer {
    private readonly _type: TriangleType;

    constructor(triangleType: TriangleType) {
        this._type = triangleType;
    }

    get type() {
        return this._type;
    }
}

export { BoardServer };

