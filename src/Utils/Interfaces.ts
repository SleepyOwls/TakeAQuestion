// https://socket.io/docs/v4/typescript/
import {InitialBoardInfo} from "./BoardInfo";
import {MatchData} from "./MatchData";

interface ServerToClientEvents {
    initialGameInfo: (info: string) => void;
    matchOpen: () => void;
}

interface ClientToServerEvents {
    joinGame: (username: string) => void;
    loginAdmin: () => void;
    isMatchOpen: (callback: (err: any, response: boolean) => void) => void;
    createNewMatch: (data: MatchData, callback: (err: any, ready: boolean) => void) => void;
}

interface InterServerEvents {

}

interface SocketData {
    username: string;
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData };