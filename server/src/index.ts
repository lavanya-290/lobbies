import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { HouseRoom } from "./rooms/HouseRoom";
import { WorldRoom } from "./rooms/WorldRoom";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { housesRouter } from "./routes/houses";
import { placedObjectsRouter } from "./routes/placedObjects";

const PORT = Number(process.env.PORT ?? 2567);
const clientUrl = process.env.CLIENT_URL;
const allowedOrigins = clientUrl
  ? clientUrl.split(",").map((s) => s.trim().replace(/\/$/, ""))
  : true;

const app = express();
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/houses", housesRouter);
app.use("/", placedObjectsRouter);

const httpServer = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("house", HouseRoom).filterBy(["dbRoomId"]);
gameServer.define("world", WorldRoom);

httpServer.listen(PORT, () => {
  console.log(`[server] Colyseus listening on ws://localhost:${PORT}`);
});
