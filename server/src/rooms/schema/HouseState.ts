import { Schema, MapSchema, type } from "@colyseus/schema";

/**
 * One connected player's synced state.
 * Keep this minimal in Phase 0 — position + a display name.
 */
export class Player extends Schema {
  @type("string") username: string = "guest";
  @type("number") x: number = 400;
  @type("number") y: number = 300;
  @type("string") direction: string = "down"; // up | down | left | right
  @type("boolean") moving: boolean = false;
}

export class SyncedObject extends Schema {
  @type("string") id: string = "";
  @type("string") assetId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") rotation: number = 0;
  @type("string") placeholderColor: string = "#ffffff";
  @type("number") width: number = 24;
  @type("number") height: number = 24;
  @type("string") label: string = "Furniture";
  @type("string") placedById: string = "";
}

export class HouseState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: SyncedObject }) objects = new MapSchema<SyncedObject>();
}
