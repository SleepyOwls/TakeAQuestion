import {io, Socket} from "socket.io-client";
import {Renderer} from "./Renderer.js";
import {BoardClient} from "./BoardClient.js";
import {ClientToServerEvents, ServerToClientEvents} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo.js";
import {Vector2f} from "../Utils/Vector2f.js";
import {MatchCreator} from "./MatchCreator.js";
import {Player} from "./Player.js";

import Swal from "sweetalert2";

abstract class Client {
    protected ioClient: Socket<ServerToClientEvents, ClientToServerEvents>;
    protected view: HTMLCanvasElement;
    protected renderer: Renderer;

    protected board: BoardClient | null = null;
    protected uuid: string;

    protected players: { [key: string]: Player };

    public static readonly characters = {
        ALBERT_EINSTEIN: document.createElement("img"),
        ISAAC_NEWTON: document.createElement("img"),
        NICOLA_TESLA: document.createElement("img"),
        STEPHEN_HAWKING: document.createElement("img"),
    }

    protected constructor() {
        this.players = {};
        this.loadCharacters();
        this.setupView();

        this.ioClient = io();

        this.ioClient.on("connect", () => {
            if(this.uuid) {
                this.ioClient.emit("reconnecting", this.uuid);
            }
        });

        this.ioClient.io.on("reconnect", () => { //TODO: Send player data when it's reconnecting
            Swal.fire({
                title: "Reconectado!",
                text: "A conexão com o servidor foi restabelecida!",
                icon: "success",
                toast: true,
                position: "top-right",
                showDenyButton: false,
                showConfirmButton: false,
                showCancelButton: false,
                timerProgressBar: true,
                timer: 3000
            });
        });

        this.ioClient.on("disconnect", (reason) => {
            if(reason === "transport close" || reason === "transport error") {
                Swal.fire({
                    title: "Desconectado!",
                    text: "Conexão com o servidor perdida!",
                    icon: "error",
                    toast: true,
                    position: "top-right",
                    showDenyButton: false,
                    showConfirmButton: false,
                    showCancelButton: false,
                    timerProgressBar: true,
                    timer: 3000
                });
            } else if(reason === "io server disconnect") {
                Swal.fire({
                    title: "Desconectado!",
                    text: "Você foi expulso da partida!",
                    icon: "error",
                    toast: true,
                    position: "top-right",
                    showDenyButton: false,
                    showConfirmButton: false,
                    showCancelButton: false,
                    timerProgressBar: true,
                    timer: 3000
                });
            }
        });

        this.ioClient.on("playerInfo", (data) => {
            this.uuid = data.uuid;
        });

        this.ioClient.on("initialGameInfo", (info) => {
            let parsedInfo = InitialBoardInfo.deserialize(info);
            this.setupBoard(parsedInfo);
        });

        this.ioClient.on("playerJoined", (info) => {
            this.players[info.uuid] = new Player(info.playerName, info.position, info.character, this.renderer, this.board);

            Swal.fire({
                title: "Novo Jogador!",
                text: `${ info.playerName } entrou no jogo!`,
                icon: "info",
                toast: true,
                timer: 2000,
                position: "bottom-right",
                showCancelButton: false,
                showConfirmButton: false,
                showDenyButton: false,
                timerProgressBar: true
            });
        });

        this.ioClient.on("playerDisconnected", (info) => {
            Swal.fire({
                title: "Jogador desconectado!",
                text: `${ info.playerName } saiu do jogo!`,
                icon: "warning",
                toast: true,
                timer: 2000,
                position: "bottom-right",
                showCancelButton: false,
                showConfirmButton: false,
                showDenyButton: false,
                timerProgressBar: true
            });

            delete this.players[info.uuid];
        });

        setTimeout(() => { this.ping(); }, 2000);
    }

    private ping() {
        if(!this.isConnected()) {
            this.board = null;
            this.players = {};
        }

        this.pingCheck();

        setTimeout(() => { this.ping(); }, 2000);
    }

    protected pingCheck(): void {}

