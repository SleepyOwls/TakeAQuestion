import {Renderer} from "./Renderer.js";
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

    constructor(boardInfo: { boardSize: number, triangles: number[] }, renderer: Renderer) {
        this.size = boardInfo ? boardInfo.boardSize : 15;
        this.renderer = renderer;
        this.position = new Vector2f(Renderer.canvasWidth / 2, Renderer.canvasHeight / 2);
        this.triangles = [];

        if(boardInfo) this.calculateTrianglePositions(this.size, boardInfo.triangles);
    }

    public renderTriangle(x: number, y: number, color: string, upsideDown: boolean) {
        this.renderer.drawTriangle(x, y, this.triangleSize.x, this.triangleSize.y, color, false, upsideDown);
        this.renderer.drawTriangle(x, y, this.triangleSize.x, this.triangleSize.y, "black", true, upsideDown);
    }

    private calculateTrianglePositions(size: number, triangleTypes: TriangleType[]) {
        let triangleSizeX = this.defaultTriangleSize.x * (15 / size);
        let triangleSizeY = this.defaultTriangleSize.y * (15 / size);
        this.triangleSize = new Vector2f(triangleSizeX, triangleSizeY);

        let firstPosX = this.position.x - ((size / 4.3) * this.triangleSize.x);
        let firstPosY = this.position.y - ((size - 1) / 4.3) * this.triangleSize.y + (this.triangleSize.y / 2);
        let first = new Vector2f(firstPosX, firstPosY);

        this.triangles.push(new Triangle(first, false, "#f5f542", 0, this));
        let lastPosition = new Vector2f(0, 0);

        let getTriangleColor = (type) => type === TriangleType.EMPTY.valueOf() ? "#f54e42" : "#4ce66d";

        let typeIndex = 0;
        let incrementX = this.triangleSize.x / 2;
        let incrementY = this.triangleSize.y;
        for(let i = 1; i < size; i++) {
            typeIndex++;

            let position = new Vector2f(first.x + incrementX, first.y);
            let upsideDown = i % 2 != 0;
            let color = getTriangleColor(triangleTypes[typeIndex]);

            incrementX += this.triangleSize.x / 2;
            this.triangles.push(new Triangle(position, upsideDown, color, triangleTypes[typeIndex], this));

            if(i >= size - 1) lastPosition = position;
        }

        incrementX = 0;
        for(let i = 0; i < size - 3; i++) {
            typeIndex++;

            let position = new Vector2f(lastPosition.x - incrementX, lastPosition.y + incrementY);
            let upsideDown = i % 2 == 0;
            let color = getTriangleColor(triangleTypes[typeIndex]);

            incrementX += (i % 2 == 0 ? (this.triangleSize.x / 2) : 0);
            incrementY += (i % 2 != 0 ? this.triangleSize.y : 0);
            this.triangles.push(new Triangle(position, upsideDown, color, triangleTypes[typeIndex], this));

            if(i >= size - 4) lastPosition = position;
        }

        typeIndex++;
        let color = getTriangleColor(triangleTypes[typeIndex]);
        let position = new Vector2f(lastPosition.x - (this.triangleSize.x / 2), lastPosition.y);

        this.triangles.push(new Triangle(position, !this.triangles[this.triangles.length - 1].isUpsideDown(),
            color, triangleTypes[typeIndex], this));

        lastPosition = position;

        incrementX = this.triangleSize.x / 2;
        incrementY = 0;
        for(let i = 0; i < size - 3; i++) {
            typeIndex++;

            let position = new Vector2f(lastPosition.x - incrementX, lastPosition.y - incrementY);
            let upsideDown = i % 2 != 0;
            let color = getTriangleColor(triangleTypes[typeIndex]);

            incrementX += (i % 2 == 0 ? (this.triangleSize.x / 2) : 0);
            incrementY += (i % 2 != 0 ? this.triangleSize.y : 0);
            this.triangles.push(new Triangle(position, upsideDown, color, triangleTypes[typeIndex], this));

            if(i >= size - 4) lastPosition = position;
        }
    }

    public render() {
        for(let i = 0; i < this.triangles.length; i++)
            this.triangles[i].render();
    }

    public getTriangle(index: number) {
        return this.triangles[index];
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