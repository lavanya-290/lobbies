"use client";

import React from "react";
import { OUTFIT_ITEMS, CATEGORY_LABELS, OutfitCategory, OutfitItem } from "@/lib/outfits";

interface WardrobeOverlayProps {
  character: "MALE" | "FEMALE";
  equippedOutfit: Record<string, string>;
  onToggleItem: (item: OutfitItem) => void;
  onClose: () => void;
}

export default function WardrobeOverlay({
  character,
  equippedOutfit,
  onToggleItem,
  onClose,
}: WardrobeOverlayProps) {
  // Filter items matching the player's character gender or unisex
  const filteredItems = OUTFIT_ITEMS.filter(
    (item) => item.gender === "UNISEX" || item.gender === character
  );

  // Group by category
  const categories: OutfitCategory[] = ["headwear", "top", "bottom", "dress", "footwear", "face_accessory"];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        width: 290,
        maxHeight: 560,
        background: "rgba(23, 23, 34, 0.95)",
        backdropFilter: "blur(8px)",
        color: "#f4f4f5",
        border: "1px solid #3f3f46",
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #3f3f46",
          background: "rgba(39, 39, 42, 0.5)",
        }}
      >
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#fbbf24" }}>
            Wardrobe & Outfits
          </h2>
          <span style={{ fontSize: 11, color: "#a1a1aa" }}>
            Base: {character === "MALE" ? "Male Chibi" : "Female Chibi"}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#a1a1aa",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
            lineHeight: 1,
          }}
          title="Close Wardrobe"
        >
          ✕
        </button>
      </div>

      {/* Content list */}
      <div
        style={{
          padding: 12,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 480,
        }}
      >
        {categories.map((cat) => {
          const itemsInCat = filteredItems.filter((item) => item.category === cat);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={cat}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#d4d4d8",
                  marginBottom: 6,
                  paddingBottom: 2,
                  borderBottom: "1px solid rgba(63, 63, 70, 0.4)",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {itemsInCat.map((item) => {
                  const isEquipped = equippedOutfit[item.category] === item.id;
                  const isDressEquipped = !!equippedOutfit.dress;
                  const isHiddenByDress = isDressEquipped && (item.category === "top" || item.category === "bottom");

                  return (
                    <button
                      key={item.id}
                      onClick={() => onToggleItem(item)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: isEquipped ? "1px solid #fbbf24" : "1px solid #27272a",
                        background: isEquipped ? "rgba(251, 191, 36, 0.15)" : "#18181b",
                        color: isEquipped ? "#fbbf24" : "#e4e4e7",
                        cursor: "pointer",
                        fontSize: 12,
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{item.name}</span>
                        {!item.hasWalkSheets && (
                          <span
                            style={{
                              fontSize: 9,
                              background: "#3f3f46",
                              color: "#d4d4d8",
                              padding: "1px 4px",
                              borderRadius: 3,
                            }}
                            title="Static idle overlay (walk animation coming soon)"
                          >
                            Static
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>
                        {isEquipped ? (
                          <span style={{ color: "#fbbf24" }}>✓ Equipped</span>
                        ) : isHiddenByDress ? (
                          <span style={{ color: "#71717a", fontSize: 10 }}>Overridden</span>
                        ) : (
                          <span style={{ color: "#71717a" }}>Equip</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
