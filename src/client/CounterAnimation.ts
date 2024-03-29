import { Renderer } from "./Renderer.js";

class CounterAnimation {
    private static readonly sizeIncrement: number = 2;

    private size: number;
    private displayNumber: number;
    private renderer: Renderer;

    private d: number;

    constructor(initialSize: number, displayNumber: number, renderer: Renderer) {
        this.size = initialSize;
        this.displayNumber = displayNumber;
        this.renderer = renderer;
    }

    public render() {
        let currentTime = Date.now();
        if(!this.d) this.d = currentTime;
        if(currentTime - this.d >= 1000) return;
        this.d = currentTime;

        this.renderer.drawText(String(this.displayNumber), Renderer.canvasWidth / 2, Renderer.canvasHeight / 2, "#fff", false, this.size, "Arial");
        this.size += CounterAnimation.sizeIncrement;
    }
}

export { CounterAnimation };