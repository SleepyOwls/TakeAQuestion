import {Server, Socket} from "socket.io";
import {WebServer} from "../WebServer";
import {ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData} from "../Utils/Interfaces";
import {InitialBoardInfo} from "../Utils/BoardInfo";
import {BoardServer} from "./BoardServer";
import {MatchData} from "../Utils/MatchData";
import {Player} from "./Player";

import {v4 as uuid} from "uuid";
import {Character} from "../Utils/Enums";
import {CardManager, CardParser} from "./Cards";

class GameServer {
    private server: Server;
    private board: BoardServer;

    private adminSocket: Socket;
    private matchOpen: boolean;
    private matchEnded: boolean;

    private players: { [key: string]: Player };
    private cardManager: CardManager;

    private playerRoundCallback: () => void;

    private readonly delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    
    constructor(expressServer: WebServer) {
        console["originalLog"] = console.log.bind(console);
        console.log = (data) => {
            let date = new Date();
            let h = date.getHours();
            let m = date.getMinutes();
            let s = date.getSeconds();
            let time = `${h >= 10 ? h : "0" + h}:${m >= 10 ? m : "0" + m}:${s >= 10 ? s : "0" + s}`;
            console["originalLog"](`[${time}]`, data);
        }

        this.matchOpen = false;
        this.players = {};
        this.server = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents,
            SocketData>(expressServer.getServer());

        this.server.on("connection", (socket) => {
            socket.on("disconnect", () => {
                socket.removeAllListeners();

                if(this.doesPlayerExist(socket.data.uuid)) {
                    let p = this.getPlayer(socket.data.uuid);
                    p.connected = false;

                    setTimeout(() => {
                        if(!p.connected) {
                            this.server.in(["playing", "admin"]).emit("playerDisconnected",
                                { playerName: p.playerName, uuid: socket.data.uuid });

                            this.removePlayer(socket.data.uuid);
                            this.playerRoundCallback();
                        }
                    }, 8000);
                }
            });

            socket.on("isNameAvailable", (name, callback) => {
                for(let id in this.players)
                    if(this.players[id].playerName == name) { callback(false); return; }

                callback(true);
            });

            socket.once("reconnecting", (userId) => {
                if(this.doesPlayerExist(userId)) {
                    let p = this.getPlayer(userId);
                    if(socket.id != p.socket.id) return;

                    p.connected = true;

                    socket.data.username = p.playerName;
                    socket.data.uuid = userId;

                    socket.join("playing");
                    socket.emit("initialGameInfo", InitialBoardInfo.serialize(
                        new InitialBoardInfo(this.serializeInfo())));

                    socket.emit("playerInfo", { uuid: userId, position: p.position });
                }
            });

            socket.once("joinGame", (info) => {
                if(!this.matchOpen) return;

                let name = info.username || null;
                if(!name || !info.character) return;
                if(name.length < 4 || name.length > 15) return;

                for(let id in this.players)
                    if(this.players[id].playerName == info.username) return;

                let pos: number = 0;

                if(!socket.data.uuid) {
                    socket.data.username = name;
                    socket.data.character = info.character;
                    socket.data.uuid = uuid();
                    this.addPlayer(socket);
                } else pos = this.getPlayer(socket.data.uuid).position;

                socket.join("playing");
                socket.emit("initialGameInfo", InitialBoardInfo.serialize(new InitialBoardInfo(this.serializeInfo())));
                socket.emit("playerInfo", { uuid: socket.data.uuid, position: 0 });

                this.server.in(["playing", "admin"]).emit("playerJoined",
                    { playerName: name, character: info.character, position: pos, uuid: socket.data.uuid });
            });

            socket.on("isMatchOpen", (callback) => callback(this.matchOpen));

            socket.once("loginAdmin", () => {
                // Only a socket from localhost can be assigned as admin
                if(socket.handshake.address == "::1") {
                    this.adminSocket = socket;
                    socket.join("admin");

                    socket.on("createNewMatch", (data, callback) => {
                        this.cardManager = new CardManager(CardParser.parseCardFile("physics"), this);
                        this.createMatch(data);
                        callback();
                    });

                    socket.on("getBoard", (callback) =>
                        callback(InitialBoardInfo.serialize(new InitialBoardInfo(this.serializeInfo()))));

                    socket.on("startMatch", () => {
                        if(Object.keys(this.players).length < 2) return;
                        this.startMatch();
                    });
                }
            });
        });
    }