    protected setupBoard(info: InitialBoardInfo) {
        this.board = new BoardClient({
            boardSize: info.getBoardSize(),
            triangles: info.getTriangleTypes()
        }, new Vector2f(Renderer.canvasWidth / 2, Renderer.canvasHeight / 2), this.renderer);

        let players = info.getPlayers();
        this.players = {};
        for(let i = 0; i < players.length; i++) {
            let p = players[i];
            this.players[p.uuid] = new Player(p.playerName, p.position, p.character, this.renderer, this.board);
        }
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

    private loadCharacters() {
        Client.characters.ALBERT_EINSTEIN.src = "/res/img/Characters/ALBERT_EINSTEIN.png";
        Client.characters.ISAAC_NEWTON.src = "/res/img/Characters/ISAAC_NEWTON.png";
        Client.characters.NICOLA_TESLA.src = "/res/img/Characters/NICOLA_TESLA.png";
        Client.characters.STEPHEN_HAWKING.src = "/res/img/Characters/STEPHEN_HAWKING.png";
    }

    public render() {
        this.renderer.clear("#2a2a2a");

        if(this.board) this.board.render();
        for(let playerId in this.players) this.players[playerId]?.render();
    }

    public updateView() {
        this.render();
        requestAnimationFrame(() => this.updateView());
    }

    public isConnected() {
        return this.ioClient.connected;
    }

    public disconnect() {
        this.ioClient.disconnect();
    }
}

class PlayerClient extends Client {
    constructor() {
        super();

        // @ts-ignore
        this.ioClient.timeout(5000).emit("isMatchOpen", (err, isOpen) => {
            if(isOpen) {
                this.openClientInfoForm();
            } else {
                Swal.fire({
                    title: "Erro",
                    text: "Nenhuma partida está aberta no momento!",
                    icon: "error",
                    backdrop: "none"
                });
            }
        });

        this.ioClient.on("matchOpen", () => {
            this.openClientInfoForm();
        });

        this.updateView();
    }

    private openClientInfoForm() {
        let playerName: string = "";
        let character: string = "";

        Swal.fire({
            title: "Entrar na partida",
            text: "Com qual nome você gostaria de jogar?",
            icon: "question",
            input: "text",
            showConfirmButton: true,
            showCancelButton: false,
            showDenyButton: false,
            confirmButtonText: "Escolher o personagem",
            inputPlaceholder: "Nome de usuário",
            backdrop: "none",
            inputValidator(inputValue: string) {
                if(!inputValue) return "Você precisa inserir um nome!";
                if(inputValue.length < 4) return "Seu nome precisa ter ao menos 4 caracteres";
                if(inputValue.length > 15) return "Seu nome deve ter no máximo 15 caracteres";
            }
        }).then((result) => {
            if(result.isConfirmed )
                playerName = result.value as string;

            Swal.fire({
                title: "Entrar na partida",
                text: "Qual personagem você gostaria de usar durante o jogo?",
                icon: "question",
                input: "select",
                inputOptions: {
                    ALBERT_EINSTEIN: "Albert Einstein",
                    NICOLA_TESLA: "Nicola Tesla",
                    ISAAC_NEWTON: "Isaac Newton",
                    STEPHEN_HAWKING: "Stephen Hawking"
                },
                showConfirmButton: true,
                showDenyButton: false,
                showCancelButton: false,
                confirmButtonText: "Entrar na partida",
                backdrop: "none"
            }).then((result) => {
                if(result.isConfirmed) {
                    character = result.value;

                    this.ioClient.emit("joinGame", { username: playerName, character: character });
                }
            });
        });
    }

    protected pingCheck() {
        if(!this.isConnected()) {
            this.ioClient.timeout(5000).emit("isMatchOpen", (isOpen) => {
                if(isOpen == true) {
                    this.openClientInfoForm();
                } else {
                    console.log("No match open at the moment");
                }
            });
        }
    }
}

class AdminClient extends Client {
    private creatingMatch: boolean;
    private matchCreator: MatchCreator;

    constructor() {
        super();

        this.ioClient.emit("loginAdmin");
        this.ioClient.emit("isMatchOpen", (isOpen) => {
            if(isOpen) {
                this.ioClient.emit("getBoard", (data) => {
                    let parsedInfo = InitialBoardInfo.deserialize(data);
                    this.setupBoard(parsedInfo);
                });
            } else {
                this.creatingMatch = true;
                this.matchCreator = new MatchCreator(this.renderer, this);
            }
        });

        this.updateView();
    }

    render() {
        super.render();
        if(this.creatingMatch) this.matchCreator.getPreviewBoard().render();
    }

    public createMatch(creator: MatchCreator) {
        this.ioClient.emit("createNewMatch", { boardSize: creator.getBoardSize(), triangles: creator.getTriangles() }, () => {
            this.board = new BoardClient({ boardSize: creator.getBoardSize(), triangles: creator.getTriangles() }, new Vector2f(Renderer.canvasWidth / 2, Renderer.canvasHeight / 2), this.renderer);
            this.matchCreator.destroy();
            delete this.matchCreator;
            this.creatingMatch = false;
        });
    }

    protected pingCheck() {
        if(!this.isConnected()) {
            console.log("server closed");
            this.matchCreator = new MatchCreator(this.renderer, this);
            this.creatingMatch = true;
        }
    }
}

export { Client, PlayerClient, AdminClient };
