import { io, Socket } from "socket.io-client";

class Client {
    private ioClient: Socket;

    constructor() {
        this.ioClient = io();

        this.ioClient.on("connect", () => {
            console.log("Connected to server!");
        });
    }
}

const client = new Client();