    public startMatch() {
        let playerIndex = 0;
        let time;

        let nextPlayerTurn = async () => {
            if (this.matchEnded) return;

            console.log("--------------------------------");
            console.log(`${this.players[Object.keys(this.players)[playerIndex]].playerName}'s round`);
            console.log("--------------------------------");

            time = Date.now();
            await makePlayerTurn(this.players[Object.keys(this.players)[playerIndex]]);
            console.log(`Took ${Date.now() - time}ms to finish player's round`);

            playerIndex++;
            if (playerIndex >= Object.keys(this.players).length) playerIndex = 0;

            await nextPlayerTurn();
        }

        let takeSurpriseCardIfPossible = async (player: Player) => {
            if (canTakeSurpriseCard(player)) {
                player.previousSurpriseTriangle = player.position;

                await this.makePlayerTakeSurpriseCard(player);
                this.sendPlayerUpdateEvent();
                await this.delay(2000);
                await takeSurpriseCardIfPossible(player);
            }
        }

        let canTakeSurpriseCard = (player: Player) =>
            this.board.isTriangleSurpriseType(player.position) &&
            player.previousSurpriseTriangle != player.position;

        let makePlayerTurn = async (player: Player) => {
            return new Promise<void>(async (finishRound) => {
                this.playerRoundCallback = finishRound;

                await player.playerRoundCallback();

                if (player.doPass) {
                    this.server.sockets.in(["playing", "admin"]).emit("playerPassedTurn", player.uuid);
                    await this.delay(4000);

                    finishRound();
                    return;
                }

                await new Promise<void>((resolve) => {
                    this.makePlayerTakeQuestion(player).then(async info => {
                        await this.delay(1000);
                        if(info.correct) await this.rollDie(player.uuid, (result) =>
                            player.move(result));

                        this.sendPlayerUpdateEvent();

                        if (canTakeSurpriseCard(player)) {
                            this.delay(2000).then(() =>
                                takeSurpriseCardIfPossible(player).then(() => {

                                    this.sendPlayerUpdateEvent();
                                    setTimeout(resolve, 2000);
                                }));
                        } else setTimeout(() => resolve(), 2000);
                    });
                });

                for(let id in this.players) {
                    let p = this.players[id];

                    let positionIsZero = p.position === 0;
                    let movedForward = p.movedForward;

                    if(positionIsZero && movedForward) {
                        console.log(`=-=-=-=-=-=-=-=--=-=[ ${p.playerName} Won the game! ]=-=-=-=-=-=-=-=--=-=`);
                        this.server.sockets.in([ "playing", "admin" ]).emit("playerWon", p.uuid);
                        this.matchEnded = true;
                        setTimeout(() => this.endMatch(), 30000);
                    }
                }

                finishRound();
            });
        }

        nextPlayerTurn();
    }

    private endMatch() {
        this.server.sockets.emit("matchEnded");

        this.matchOpen = false;
        this.matchEnded = false;

        for(let id in this.players) {
            let socket = this.players[id].socket;
            if(socket.connected) socket.disconnect();
        }

        this.players = {};
        this.board = null;
        this.cardManager = undefined;
    }

    public sendPlayerUpdateEvent() {
        let playerPos: { [key: string]: number } = {};

        for(let id in this.players) {
            let p = this.players[id];
            playerPos[id] = p.position;
        }

        this.server.sockets.volatile.emit("playersUpdate", playerPos);
    }

    public async rollDie(playerId: string, callback: (result: number) => void) {
        let randomNumber = Math.floor(Math.random() * 6) + 1;
        this.server.sockets.in(["playing", "admin"]).volatile.emit("playerRolledDie", playerId, randomNumber);

        await this.delay(2000);
        callback(randomNumber);
    }

    public makePlayerTakeSurpriseCard(player: Player) {
        return new Promise<void>((resolve) => {
            let cards = this.cardManager.surpriseCards;
            let random = Math.floor(Math.random() * (cards.length - 1));
            let chosenCard = cards[random];

            player.socket.volatile.emit("takeSurpriseCard", chosenCard.type, chosenCard.text);
            player.socket.broadcast.in(["playing", "admin"]).volatile.emit(
                "playerTookSurpriseCard", player.uuid, { cardType: chosenCard.type, text: chosenCard.text });

            this.delay(5000).then(() =>
                player.actionExecutor.execute(chosenCard.actions).then(() => resolve()));
        });
    }

