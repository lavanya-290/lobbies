import { PrismaClient, AssetType } from "@prisma/client";

const prisma = new PrismaClient();

const assets = [
  { label: "Red Chair", color: "#e74c3c", width: 24, height: 32 },
  { label: "Blue Table", color: "#3498db", width: 48, height: 24 },
  { label: "Green Plant", color: "#2ecc71", width: 24, height: 32 },
  { label: "Yellow Lamp", color: "#f1c40f", width: 20, height: 28 },
];

async function main() {
  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { id: `placeholder-${asset.label.toLowerCase().replaceAll(" ", "-")}` },
      create: {
        id: `placeholder-${asset.label.toLowerCase().replaceAll(" ", "-")}`,
        type: AssetType.HANDMADE,
        metadata: { placeholderColor: asset.color, label: asset.label, width: asset.width, height: asset.height },
      },
      update: {
        type: AssetType.HANDMADE,
        metadata: { placeholderColor: asset.color, label: asset.label, width: asset.width, height: asset.height },
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