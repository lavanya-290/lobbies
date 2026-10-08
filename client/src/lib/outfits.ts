export type OutfitCategory = "headwear" | "top" | "bottom" | "dress" | "footwear" | "face_accessory";

export interface OutfitItem {
  id: string;
  name: string;
  category: OutfitCategory;
  gender: "FEMALE" | "MALE" | "UNISEX";
  folder: "casual" | "japanese" | "pirate";
  hasWalkSheets: boolean;
}

export const OUTFIT_ITEMS: OutfitItem[] = [
  // Casual
  { id: "crop_top", name: "Crop Top", category: "top", gender: "FEMALE", folder: "casual", hasWalkSheets: true },
  { id: "culottes", name: "Culottes", category: "bottom", gender: "FEMALE", folder: "casual", hasWalkSheets: true },
  { id: "henley_shirt", name: "Henley Shirt", category: "top", gender: "MALE", folder: "casual", hasWalkSheets: true },
  { id: "jeans_regular", name: "Regular Jeans", category: "bottom", gender: "MALE", folder: "casual", hasWalkSheets: true },

  // Japanese
  { id: "conical_hat", name: "Conical Hat", category: "headwear", gender: "UNISEX", folder: "japanese", hasWalkSheets: true },
  { id: "geta_sandals", name: "Geta Sandals", category: "footwear", gender: "FEMALE", folder: "japanese", hasWalkSheets: true },
  { id: "hakama_pants", name: "Hakama Pants", category: "bottom", gender: "MALE", folder: "japanese", hasWalkSheets: true },
  { id: "kimono_casual", name: "Casual Kimono", category: "dress", gender: "FEMALE", folder: "japanese", hasWalkSheets: true },
  { id: "yukata_summer", name: "Summer Yukata", category: "dress", gender: "FEMALE", folder: "japanese", hasWalkSheets: true },

  // Pirate
  { id: "tricorn_hat", name: "Tricorn Hat", category: "headwear", gender: "UNISEX", folder: "pirate", hasWalkSheets: true },
  { id: "captains_coat", name: "Captain's Coat", category: "top", gender: "MALE", folder: "pirate", hasWalkSheets: true },
  { id: "eyepatch_accessory", name: "Eyepatch", category: "face_accessory", gender: "UNISEX", folder: "pirate", hasWalkSheets: true },
  { id: "sash_and_boots", name: "Sash & Boots", category: "footwear", gender: "MALE", folder: "pirate", hasWalkSheets: true },
];

export const CATEGORY_LABELS: Record<OutfitCategory, string> = {
  headwear: "Headwear",
  top: "Tops",
  bottom: "Bottoms",
  dress: "Full-Body / Dresses",
  footwear: "Footwear",
  face_accessory: "Accessories",
};