    public makePlayerTakeQuestion(player: Player) {
        return new Promise<{ correct: boolean, answer: string }>((resolve) => {
            let questions = this.cardManager.questionCards;
            let random = Math.floor(Math.random() * (questions.length - 1));
            let chosenQuestion = questions[random];

            console.log(`Correct Answer: ${chosenQuestion.answer}`);

            player.socket.broadcast.in(["playing", "admin"]).volatile.emit("playerTookQuestion", player.uuid, {
                title: chosenQuestion.title,
                question: chosenQuestion.question
            });

            let tenSecLeftCounter;
            
            if(this.cardManager.useTimer) {
                setTimeout(() => {
                    this.server.emit("playerPassedTurn", player.uuid);
                    this.delay(4000).then(() => resolve({ correct: false, answer: "" }));
                }, this.cardManager.timer * 1000);

                tenSecLeftCounter = setTimeout(() => {
                    this.server.emit("playerHasTenSecLeft");
                }, (this.cardManager.timer - 10) * 1000);    
            }

            player.socket.volatile.emit("takeQuestion", {
                title: chosenQuestion.title,
                question: chosenQuestion.question,
                timer: this.cardManager.timer * 1000,
                useTimer: this.cardManager.useTimer
            }, (answer: string) => {
                if (!answer) return;
                clearTimeout(tenSecLeftCounter);

                let originalAnswer = answer;

                let correctAnswer = chosenQuestion.answer;
                let correct = false;

                if (chosenQuestion.doMarkSimilarAsCorrect) {
                    correctAnswer = correctAnswer.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^\p{L}\s!-]/gu, "")
                        .replace(/-/g, " ")
                        .replace(/\s\s+/g, " ");

                    answer = answer.toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^\p{L}\s!-]/gu, "")
                        .replace(/-/g, " ")
                        .replace(/\s\s+/g, " ");

                    if (answer === correctAnswer) correct = true;

                    if(!correct && chosenQuestion.aliases) {
                        for(let alias of chosenQuestion.aliases) {
                            alias = alias.toLowerCase()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^\p{L}\s!-]/gu, "")
                                .replace(/-/g, " ")
                                .replace(/\s\s+/g, " ");

                            if(answer === alias) { correct = true; break; }
                        }
                    }
                }

                if (chosenQuestion.isCorrectIfCorrectAnswerIsOnUserAnswer) {
                    let correctW = correctAnswer.split(" ");
                    let wordsIncluded = true;

                    for(let i of correctW) if(answer.indexOf(i) == -1) { wordsIncluded = false; break; }

                    if(!wordsIncluded && chosenQuestion.aliases.length > 0) { // Try the aliases if available
                        for(let alias of chosenQuestion.aliases) {
                            correctW = alias.split(" ");

                            wordsIncluded = true;

                            for(let i of correctW) {
                                if(chosenQuestion.doMarkSimilarAsCorrect) i = i.toLowerCase()
                                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                    .replace(/[^\p{L}\s!-]/gu, "")
                                    .replace(/-/g, " ")
                                    .replace(/\s\s+/g, " ");

                                if(answer.indexOf(i) == -1) { wordsIncluded = false; break; }
                            }
                        }
                    }

                    correct = wordsIncluded;
                }

                this.server.sockets.volatile.in(["playing", "admin"]).emit("playerAnsweredQuestion",
                    player.uuid, {
                    title: chosenQuestion.title,
                    question: chosenQuestion.question,
                    playerAnswer: originalAnswer,
                    wasCorrect: correct
                });

                if(correct) setTimeout(() =>
                    resolve({ correct: correct, answer: originalAnswer }), 4000);

                else resolve({ correct: correct, answer: originalAnswer });
            });
        });
    }

    public makePlayerChoosePlayer(player: Player) {
        return new Promise<Player>((resolve) => {
            let regexp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;

            player.socket.emit("chooseEnemy", (chosen: string) => {
                if(!chosen) {
                    console.warn(`${player.playerName} returned chosen player id as null`);
                    return;
                }

                if(!regexp.test(chosen)) {
                    console.warn(`${player.playerName} returned chosen player id as an invalid uuid`);
                    return;
                }

                if(this.players[chosen]) {
                    resolve(this.players[chosen]);
                    this.server.sockets.in(["playing", "admin"]).emit("playerChoseEnemy", player.uuid, chosen);
                }
                else console.warn(`${player.playerName} chose an invalid player`);
            });
        });
    }

    public serializeInfo() {
        let serializedBoard = this.board.serializeBoard();
        let parsedPlayers: { playerName: string, uuid: string, position: number, character: Character }[] = [];

        for(let playerId in this.players) {
            let p = this.players[playerId];

            parsedPlayers.push({
                playerName: p.playerName,
                uuid: p.uuid,
                character: p.character,
                position: p.position
            });
        }

        return { boardSize: serializedBoard.boardSize, triangles: serializedBoard.triangles, players: parsedPlayers };
    }

    public doesPlayerExist(uuid: string) {
        let p = this.players[uuid] || undefined;
        if(p) return true;
    }

    public addPlayer(socket: Socket) {
        this.players[socket.data.uuid] =
            new Player(0, socket.data.username, socket.data.character, socket, socket.data.uuid, this.board);
    }

    public removePlayer(uuid: string) {
        delete this.players[uuid];
    }

    public getPlayer(uuid: string) {
        return this.players[uuid] || undefined;
    }

    public getPlayers() {
        return this.players;
    }

    public createMatch(data: MatchData) {
        if(data.boardSize < 5 || data.boardSize > 101 || data.boardSize % 2 == 0) return;
        if(data.triangles.length != data.boardSize + (data.boardSize - 3) * 2 + 1) return;

        this.board = new BoardServer(data.boardSize, data.triangles);
        this.matchOpen = true;
        this.server.sockets.emit("matchOpen");
    }

}

export { GameServer };