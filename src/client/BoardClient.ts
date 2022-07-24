import {Renderer} from "./Renderer";
import {InitialBoardInfo} from "../Utils/BoardInfo";
import {Triangle} from "./Triangle.js";
import {Vector2f} from "../Utils/Vector2f.js";
import {TriangleType} from "../Utils/Enums.js";

class BoardClient {
    private size: number;
    private renderer: Renderer;
    private position: Vector2f;
    private triangles: Triangle[];

    private readonly defaultTriangleSize = new Vector2f(250, 250);
    private triangleSize = new Vector2f(250, 250);

    constructor(boardInfo: InitialBoardInfo, boardPosition: Vector2f, renderer: Renderer) {
        this.size = boardInfo ? boardInfo.getBoardSize() : 15;
        this.renderer = renderer;
        this.position = boardPosition;
        this.triangles = [];

        if(boardInfo) this.calculateTrianglePositions(this.size, boardInfo.getTriangleTypes());
    }

    public renderTriangle(x: number, y: number, color: string, upsideDown: boolean) {
        this.renderer.drawTriangle(x, y, this.triangleSize.x, this.triangleSize.y, color, false, upsideDown);
        this.renderer.drawTriangle(x, y, this.triangleSize.x, this.triangleSize.y, "black", true, upsideDown);
    }

    private calculateTrianglePositions(size: number, triangleTypes: TriangleType[]) {
        this.triangleSize = new Vector2f(this.defaultTriangleSize.x * (15 / size), this.defaultTriangleSize.y * (15 / size));

        let first = new Vector2f(this.position.x - ((size / 4.3) * this.triangleSize.x), this.position.y - ((size - 1) / 4.3) * this.triangleSize.y + (this.triangleSize.y / 2));
        this.triangles.push(new Triangle(first, false, "#f5f542", 0, this));
        let lastPosition = new Vector2f(0, 0);

        let typeIndex = 0;
        let incrementX = this.triangleSize.x / 2;
        let incrementY = this.triangleSize.y;
        for(let i = 1; i < size; i++) {
            let position = new Vector2f(first.x + incrementX, first.y);
            let upsideDown = i % 2 != 0;
            let color = triangleTypes[typeIndex] == TriangleType.EMPTY ? "#f54e42" : "#4ce66d";

            typeIndex++;
            incrementX += this.triangleSize.x / 2;
            this.triangles.push(new Triangle(position, upsideDown, color, typeIndex, this));

            if(i >= size - 1) lastPosition = position;
        }

        incrementX = 0;
        for(let i = 0; i < size - 3; i++) {
            let position = new Vector2f(lastPosition.x - incrementX, lastPosition.y + incrementY);
            let upsideDown = i % 2 == 0;
            let color = triangleTypes[typeIndex] == TriangleType.EMPTY ? "#f54e42" : "#4ce66d";

            typeIndex++;
            incrementX += (i % 2 == 0 ? (this.triangleSize.x / 2) : 0);
            incrementY += (i % 2 != 0 ? this.triangleSize.y : 0);
            this.triangles.push(new Triangle(position, upsideDown, color, typeIndex, this));

            if(i >= size - 4) lastPosition = position;
        }

        let color = triangleTypes[typeIndex] == TriangleType.EMPTY ? "#f54e42" : "#4ce66d";
        let position = new Vector2f(lastPosition.x - (this.triangleSize.x / 2), lastPosition.y);
        this.triangles.push(new Triangle(position, !this.triangles[this.triangles.length - 1].isUpsideDown(), color, typeIndex, this));
        lastPosition = position;

        incrementX = this.triangleSize.x / 2;
        incrementY = 0;
        for(let i = 0; i < size - 3; i++) {
            let position = new Vector2f(lastPosition.x - incrementX, lastPosition.y - incrementY);
            let upsideDown = i % 2 != 0;
            let color = triangleTypes[typeIndex] == TriangleType.EMPTY ? "#f54e42" : "#4ce66d";

            typeIndex++;
            incrementX += (i % 2 == 0 ? (this.triangleSize.x / 2) : 0);
            incrementY += (i % 2 != 0 ? this.triangleSize.y : 0);
            this.triangles.push(new Triangle(position, upsideDown, color, typeIndex, this));

            if(i >= size - 4) lastPosition = position;
        }
    }

