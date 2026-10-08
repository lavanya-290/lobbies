export interface WallStyleDef {
  key: string;
  name: string;
  description: string;
  category: "wood" | "brick" | "stone" | "none";
  sePlainKey: string;
  swPlainKey: string;
  seWindowKey: string;
  swWindowKey: string;
  thumbnail: string;
}

export const WALL_STYLES: WallStyleDef[] = [
  {
    key: "wood",
    name: "Warm Oak Wood",
    description: "Classic rich vertical oak wood planking with brass-trimmed window panes.",
    category: "wood",
    sePlainKey: "wall_wood_se",
    swPlainKey: "wall_wood_sw",
    seWindowKey: "wall_wood_window_se",
    swWindowKey: "wall_wood_window_sw",
    thumbnail: "/assets/walls/singles/wall_wood_window_se.png",
  },
  {
    key: "brick",
    name: "Vintage Red Brick",
    description: "Exposed industrial loft red masonry brick with arched window frame.",
    category: "brick",
    sePlainKey: "wall_brick_se",
    swPlainKey: "wall_brick_sw",
    seWindowKey: "wall_brick_window_se",
    swWindowKey: "wall_brick_window_sw",
    thumbnail: "/assets/walls/singles/wall_brick_window_se.png",
  },
  {
    key: "stone",
    name: "Ancient Castle Stone",
    description: "Sturdy weathered grey flagstone blocks from medieval citadel ramparts.",
    category: "stone",
    sePlainKey: "wall_stone_se",
    swPlainKey: "wall_stone_sw",
    seWindowKey: "wall_stone_window_se",
    swWindowKey: "wall_stone_window_sw",
    thumbnail: "/assets/walls/singles/wall_stone_window_se.png",
  },
  {
    key: "none",
    name: "Open Rooftop Loft",
    description: "Clean minimalist open terrace without perimeter walls.",
    category: "none",
    sePlainKey: "",
    swPlainKey: "",
    seWindowKey: "",
    swWindowKey: "",
    thumbnail: "",
  },
];
