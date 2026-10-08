export interface FloorTileDef {
  key: string;
  name: string;
  category: "wood" | "tile" | "pattern" | "stone" | "brick" | "nature";
  path: string;
}

export const DEFAULT_FLOOR_KEY = "floor_thick_wood_timber";

export const FLOOR_TILES: FloorTileDef[] = [
  // Rich Wood Flooring (3D Thick Tiles)
  { key: "floor_thick_wood_timber", name: "Rich Timber Planks", category: "wood", path: "/assets/tiles/thick/Terrain_3_r4_c0.png" },
  { key: "floor_thick_wood_oak", name: "Warm Oak Parquet", category: "wood", path: "/assets/tiles/thick/Terrain_3_r0_c0.png" },
  { key: "floor_thick_wood_walnut", name: "Polished Walnut Wood", category: "wood", path: "/assets/tiles/thick/Terrain_3_r1_c0.png" },
  { key: "floor_thick_wood_birch", name: "Nordic Birch Planks", category: "wood", path: "/assets/tiles/thick/Terrain_3_r2_c0.png" },
  { key: "floor_thick_wood_rustic", name: "Weathered Timber", category: "wood", path: "/assets/tiles/thick/Terrain_3_r4_c1.png" },

  // Marble & Tile (3D Thick Tiles)
  { key: "floor_thick_marble_white", name: "White Marble Slab", category: "tile", path: "/assets/tiles/thick/Terrain_2_r1_c0.png" },
  { key: "floor_thick_marble_polished", name: "Polished Marble Floor", category: "tile", path: "/assets/tiles/thick/Terrain_2_r1_c1.png" },

  // Stone & Paving (3D Thick Tiles)
  { key: "floor_thick_stone_slate", name: "Slate Grey Flagstone", category: "stone", path: "/assets/tiles/thick/Terrain_3_r3_c0.png" },
  { key: "floor_thick_stone_cobble", name: "Castle Cobblestone", category: "stone", path: "/assets/tiles/thick/Terrain_2_r0_c0.png" },
  { key: "floor_thick_stone_basalt", name: "Dark Basalt Slabs", category: "stone", path: "/assets/tiles/thick/Terrain_2_r2_c0.png" },
  { key: "floor_thick_stone_granite", name: "Granite Block Paving", category: "stone", path: "/assets/tiles/thick/Terrain_2_r4_c0.png" },
  { key: "floor_thick_sandstone", name: "Sandstone Courtyard", category: "stone", path: "/assets/tiles/thick/Terrain_1_r4_c0.png" },

  // Brick & Terracotta (3D Thick Tiles)
  { key: "floor_thick_brick_terracotta", name: "Terracotta Brick Slab", category: "brick", path: "/assets/tiles/thick/Terrain_1_r0_c0.png" },
  { key: "floor_thick_brick_clay", name: "Clay Paver Blocks", category: "brick", path: "/assets/tiles/thick/Terrain_1_r1_c0.png" },

  // Nature & Garden (3D Thick Tiles)
  { key: "floor_thick_nature_grass", name: "Lush Garden Lawn", category: "nature", path: "/assets/tiles/thick/Forest_r0_c0.png" },
  { key: "floor_thick_nature_meadow", name: "Emerald Forest Turf", category: "nature", path: "/assets/tiles/thick/Forest_r1_c0.png" },
  { key: "floor_thick_water_pool", name: "Crystal Pool Water", category: "nature", path: "/assets/tiles/thick/Water_r0_c0.png" },
  { key: "floor_thick_water_deep", name: "Deep Lagoon Water", category: "nature", path: "/assets/tiles/thick/Water_r2_c0.png" },
];

/**
 * Mapping from legacy 2D flat tile keys to corresponding 3D thick tile keys.
 */
export const LEGACY_FLOOR_MAP: Record<string, string> = {
  floor_wood_oak: "floor_thick_wood_timber",
  floor_wood_mahogany: "floor_thick_wood_walnut",
  floor_tile_ceramic: "floor_thick_marble_white",
  floor_tile_checker: "floor_thick_marble_polished",
  floor_pattern_carpet: "floor_thick_wood_oak",
  floor_pattern_mosaic: "floor_thick_marble_white",
  floor_brick_terracotta: "floor_thick_brick_terracotta",
  floor_stone_slate: "floor_thick_stone_slate",
  floor_stone_cobble: "floor_thick_stone_cobble",
  floor_metal_steel: "floor_thick_stone_granite",
  floor_grill_deck: "floor_thick_wood_rustic",
  floor_grass_garden: "floor_thick_nature_grass",
  floor_flora_meadow: "floor_thick_nature_meadow",
  floor_ice_crystal: "floor_thick_water_pool",
};

/**
 * Normalizes any floor tile key to a valid 3D thick floor tile.
 */
export function resolveFloorTileKey(key?: string): string {
  if (!key) return DEFAULT_FLOOR_KEY;
  if (LEGACY_FLOOR_MAP[key]) return LEGACY_FLOOR_MAP[key];
  if (FLOOR_TILES.some((f) => f.key === key)) return key;
  return DEFAULT_FLOOR_KEY;
}

/**
 * Deterministically pick a unique 3D thick floor tile from the catalog based on house or room id.
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