    public render() {
        for(let i = 0; i < this.triangles.length; i++) {
            this.triangles[i].render();
        }

        // this.renderTriangle(200, 200, "#f5f542", false);
        // this.renderTriangle(275, 200, "#f54e42", true);
        // this.renderTriangle(350, 200, "#4ce66d", false);
        // this.renderTriangle(350 + 75, 200, "#4ce66d", true);
        // this.renderTriangle(500, 200, "#4ce66d", false);
        // this.renderTriangle(500 + 75, 200, "#f54e42", true);
        // this.renderTriangle(650, 200, "#f54e42", false);
        // this.renderTriangle(350 + 375, 200, "#f54e42", true);
        // this.renderTriangle(350 + 75 + 375, 200, "#4ce66d", false);
        // this.renderTriangle(350 + 150 + 375, 200, "#f54e42", true);
        // this.renderTriangle(875 + 75, 200, "#4ce66d", false);
        // this.renderTriangle(875 + 150, 200, "#f54e42", true);
        // this.renderTriangle(875 + 150 + 75, 200, "#f54e42", false);
        // this.renderTriangle(875 + 300, 200, "#4ce66d", true);
        // this.renderTriangle(875 + 375, 200, "#f54e42", false);
        //
        // this.renderTriangle(875 + 375, 350, "#4ce66d", true);
        // this.renderTriangle(875 + 300, 350, "#4ce66d", false);
        // this.renderTriangle(875 + 300, 500, "#f54e42", true);
        // this.renderTriangle(1100, 500, "#4ce66d", false);
        // this.renderTriangle(1100, 650, "#f54e42", true);
        // this.renderTriangle(1100 - 75, 650, "#f54e42", false);
        // this.renderTriangle(1100 - 75, 800, "#4ce66d", true);
        // this.renderTriangle(1100 - 150, 800, "#f54e42", false);
        // this.renderTriangle(1100 - 150, 950, "#f54e42", true);
        // this.renderTriangle(1100 - 150 - 75, 950, "#f54e42", false);
        // this.renderTriangle(1100 - 150 - 75, 1100, "#f54e42", true);
        //
        // this.renderTriangle(1100 - 300, 1100, "#4ce66d", false);
        // this.renderTriangle(1100 - 300 - 75, 1100, "#f54e42", true);
        // this.renderTriangle(1100 - 300 - 150, 1100, "#4ce66d", false);
        // this.renderTriangle(1100 - 600 + 75, 1100, "#f54e42", true);
        //
        // this.renderTriangle(1100 - 600 + 75, 1100 - 150, "#4ce66d", false);
        // this.renderTriangle(1100 - 600, 1100 - 150, "#f54e42", true);
        // this.renderTriangle(1100 - 600, 1100 - 300, "#f54e42", false);
        // this.renderTriangle(1100 - 675, 1100 - 300, "#4ce66d", true);
        // this.renderTriangle(1100 - 675, 1100 - 450, "#4ce66d", false);
        // this.renderTriangle(1100 - 750, 1100 - 450, "#f54e42", true);
        // this.renderTriangle(1100 - 750, 1100 - 600, "#4ce66d", false);
        // this.renderTriangle(1100 - 750 - 75, 1100 - 600, "#f54e42", true);
        // this.renderTriangle(1100 - 750 - 75, 1100 - 750, "#4ce66d", false);
        // this.renderTriangle(1100 - 900, 1100 - 750, "#4ce66d", true);
    }

    public setSize(newSize: number) {
        this.size = newSize;
    }

    public setTriangles(newBoard: TriangleType[]) {
        this.triangles = [];
        this.calculateTrianglePositions(this.size, newBoard);
    }
}

export { BoardClient };