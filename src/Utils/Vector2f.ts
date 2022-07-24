class Vector2f {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public add(other: Vector2f) {
        return new Vector2f(this.x + other.x, this.y + other.y);
    }
}

export { Vector2f };