import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { HouseRoom } from "./rooms/HouseRoom";
import { authRouter } from "./routes/auth";
import { housesRouter } from "./routes/houses";
import { placedObjectsRouter } from "./routes/placedObjects";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/houses", housesRouter);
app.use("/", placedObjectsRouter);

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("house", HouseRoom).filterBy(["dbRoomId"]);

httpServer.listen(PORT, () => {
  console.log(`[server] Colyseus listening on ws://localhost:${PORT}`);
});
