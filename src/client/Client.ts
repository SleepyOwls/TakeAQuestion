import {io, Socket} from "socket.io-client";
import {Renderer} from "./Renderer.js";
import {BoardClient} from "./BoardClient.js";
import {ClientToServerEvents, ServerToClientEvents} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo.js";
import {MatchCreator} from "./MatchCreator.js";
import {Player} from "./Player.js";
import { CounterAnimation } from "./CounterAnimation.js";

import Swal from "sweetalert2";

abstract class Client {
    protected ioClient: Socket<ServerToClientEvents, ClientToServerEvents>;
    protected view: HTMLCanvasElement;
    protected renderer: Renderer;

    protected _board: BoardClient;
    protected uuid: string;

    protected players: { [key: string]: Player };

    private fpsCounting: number = 0;
    protected frameRate: number = 0;

    protected playerTurn: string = "";

    protected doTenSecCounter: boolean;
    protected counterAnimation: CounterAnimation;

    private confettiRendererInterval;
    private confettiRemoverInterval;
    private confettiContainer: HTMLDivElement;

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

        this.doTenSecCounter = false;

        this.ioClient.on("connect", () => {
            if(this.uuid) this.ioClient.emit("reconnecting", this.uuid);
        });

        this.ioClient.io.on("reconnect", () => {
            Swal.fire({
                title: "Reconectado!",
                text: "A conexão com o servidor foi restabelecida!",
                icon: "success",
                toast: true,
                position: "top-right",
                showDenyButton: false,
                showConfirmButton: false,
                showCancelButton: false,
                showCloseButton: false,
                timerProgressBar: true,
                timer: 3000,
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
                    showCloseButton: false,
                    timerProgressBar: true,
                    timer: 3000,
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
                    showCloseButton: false,
                    timerProgressBar: true,
                    timer: 3000,
                });
            }
        });

        this.ioClient.on("playerInfo", (data) => {
            this.uuid = data.uuid;
            this.players[data.uuid].position = data.position;
        });

        this.ioClient.on("initialGameInfo", (info) => {
            let parsedInfo = InitialBoardInfo.deserialize(info);
            this.setupBoard(parsedInfo);
        });

        this.ioClient.on("playersUpdate", (info) => {
            for(let id in info) {
                let p = this.players[id];
                p.position = info[id];
            }
        });

        this.ioClient.on("matchEnded", () => {
           this.endMatch();
           this.disconnect();
           setTimeout(() => document.location.reload(), 1000);
        });

        this.ioClient.on("playerRolledDie", (player, result) => {
            let p = this.players[player];

            Swal.fire({
                title: `${p.playerName} jogou o dado!`,
                text: `${p.playerName} jogou o dado e tirou ${result}!`,
                timer: 2000,
                timerProgressBar: true,
                backdrop: "none",
                showCloseButton: false,
                showCancelButton: false,
                showDenyButton: false,
                showConfirmButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false,
                iconHtml: "<img src='/res/img/die.png' width='80px' height='80px' alt='DIE_ICON'>"
            });
        });

        this.ioClient.on("playerWon", (player) => {
            let p = this.players[player];

            setTimeout(() => this.showConfetti(), 1000);
            Swal.fire({
                title: `${p.playerName} venceu a partida!`,
                text: `${p.playerName} foi o primeiro jogador a chegar à ultima casa!`,
                timer: 5000,
                timerProgressBar: true,
                backdrop: "none",
                showCloseButton: false,
                showCancelButton: false,
                showDenyButton: false,
                showConfirmButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false,
                iconHtml: `<img src="${p.character.src}" width="80px" height="80px" alt="PLAYER_CHARACTER">`
            });
        });

        this.ioClient.on("playerHasTenSecLeft", () => {
            this.doTenSecCounter = true;
            let delay = (ms: number) => new Promise(res => setTimeout(res, ms));
            
            let tenSecCounter = 10;
            let add = () => {
                if(tenSecCounter > 0) { 
                    this.counterAnimation = new CounterAnimation(120, tenSecCounter, this.renderer);
                    tenSecCounter--; 
                    delay(1000).then(() => add());
                }
            }

            add();
        });

        this.ioClient.on("playerPassedTurn", (player) => {
            let p = this.players[player];

            this.doTenSecCounter = false;
            this.counterAnimation = undefined;

            Swal.fire({
                title: `${p.playerName} passou a vez!`,
                text: `${p.playerName} passou a vez para o próximo jogador!`,
                timer: 4000,
                timerProgressBar: true,
                backdrop: "none",
                showCloseButton: false,
                showCancelButton: false,
                showDenyButton: false,
                showConfirmButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false,
                icon: "info"
            });
        });

        this.ioClient.on("playerTookQuestion", (player, info) => {
            this.playerTurn = this.players[player].playerName;

            Swal.fire({
                title: `${this.players[player].playerName} pegou uma charada!\n${info.title}`,
                text: info.question,
                timer: 5000,
                timerProgressBar: true,
                backdrop: "none",
                showCloseButton: false,
                showConfirmButton: false,
                showDenyButton: false,
                showCancelButton: false,
                icon: "question",
                allowEscapeKey: false,
                allowOutsideClick: false
            });
        });

        this.ioClient.on("playerTookSurpriseCard", (player, info) => {
            let cardType = info.cardType === "luck" ? "Sorte!" : "Azar!";
            Swal.fire({
                title: `${this.players[player].playerName} pegou uma carta surpresa!\n${cardType}`,
                text: info.text,
                timer: 5000,
                timerProgressBar: true,
                backdrop: "none",
                showCloseButton: false,
                showConfirmButton: false,
                showDenyButton: false,
                showCancelButton: false,
                allowEscapeKey: false,
                allowOutsideClick: false,
                iconHtml: info.cardType === "luck"
                    ? "<img src='/res/img/luck.png' width='80px' height='80px' alt='ICON'>"
                    : "<img src='/res/img/bad_luck.png' width='80px' height='80px' alt='ICON'>"
            });
        });

        this.ioClient.on("playerChoseEnemy", (player, chosenId) => {
            Swal.fire({
                title: "Jogador Escolhido!",
                text: `${this.players[player].playerName} escolheu ${this.players[chosenId].playerName} como alvo!`,
                icon: "warning",
                backdrop: "none",
                showCancelButton: false,
                showDenyButton: false,
                showCloseButton: false,
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                allowOutsideClick: false
            })
        });

        this.ioClient.on("playerAnsweredQuestion", (player, info) => {
            let p = this.players[player].playerName;
            let answerState = info.wasCorrect ? "correta" : "errada";

            Swal.fire({
                title: `${p} respondeu à pergunta!`,
                text: `E a resposta está ${answerState}!\nA resposta de ${p} foi: ${info.playerAnswer}`,
                showConfirmButton: false,
                showCloseButton: false,
                showDenyButton: false,
                showCancelButton: false,
                backdrop: "none",
                timer: 4000,
                icon: info.wasCorrect ? "success" : "error",
                allowOutsideClick: false,
                allowEscapeKey: false,
                timerProgressBar: true
            })
        });

        this.ioClient.on("playerJoined", (info) => {
            this.players[info.uuid] = new Player(info.playerName, info.position, info.character, this.renderer, this);

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
                showCloseButton: false,
                timerProgressBar: true,
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
                showCloseButton: false,
                timerProgressBar: true,
            });

            delete this.players[info.uuid];
        });

        setTimeout(() => { this.ping(); }, 2000);
    }

    private ping() {
        if(!this.isConnected()) {
            this._board = null;
            this.players = {};
            this.playerTurn = "";
        }

        this.pingCheck();
        setTimeout(() => { this.ping(); }, 2000);
    }

    protected abstract pingCheck(): void;

    protected setupBoard(info: InitialBoardInfo) {
        this._board = new BoardClient({
            boardSize: info.getBoardSize(),
            triangles: info.getTriangleTypes()
        }, this.renderer);

        let players = info.getPlayers();
        this.players = {};
        for(let i = 0; i < players.length; i++) {
            let p = players[i];
            this.players[p.uuid] = new Player(p.playerName, p.position, p.character, this.renderer, this);
        }
    }

    private showConfetti() {
        this.confettiContainer = document.createElement("div");
        let confettiColors: string[] = ["#fce18a", "#ff726d", "#b48def", "#f4306d"];
        let confettiAnimations: string[] = ["slow", "medium", "fast"];

        this.confettiContainer.style.position = "relative";
        this.confettiContainer.classList.add("confetti-container");

        document.body.appendChild(this.confettiContainer);

        let renderConfetti = () => {
            this.confettiRendererInterval = setInterval(() => {
                const confettiEl = document.createElement("div");
                const confettiSize = Math.floor(Math.random() * 3) + 7 + "px";
                const confettiBackground = confettiColors[Math.floor(Math.random() * confettiColors.length)];
                const confettiLeft = Math.floor(Math.random() * document.body.offsetWidth) + "px";
                const confettiAnimation = confettiAnimations[Math.floor(Math.random() * confettiAnimations.length)];

                confettiEl.classList.add(
                    "confetti",
                    "confetti--animation-" + confettiAnimation
                );
                confettiEl.style.left = confettiLeft;
                confettiEl.style.width = confettiSize;
                confettiEl.style.height = confettiSize;
                confettiEl.style.backgroundColor = confettiBackground;

                this.confettiRemoverInterval = setTimeout(() =>
                    confettiEl.parentNode.removeChild(confettiEl), 3000);

                this.confettiContainer.appendChild(confettiEl);
            }, 25);
        }

        renderConfetti();
    }

    private endMatch() {
        this._board = null;
        this.players = {};
        this.playerTurn = "";

        clearInterval(this.confettiRendererInterval);
        clearInterval(this.confettiRemoverInterval);

        this.confettiContainer.parentNode.removeChild(this.confettiContainer);
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

        let resetFpsCounter = () => {
            this.frameRate = this.fpsCounting;
            this.fpsCounting = 0;
            setTimeout(resetFpsCounter, 1000);
        }

        resetFpsCounter();
    }

    private loadCharacters() {
        Client.characters.ALBERT_EINSTEIN.src = "/res/img/Characters/ALBERT_EINSTEIN.png";
        Client.characters.ISAAC_NEWTON.src = "/res/img/Characters/ISAAC_NEWTON.png";
        Client.characters.NICOLA_TESLA.src = "/res/img/Characters/NICOLA_TESLA.png";
        Client.characters.STEPHEN_HAWKING.src = "/res/img/Characters/STEPHEN_HAWKING.png";
    }

    public render() {
        this.renderer.clear("#2a2a2a");

        if(this._board) this._board.render();
        for(let playerId in this.players) this.players[playerId]?.render();

        this.renderer.drawText(`FPS: ${this.framerate}`, 200, 2160 - 80, "white", false, 60, "Arial");

        if(this.board) this.renderer.drawText("Jogadores", 300, 60, "white", false, 50, "Arial");

        let nameY = 120;
        for(let id in this.players) {
            let p = this.players[id].playerName;

            this.renderer.drawText(p, 300, nameY, p != this.playerTurn ? "white" : "#4ce577", false,
                50, "Arial");
            nameY += 60;
        }

        if(this.doTenSecCounter && this.counterAnimation) {
            this.counterAnimation.render();
        }
    }

    public updateView() {
        this.render();
        this.fpsCounting++;
        requestAnimationFrame(() => this.updateView());
    }

    public isConnected() {
        return this.ioClient.connected;
    }

    public disconnect() {
        this.ioClient.disconnect();
    }

    get framerate() {
        return this.frameRate;
    }

    get board() {
        return this._board;
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

        this.ioClient.on("takeSurpriseCard", (type, text) => {
            Swal.fire({
                title: `Carta surpresa: ${type === "luck" ? "Sorte!" : "Azar!"}`,
                text: text,
                showCancelButton: false,
                showDenyButton: false,
                showConfirmButton: false,
                showCloseButton: false,
                backdrop: "none",
                timer: 5000,
                timerProgressBar: true,
                allowOutsideClick: false,
                iconHtml: type === "luck"
                    ? "<img src='/res/img/luck.png' width='80px' height='80px' alt='ICON'>"
                    : "<img src='/res/img/bad_luck.png' width='80px' height='80px' alt='ICON'>"
            })
        })

        this.ioClient.on("takeQuestion", (info, callback) => {
            this.playerTurn = this.players[this.uuid].playerName;

            Swal.fire({
                title: info.title,
                text: info.question,
                icon: "question",
                input: "text",
                showConfirmButton: true,
                showDenyButton: false,
                showCancelButton: false,
                showCloseButton: false,
                backdrop: "none",
                confirmButtonText: "Responder",
                inputPlaceholder: "Sua resposta",
                allowEscapeKey: false,
                timer: info.useTimer ? info.timer: undefined,
                timerProgressBar: info.useTimer,
                allowOutsideClick: false,
                footer: "<p style='text-align: center; margin: 0; padding: 0'>Erros de digitação (com exessão de pontuação e acentuação) na resposta a levam a ser considerada errada!</P>",
                inputValidator(inputValue: string) {
                    if(!inputValue) return "Você precisa inserir uma resposta!";
                }
            }).then((result) => {
                if(result.isConfirmed) callback(result.value as string);
            });
        });

        this.ioClient.on("chooseEnemy", (callback) => {
            let players: { [key: string]: string } = {};

            for(let id in this.players)
                if(id != this.uuid) players[id] = this.players[id].playerName;

            Swal.fire({
                title: "Selecione um jogador",
                text: "A carta surpresa que você pegou lhe permite escolher um jogador para que algo aconteça com ele",
                icon: "question",
                input: "select",
                inputOptions: players,
                showConfirmButton: true,
                showDenyButton: false,
                showCancelButton: false,
                showCloseButton: false,
                backdrop: "none",
                confirmButtonText: "Responder",
                inputPlaceholder: "Escolha um jogador",
                allowEscapeKey: false,
                allowOutsideClick: false,
                inputValidator(inputValue: string) {
                    if(!inputValue) return "Você precisa escolher um jogador!";
                }
            }).then((result) => {
                if(result.isConfirmed) {
                    callback(result.value as string);
                }
            });
        });

        this.updateView();
    }

    private openClientInfoForm() {
        let playerName: string = "";

        Swal.fire({
            title: "Entrar na partida",
            text: "Com qual nome você gostaria de jogar?",
            icon: "question",
            input: "text",
            showConfirmButton: true,
            showCancelButton: false,
            showDenyButton: false,
            showCloseButton: false,
            confirmButtonText: "Escolher o personagem",
            inputPlaceholder: "Nome de usuário",
            backdrop: "none",
            allowOutsideClick: false,
            allowEscapeKey: false,
            inputValidator: (inputValue: string) => {
                return new Promise((resolve) => {
                    if(!inputValue) resolve("Você precisa inserir um nome!");
                    else if(inputValue.length < 4) resolve("Seu nome precisa ter ao menos 4 caracteres");
                    else if(inputValue.length > 15) resolve("Seu nome deve ter no máximo 15 caracteres");
                    else {
                        this.ioClient.emit("isNameAvailable", inputValue, (available) => {
                            if (!available) resolve("Outro jogador já entrou na partida com esse nome!");
                            else resolve(null);
                        });
                    }
                });
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
                showCloseButton: false,
                confirmButtonText: "Entrar na partida",
                backdrop: "none",
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then((result) => {
                if(result.isConfirmed)
                    this.ioClient.emit("joinGame", { username: playerName, character: result.value });
            });
        });
    }

    protected pingCheck() {
        if(!this.isConnected()) {
            this.ioClient.timeout(5000).emit("isMatchOpen", (isOpen) => {
                if(isOpen == true) this.openClientInfoForm();
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
            this._board = new BoardClient({ boardSize: creator.getBoardSize(), triangles: creator.getTriangles() }, this.renderer);
            this.matchCreator.destroy();
            delete this.matchCreator;
            this.creatingMatch = false;
            this.addStartMatchButton();
        });
    }

    public addStartMatchButton() {
        let button = document.createElement("button");

        button.id = "startMatch";
        button.textContent = "Iniciar partida";

        button.addEventListener("click", () => {
            if(Object.keys(this.players).length < 2) return;
            this.ioClient.emit("startMatch");
            button.remove();
        });

        document.body.append(button);
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
