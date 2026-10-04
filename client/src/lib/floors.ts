export interface FloorTileDef {
  key: string;
  name: string;
  category: "wood" | "tile" | "pattern" | "stone" | "brick" | "metal" | "nature";
  path: string;
}

export const FLOOR_TILES: FloorTileDef[] = [
  { key: "floor_wood_oak", name: "Oak Parquet", category: "wood", path: "/assets/tiles/floors/floor_wood_oak.png" },
  { key: "floor_wood_mahogany", name: "Mahogany Parquet", category: "wood", path: "/assets/tiles/floors/floor_wood_mahogany.png" },
  { key: "floor_tile_ceramic", name: "Blue Ceramic Tile", category: "tile", path: "/assets/tiles/floors/floor_tile_ceramic.png" },
  { key: "floor_tile_checker", name: "Checkerboard Marble", category: "tile", path: "/assets/tiles/floors/floor_tile_checker.png" },
  { key: "floor_pattern_carpet", name: "Royal Woven Carpet", category: "pattern", path: "/assets/tiles/floors/floor_pattern_carpet.png" },
  { key: "floor_pattern_mosaic", name: "Mosaic Tile", category: "pattern", path: "/assets/tiles/floors/floor_pattern_mosaic.png" },
  { key: "floor_brick_terracotta", name: "Terracotta Brick", category: "brick", path: "/assets/tiles/floors/floor_brick_terracotta.png" },
  { key: "floor_stone_slate", name: "Slate Flagstone", category: "stone", path: "/assets/tiles/floors/floor_stone_slate.png" },
  { key: "floor_stone_cobble", name: "Cobblestone Paving", category: "stone", path: "/assets/tiles/floors/floor_stone_cobble.png" },
  { key: "floor_metal_steel", name: "Industrial Steel Plate", category: "metal", path: "/assets/tiles/floors/floor_metal_steel.png" },
  { key: "floor_grill_deck", name: "Lumber Patio Deck", category: "wood", path: "/assets/tiles/floors/floor_grill_deck.png" },
  { key: "floor_grass_garden", name: "Lush Garden Lawn", category: "nature", path: "/assets/tiles/floors/floor_grass_garden.png" },
  { key: "floor_flora_meadow", name: "Wildflower Meadow", category: "nature", path: "/assets/tiles/floors/floor_flora_meadow.png" },
  { key: "floor_ice_crystal", name: "Crystalline Ice Tile", category: "nature", path: "/assets/tiles/floors/floor_ice_crystal.png" },
];

/**
 * Deterministically pick a unique floor tile from the floor plan based on house or room id.
 */
export function getHouseFloorTile(houseOrRoomId: string): FloorTileDef {
  if (!houseOrRoomId) return FLOOR_TILES[0];
  let hash = 0;
  for (let i = 0; i < houseOrRoomId.length; i++) {
    hash = (hash << 5) - hash + houseOrRoomId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FLOOR_TILES.length;
  return FLOOR_TILES[index];
}
