import { io } from "socket.io-client";
class Client {
    constructor() {
        this.ioClient = io();
        this.ioClient.on("connect", () => {
            console.log("Connected to server!");
        });
    }
}
const client = new Client();
//# sourceMappingURL=Client.js.map