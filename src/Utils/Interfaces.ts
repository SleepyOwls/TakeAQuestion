// https://socket.io/docs/v4/typescript/
import {InitialBoardInfo} from "./BoardInfo";
import {MatchData} from "./MatchData";

interface ServerToClientEvents {
    initialGameInfo: (info: string) => void;
    matchOpen: () => void;
    playerJoined: (info: { playerName: string, character: number, position: number, uuid: string }) => void;
    playerDisconnected: (info: { playerName: string, uuid: string }) => void;
    playerInfo: (data: { uuid: string, position: number }) => void;
}

interface ClientToServerEvents {
    joinGame: (info: { username: string, character: string}) => void;
    loginAdmin: () => void;
    isMatchOpen: (callback: (response: boolean) => void) => void;
    createNewMatch: (data: MatchData, callback: () => void) => void;
    getBoard: (callback: (data: string) => void) => void;
    reconnecting: (userId: string) => void;
}

interface InterServerEvents {

}

interface SocketData {
    username: string;
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData };