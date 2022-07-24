import express from "express";
import { Router } from "express";
import { Express } from "express-serve-static-core";

import * as fs from "fs";
import * as path from "path";

import * as http from "http";

class WebServer {
    private app: Express;
    private readonly router: Router;
    private readonly server: http.Server;

    constructor() {
        this.app = express();
        this.router = Router();

        this.app.use(express.json());
        this.app.use("/res", express.static(path.join(__dirname, "../res/")));
        
        this.router.get("/", (req, res) => { res.send(fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf-8")); });

        this.router.get("/admin", (req, res) => {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if(ip != "::1") res.redirect("/");

            res.sendFile(path.join(__dirname, "../public/admin.html"));
            // res.send(fs.readFileSync(path.join(__dirname, "../public/admin.html"), "utf-8"));
        });

        this.app.use(this.router);

        this.server = this.app.listen(8080, () => { console.log("Server is running!") });
    }

    public getServer() {
        return this.server;
    }
}

export { WebServer };