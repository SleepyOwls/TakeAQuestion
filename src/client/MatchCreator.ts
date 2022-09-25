import {TriangleType} from "../Utils/Enums.js";
import {BoardClient} from "./BoardClient.js";
import {Renderer} from "./Renderer.js";
import {AdminClient} from "./Client";

class MatchCreator {
    private boardSize: number;
    private renderer: Renderer;
    private client: AdminClient;
    private triangles: TriangleType[];
    private readonly previewBoard: BoardClient;
    private controls: MatchCreatorControls;

    constructor(renderer: Renderer, client: AdminClient) {
        this.boardSize = 15;
        this.renderer = renderer;
        this.client = client;
        this.previewBoard = new BoardClient(null, renderer);
        this.controls = new MatchCreatorControls(this);

        this.makeBoard();
    }

    public makeBoard() {
        this.triangles = [];
        this.triangles[0] = TriangleType.INITIAL;

        for(let i = 1; i < this.boardSize + (this.boardSize - 3) * 2 + 1; i++)
            this.triangles[i] = Math.random() > 0.5 ? TriangleType.EMPTY : TriangleType.SURPRISE;

        this.previewBoard.setSize(this.boardSize);
        this.previewBoard.setTriangles(this.triangles);
    }

    public finishMatchConfiguration() {
        this.client.createMatch(this);
    }

    public destroy() {
        this.controls.destroy();
        this.controls = null;
    }

    public setBoardSize(newSize: number) {
        this.boardSize = newSize;
        this.makeBoard();
    }

    public getPreviewBoard() {
        return this.previewBoard;
    }

    public getBoardSize() {
        return this.boardSize;
    }

    public getTriangles() {
        return this.triangles;
    }
}

class MatchCreatorControls {
    private readonly matchCreator: MatchCreator;

    private readonly panel: HTMLDivElement;
    private readonly boardRelatedTitle: HTMLHeadingElement;
    private readonly boardRelated: HTMLDivElement;
    private readonly regenerateTrianglesButton: HTMLButtonElement;
    private readonly boardSizeInput: HTMLInputElement;

    private readonly createMatchButton: HTMLButtonElement;
    private previousBoardSize: number;

    constructor(creator: MatchCreator) {
        this.matchCreator = creator;

        this.panel = document.createElement("div");
        this.boardRelated = document.createElement("div");
        this.boardSizeInput = document.createElement("input");
        this.boardRelatedTitle = document.createElement("h1");
        this.regenerateTrianglesButton = document.createElement("button");
        this.createMatchButton = document.createElement("button");

        this.previousBoardSize = 15;

        this.boardRelated.id = "boardRelatedControls";
        this.boardRelatedTitle.id = "title";
        this.boardRelatedTitle.innerText = "Tabuleiro";
        this.regenerateTrianglesButton.id = "regenerateTriangles";
        this.regenerateTrianglesButton.textContent = "Recriar Tabuleiro";

        this.createMatchButton.id = "createMatch";
        this.createMatchButton.textContent = "Criar Partida";

        this.panel.id = "creatorPanel";

        this.boardSizeInput.type = "number";
        this.boardSizeInput.min = "9";
        this.boardSizeInput.max = "101";
        this.boardSizeInput.value = "15";
        this.boardSizeInput.id = "boardSize";

        this.setupCallbacks();

        this.boardRelated.appendChild(this.boardSizeInput);
        this.boardRelated.appendChild(this.boardRelatedTitle);
        this.boardRelated.appendChild(this.regenerateTrianglesButton);

        this.panel.appendChild(this.createMatchButton);

        this.panel.appendChild(this.boardRelated);
        document.body.appendChild(this.panel);
    }

    private setupCallbacks() {
        this.boardSizeInput.addEventListener("change", () => {
            if(this.boardSizeInput.valueAsNumber < 9) this.boardSizeInput.valueAsNumber = 9;
            if(this.boardSizeInput.valueAsNumber > 101) this.boardSizeInput.valueAsNumber = 101;

            if(this.boardSizeInput.valueAsNumber % 2 == 0) {
                if(this.previousBoardSize > this.boardSizeInput.valueAsNumber) this.boardSizeInput.valueAsNumber -= 1;
                else this.boardSizeInput.valueAsNumber += 1;

                this.previousBoardSize = this.boardSizeInput.valueAsNumber;
            }

            this.matchCreator.setBoardSize(this.boardSizeInput.valueAsNumber);
        });

        this.regenerateTrianglesButton.addEventListener("click", () => {
            this.matchCreator.makeBoard();
        });

        this.createMatchButton.addEventListener("click", () => {
            this.matchCreator.finishMatchConfiguration();
        });
    }

    public destroy() {
        this.createMatchButton.remove();
        this.boardRelatedTitle.remove();
        this.boardSizeInput.remove();
        this.regenerateTrianglesButton.remove();
        this.boardRelated.remove();
        this.panel.remove();
    }
}

export { MatchCreator };