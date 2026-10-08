export interface FloorTileDef {
  key: string;
  name: string;
  category: "wood" | "tile" | "pattern" | "stone" | "brick" | "metal";
  path: string;
}

export const DEFAULT_FLOOR_KEY = "floor_wood_oak";

/**
 * Curated indoor floor tiles for houses (Personal Room and Shared Living Room),
 * following exclusively client/public/assets/tiles/floors (no overworld water or grass).
 */
export const FLOOR_TILES: FloorTileDef[] = [
  // Wood Flooring
  { key: "floor_wood_oak", name: "Warm Oak Parquet", category: "wood", path: "/assets/tiles/floors/floor_wood_oak.png" },
  { key: "floor_wood_mahogany", name: "Rich Mahogany Planks", category: "wood", path: "/assets/tiles/floors/floor_wood_mahogany.png" },
  { key: "floor_grill_deck", name: "Lumber Patio Decking", category: "wood", path: "/assets/tiles/floors/floor_grill_deck.png" },

  // Marble & Ceramic Tile
  { key: "floor_tile_ceramic", name: "Blue Ceramic Tile", category: "tile", path: "/assets/tiles/floors/floor_tile_ceramic.png" },
  { key: "floor_tile_checker", name: "Checkerboard Marble", category: "tile", path: "/assets/tiles/floors/floor_tile_checker.png" },
  { key: "floor_pattern_mosaic", name: "Classic Mosaic Tile", category: "tile", path: "/assets/tiles/floors/floor_pattern_mosaic.png" },

  // Woven Carpet & Fabric
  { key: "floor_pattern_carpet", name: "Royal Woven Carpet", category: "pattern", path: "/assets/tiles/floors/floor_pattern_carpet.png" },

  // Brick & Terracotta
  { key: "floor_brick_terracotta", name: "Terracotta Brick", category: "brick", path: "/assets/tiles/floors/floor_brick_terracotta.png" },

  // Stone & Cobble
  { key: "floor_stone_slate", name: "Slate Grey Flagstone", category: "stone", path: "/assets/tiles/floors/floor_stone_slate.png" },
  { key: "floor_stone_cobble", name: "Castle Cobblestone", category: "stone", path: "/assets/tiles/floors/floor_stone_cobble.png" },

  // Metal
  { key: "floor_metal_steel", name: "Industrial Steel Plate", category: "metal", path: "/assets/tiles/floors/floor_metal_steel.png" },
];

/**
 * Normalizes any legacy or external floor tile key to a valid house indoor floor tile.
 */
export function resolveFloorTileKey(key?: string): string {
  if (!key) return DEFAULT_FLOOR_KEY;
  if (FLOOR_TILES.some((f) => f.key === key)) return key;

  // Map legacy thick overworld terrain keys to appropriate indoor house counterparts
  const fallbackMap: Record<string, string> = {
    floor_thick_wood_timber: "floor_wood_oak",
    floor_thick_wood_oak: "floor_wood_oak",
    floor_thick_wood_walnut: "floor_wood_mahogany",
    floor_thick_wood_birch: "floor_wood_oak",
    floor_thick_wood_rustic: "floor_grill_deck",
    floor_thick_marble_white: "floor_tile_ceramic",
    floor_thick_marble_polished: "floor_tile_checker",
    floor_thick_stone_slate: "floor_stone_slate",
    floor_thick_stone_cobble: "floor_stone_cobble",
    floor_thick_stone_granite: "floor_metal_steel",
    floor_thick_brick_terracotta: "floor_brick_terracotta",
    floor_thick_nature_grass: "floor_wood_oak",
    floor_thick_nature_meadow: "floor_wood_oak",
    floor_thick_water_pool: "floor_tile_ceramic",
    floor_thick_water_deep: "floor_tile_ceramic",
    floor_grass_garden: "floor_wood_oak",
    floor_flora_meadow: "floor_wood_oak",
    floor_ice_crystal: "floor_tile_ceramic",
  };

  return fallbackMap[key] || DEFAULT_FLOOR_KEY;
}

/**
 * Deterministically pick an indoor house floor tile based on house or room id.
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
