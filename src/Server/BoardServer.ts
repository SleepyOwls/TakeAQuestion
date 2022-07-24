import {TriangleType} from "../Utils/Enums";

class BoardServer {
    private readonly size: number;
    private triangles: TriangleServer[];

    constructor(size: number, triangles: number[] = []) {
        this.size = size;
        this.triangles = [];

        for(let i = 0; i < triangles.length; i++) {
            let t = triangles[i];

            if(t == 0) this.triangles.push(new TriangleServer(TriangleType.INITIAL));
            else if(t == 1) this.triangles.push(new TriangleServer(TriangleType.EMPTY));
            else if(t == 2) this.triangles.push(new TriangleServer(TriangleType.SURPRISE));
        }
    }

    // private makeBoard() {
    //     this.triangles = [];
    //     this.triangles.push(new TriangleServer(TriangleType.INITIAL));
    //     for(let i = 1; i < this.size + (this.size - 3) * 2 + 1; i++) {
    //         this.triangles.push(new TriangleServer(Math.random() > 0.5 ? TriangleType.EMPTY : TriangleType.SURPRISE));
    //     }
    // }

    public serializeBoard() {
        let serializedTriangles: number[] = [];

        for(let i = 0; i < this.triangles.length; i++)
            serializedTriangles.push(this.triangles[i].getType().valueOf());

        return { boardSize: this.size, triangles: serializedTriangles };
    }
}

class TriangleServer {
    private readonly type: TriangleType;

    constructor(triangleType: TriangleType) {
        this.type = triangleType;
    }

    public getType() {
        return this.type;
    }
}

export { BoardServer };

