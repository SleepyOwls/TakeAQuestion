import { io, Socket } from "socket.io-client";
import { Renderer } from "./Renderer.js";
import { BoardClient } from "./BoardClient.js";
import {ClientToServerEvents, ServerToClientEvents} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo.js";
import {Vector2f} from "../Utils/Vector2f.js";
import {ClientInfoForm} from "./ClientInfoForm.js";
import {MatchCreator} from "./MatchCreator.js";
import {MatchData} from "../Utils/MatchData.js";

class Client {
    protected connectionLost: boolean;
    protected ioClient: Socket<ServerToClientEvents, ClientToServerEvents>;
    protected view: HTMLCanvasElement;
    protected renderer: Renderer;

    protected board: BoardClient | null = null;

    constructor() {
        this.setupView();

        this.ioClient = io();

        this.ioClient.on("connect", () => {
            this.connectionLost = false;
        });

        this.ioClient.on("disconnect", (reason) => {
            if(reason === "transport close") {
                this.connectionLost = true;
            }
        });

        this.ioClient.on("initialGameInfo", (info) => {
            let parsedInfo = InitialBoardInfo.deserialize(info);
            this.board = new BoardClient(parsedInfo, new Vector2f(Renderer.canvasWidth / 2, Renderer.canvasHeight / 2), this.renderer);
        });
    }

    private setupView() {
        this.view = document.getElementById("view") as HTMLCanvasElement;
        const context2D = this.view.getContext("2d");

        this.renderer = new Renderer(context2D);

        this.view.width = window.innerWidth;
        this.view.height = window.innerHeight;

        window.addEventListener("resize", () => {
            this.view.width = window.innerWidth;
            this.view.height = window.innerHeight;
        });
    }

    public render() {
        this.renderer.clear("#2a2a2a");

        if(this.board) this.board.render();

        // this.renderer.drawCircle(725, 550, 230, "#4c99e6", false);
        // this.renderer.drawText("Charadas de física", 725, 550, "black", false, 30, "Arial");
    }

    public updateView() {
        this.render();
        requestAnimationFrame(() => this.updateView());
    }

    public isConnected() {
        return this.ioClient.connected && !this.ioClient.disconnected;
    }

    public disconnect() {
        this.ioClient.disconnect();
    }

    public isConnectionLost() {
        return this.connectionLost;
    }
}

class PlayerClient extends Client {
    constructor() {
        super();

        this.ioClient.timeout(5000).emit("isMatchOpen", (err, isOpen) => {
            if(isOpen == true) {
                new ClientInfoForm((username) => {
                    this.ioClient.emit("joinGame", username);
                });
            } else {
                console.log("No match open at the moment");
            }
        });

        this.ioClient.on("matchOpen", () => {
            new ClientInfoForm((username) => {
                this.ioClient.emit("joinGame", username);
            });
        });

        this.updateView();
    }
}

class AdminClient extends Client {
    private creatingMatch: boolean;
    private matchCreator: MatchCreator;

    constructor() {
        super();

        this.ioClient.emit("loginAdmin");
        this.creatingMatch = true;
        this.matchCreator = new MatchCreator(this.renderer, this);

        this.updateView();
    }

    render() {
        super.render();
        if(this.creatingMatch) this.matchCreator.getPreviewBoard().render();
    }

    public createMatch(creator: MatchCreator) {
        this.ioClient.emit("createNewMatch", { boardSize: creator.getBoardSize(), triangles: creator.getTriangles() }, () => {
            this.creatingMatch = false;
           console.log("Match Created!");
        });
    }
}

export { Client, PlayerClient, AdminClient };
