import {MatchData} from "./MatchData";
import {SurpriseCardType} from "../Server/Cards";

interface ServerToClientEvents {
    initialGameInfo: (info: string) => void;
    matchOpen: () => void;
    playerJoined: (info: { playerName: string, character: number, position: number, uuid: string }) => void;
    playerDisconnected: (info: { playerName: string, uuid: string }) => void;
    playerInfo: (data: { uuid: string, position: number }) => void;
    chooseEnemy: (callback: (chosen: string) => void) => void;
    takeSurpriseCard: (type: SurpriseCardType, text: string) => void;
    playersUpdate: (newPositions: { [key: string]: number }) => void;
    playerTookQuestion: (player: string, info: { title: string, question: string }) => void;
    playerTookSurpriseCard: (player: string, info: { cardType: SurpriseCardType, text: string }) => void;
    playerChoseEnemy: (player: string, chosenId: string) => void;
    playerPassedTurn: (player: string) => void;
    playerRolledDie: (player: string, result: number) => void;
    playerWon: (player: string) => void;
    matchEnded: () => void;
    playerHasTenSecLeft: () => void;
    hostAdress: (ip: string) => void;

    playerAnsweredQuestion: (player: string, info: { title: string, question: string, playerAnswer: string,
        wasCorrect: boolean }) => void;

    takeQuestion: (info: { title: string, question: string, timer: number, useTimer: boolean }, callback:
        (answer: string) => void) => void;
}

interface ClientToServerEvents {
    joinGame: (info: { username: string, character: string}) => void;
    loginAdmin: () => void;
    isMatchOpen: (callback: (response: boolean) => void) => void;
    createNewMatch: (data: MatchData, callback: () => void) => void;
    getBoard: (callback: (data: string) => void) => void;
    reconnecting: (userId: string) => void;
    startMatch: () => void;
    isNameAvailable: (name: string, callback: (available: boolean) => void) => void;
}

interface InterServerEvents {

}

interface SocketData {
    username: string;
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData };