class Renderer {
    private context: CanvasRenderingContext2D;

    public static readonly canvasWidth = 3840;
    public static readonly canvasHeight = 2160;

    private xScale = window.innerWidth / Renderer.canvasWidth;
    private yScale = window.innerHeight / Renderer.canvasHeight;

    constructor(context: CanvasRenderingContext2D) {
        this.context = context;

        window.addEventListener("resize", () => {
            this.xScale = window.innerWidth / Renderer.canvasWidth;
            this.yScale = window.innerHeight / Renderer.canvasHeight;
        });
    }

    public drawRect(x: number, y: number, width: number, height: number, color: string) {
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
        this.context.fillStyle = "#fff";
    }

    public drawTriangle(x: number, y: number, width: number, height: number, color: string, outline: boolean, upsideDown: boolean) {
        x *= this.xScale;
        y *= this.yScale;

        width *= this.xScale;
        height *= this.yScale;

        this.context.save();

        this.context.translate(-(width / 2), upsideDown ? -(height / 2) : height / 2);

        this.context.beginPath();
        this.context.moveTo(x, y);
        this.context.lineTo(x + width, y);
        this.context.lineTo(x + (width / 2), upsideDown ? y + height : y - height);
        this.context.lineTo(x, y);

        if(outline) {
            this.context.strokeStyle = color;
            this.context.stroke();
            this.context.strokeStyle = "#fff";
        } else {
            this.context.fillStyle = color;
            this.context.fill();
            this.context.fillStyle = "#fff";
        }

        this.context.restore();
    }

    public drawImage(x: number, y: number, width: number, height: number, image: HTMLImageElement) {
        x *= this.xScale;
        y *= this.yScale;

        width *= this.xScale;
        height *= this.yScale;

        this.context.save();
        this.context.drawImage(image, 0, 0, image.width, image.height, x, y, width, height);
        this.context.restore();
    }

    public drawCircle(x: number, y: number, radius: number, color: string, outline: boolean) {
        x *= this.xScale;
        y *= this.yScale;

        radius *= this.xScale;

        this.context.beginPath();

        this.context.arc(x, y, radius, 0, Math.PI * 2, true);
        
        if(outline) {
            this.context.strokeStyle = color;
            this.context.stroke();
            this.context.strokeStyle = "#fff";
        } else {
            this.context.fillStyle = color;
            this.context.fill();
            this.context.fillStyle = "#fff";
        }
    }

    public drawText(text: string, x: number, y: number, color: string, outline: boolean, pixelSize: number, font: string) {
        x *= this.xScale;
        y *= this.yScale;

        pixelSize *= this.xScale;

        this.context.save();

        this.context.font = `${pixelSize}px ${font}`;
        this.context.textAlign = "center";

        if(outline) {
            this.context.strokeStyle = color;
            this.context.strokeText(text, x, y);
            this.context.strokeStyle = "#fff";
        } else {
            this.context.fillStyle = color;
            this.context.fillText(text, x, y);
            this.context.fillStyle = "#fff";
        }

        this.context.restore();
    }

    public clear(color: string) {
        this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.context.fillStyle = color;
        this.context.fillRect(0, 0, window.innerWidth, window.innerHeight);
        this.context.fillStyle = "#fff";
    }
}

export { Renderer };