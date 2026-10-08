import { PrismaClient, AssetType } from "@prisma/client";

const prisma = new PrismaClient();

const placeholderAssets = [
  { label: "Red Chair", color: "#e74c3c", width: 24, height: 32 },
  { label: "Blue Table", color: "#3498db", width: 48, height: 24 },
  { label: "Green Plant", color: "#2ecc71", width: 24, height: 32 },
  { label: "Yellow Lamp", color: "#f1c40f", width: 20, height: 28 },
];

const quirkyAssets = [
  {
    id: "quirky-carpet-swirl",
    label: "Swirl Carpet",
    sourceUrl: "/assets/furniture/quirky/carpet_swirl.png",
    width: 140,
    height: 94,
  },
  {
    id: "quirky-sofa-wave",
    label: "Wave Sofa",
    sourceUrl: "/assets/furniture/quirky/sofa_wave.png",
    width: 111,
    height: 85,
  },
  {
    id: "quirky-lamp-claw",
    label: "Claw Floor Lamp",
    sourceUrl: "/assets/furniture/quirky/lamp_claw.png",
    width: 52,
    height: 118,
  },
];

const photoFurnitureAssets = [
  {
    id: "chair-blue-flower-se",
    label: "Blue Flower Chair (SE)",
    sourceUrl: "/assets/furniture/chairs/blue_flower_chair_se.png",
    width: 60,
    height: 73,
  },
  {
    id: "chair-blue-flower-sw",
    label: "Blue Flower Chair (SW)",
    sourceUrl: "/assets/furniture/chairs/blue_flower_chair_sw.png",
    width: 60,
    height: 80,
  },
  {
    id: "chair-blue-leaf-se",
    label: "Blue Leaf Chair (SE)",
    sourceUrl: "/assets/furniture/chairs/blue_leaf_chair_se.png",
    width: 62,
    height: 83,
  },
  {
    id: "chair-blue-leaf-sw",
    label: "Blue Leaf Chair (SW)",
    sourceUrl: "/assets/furniture/chairs/blue_leaf_chair_sw.png",
    width: 62,
    height: 79,
  },
  {
    id: "sofa-heart-se",
    label: "Heart Chaise Sofa (SE)",
    sourceUrl: "/assets/furniture/chairs/heart_sofa_se.png",
    width: 110,
    height: 101,
  },
  {
    id: "sofa-heart-sw",
    label: "Heart Chaise Sofa (SW)",
    sourceUrl: "/assets/furniture/chairs/heart_sofa_sw.png",
    width: 110,
    height: 115,
  },
  {
    id: "seating-orange-hanging-se",
    label: "Orange Ski-Lift Bench (SE)",
    sourceUrl: "/assets/furniture/chairs/orange_hanging_seating_se.png",
    width: 112,
    height: 152,
  },
  {
    id: "seating-orange-hanging-sw",
    label: "Orange Ski-Lift Bench (SW)",
    sourceUrl: "/assets/furniture/chairs/orange_hanging_seating_sw.png",
    width: 112,
    height: 160,
  },
  {
    id: "chair-red-armchair-se",
    label: "Red Scoop Armchair (SE)",
    sourceUrl: "/assets/furniture/chairs/red_armchair_se.png",
    width: 62,
    height: 70,
  },
  {
    id: "chair-red-armchair-sw",
    label: "Red Scoop Armchair (SW)",
    sourceUrl: "/assets/furniture/chairs/red_armchair_sw.png",
    width: 62,
    height: 71,
  },
  {
    id: "chair-scorpion-se",
    label: "Scorpion Throne Chair (SE)",
    sourceUrl: "/assets/furniture/chairs/scorpion_chair_se.png",
    width: 66,
    height: 105,
  },
  {
    id: "chair-scorpion-sw",
    label: "Scorpion Throne Chair (SW)",
    sourceUrl: "/assets/furniture/chairs/scorpion_chair_sw.png",
    width: 66,
    height: 102,
  },
  {
    id: "sofa-se",
    label: "Curved Maroon Sofa (SE)",
    sourceUrl: "/assets/furniture/chairs/sofa_se.png",
    width: 112,
    height: 76,
  },
  {
    id: "sofa-sw",
    label: "Curved Maroon Sofa (SW)",
    sourceUrl: "/assets/furniture/chairs/sofa_sw.png",
    width: 112,
    height: 65,
  },
  {
    id: "chair-yellow-pretty-se",
    label: "Yellow Petal Cocoon Chair (SE)",
    sourceUrl: "/assets/furniture/chairs/yellow_pretty_chair_se.png",
    width: 62,
    height: 75,
  },
  {
    id: "chair-yellow-pretty-sw",
    label: "Yellow Petal Cocoon Chair (SW)",
    sourceUrl: "/assets/furniture/chairs/yellow_pretty_chair_sw.png",
    width: 62,
    height: 81,
  },
  {
    id: "carpet-flower-se",
    label: "Daisy Petal Rug (SE)",
    sourceUrl: "/assets/furniture/carpets/flower_carpet_se.png",
    width: 96,
    height: 85,
  },
  {
    id: "carpet-flower-sw",
    label: "Daisy Petal Rug (SW)",
    sourceUrl: "/assets/furniture/carpets/flower_carpet_sw.png",
    width: 96,
    height: 58,
  },
  {
    id: "carpet-pink-splash-se",
    label: "Pink Splash Puddle Rug (SE)",
    sourceUrl: "/assets/furniture/carpets/pink_splash_rug_se.png",
    width: 104,
    height: 90,
  },
  {
    id: "carpet-pink-splash-sw",
    label: "Pink Splash Puddle Rug (SW)",
    sourceUrl: "/assets/furniture/carpets/pink_splash_rug_sw.png",
    width: 104,
    height: 90,
  },
  {
    id: "carpet-simple-circle-se",
    label: "White Pom-Pom Rug (SE)",
    sourceUrl: "/assets/furniture/carpets/simple_circle_rug_se.png",
    width: 88,
    height: 74,
  },
  {
    id: "carpet-simple-circle-sw",
    label: "White Pom-Pom Rug (SW)",
    sourceUrl: "/assets/furniture/carpets/simple_circle_rug_sw.png",
    width: 88,
    height: 64,
  },
  {
    id: "carpet-simple-rug-se",
    label: "Beige Shag Runner (SE)",
    sourceUrl: "/assets/furniture/carpets/simple_rug_se.png",
    width: 100,
    height: 62,
  },
  {
    id: "carpet-simple-rug-sw",
    label: "Beige Shag Runner (SW)",
    sourceUrl: "/assets/furniture/carpets/simple_rug_sw.png",
    width: 100,
    height: 60,
  },
  {
    id: "carpet-tiger-se",
    label: "Turquoise Bengal Tiger Rug (SE)",
    sourceUrl: "/assets/furniture/carpets/tiger_carpet_se.png",
    width: 110,
    height: 83,
  },
  {
    id: "carpet-tiger-sw",
    label: "Turquoise Bengal Tiger Rug (SW)",
    sourceUrl: "/assets/furniture/carpets/tiger_carpet_sw.png",
    width: 110,
    height: 69,
  },
  {
    id: "green-cupboard-quirky-se",
    label: "Wavy Lime Bookcase Tower (SE)",
    sourceUrl: "/assets/furniture/quirky/green_cupboard_quirky_se.png",
    width: 60,
    height: 134,
  },
  {
    id: "green-cupboard-quirky-sw",
    label: "Wavy Lime Bookcase Tower (SW)",
    sourceUrl: "/assets/furniture/quirky/green_cupboard_quirky_sw.png",
    width: 60,
    height: 145,
  },
  {
    id: "plant-flowering-delicate",
    label: "Potted Delicate Orchid",
    sourceUrl: "/assets/furniture/houseplants/flowering_delicate_stem.png",
    width: 44,
    height: 87,
  },
  {
    id: "plant-desert-cacti",
    label: "Desert Cacti Cluster",
    sourceUrl: "/assets/furniture/houseplants/desert_cacti_cluster.png",
    width: 48,
    height: 61,
  },
  {
    id: "plant-monstera-longleaf",
    label: "Monstera Longleaf Plant",
    sourceUrl: "/assets/furniture/houseplants/monstera_longleaf.png",
    width: 54,
    height: 71,
  },
  {
    id: "plant-pothos-money",
    label: "Cascading Pothos Money Plant",
    sourceUrl: "/assets/furniture/houseplants/pothos_money_plant.png",
    width: 50,
    height: 58,
  },
];

async function main() {
  for (const asset of placeholderAssets) {
    const id = `placeholder-${asset.label.toLowerCase().replaceAll(" ", "-")}`;
    await prisma.asset.upsert({
      where: { id },
      create: {
        id,
        type: AssetType.HANDMADE,
        metadata: { placeholderColor: asset.color, label: asset.label, width: asset.width, height: asset.height },
      },
      update: {
        type: AssetType.HANDMADE,
        metadata: { placeholderColor: asset.color, label: asset.label, width: asset.width, height: asset.height },
      },
    });
  }

  for (const asset of [...quirkyAssets, ...photoFurnitureAssets]) {
    await prisma.asset.upsert({
      where: { id: asset.id },
      create: {
        id: asset.id,
        type: AssetType.HANDMADE,
        sourceUrl: asset.sourceUrl,
        metadata: {
          label: asset.label,
          width: asset.width,
          height: asset.height,
          sourceUrl: asset.sourceUrl,
        },
      },
      update: {
        type: AssetType.HANDMADE,
        sourceUrl: asset.sourceUrl,
        metadata: {
          label: asset.label,
          width: asset.width,
          height: asset.height,
          sourceUrl: asset.sourceUrl,
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());