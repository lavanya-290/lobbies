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
      className="chrome-panel"
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        width: 300,
        maxHeight: 560,
        backgroundColor: "rgba(10, 16, 22, 0.96)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 14px",
          borderBottom: "2px solid #4fd8e0",
          background: "rgba(10, 16, 22, 0.98)",
        }}
      >
        <div>
          <h2 className="pixel-header" style={{ fontSize: 11, margin: 0, color: "#dffcff" }}>
            WARDROBE
          </h2>
          <span style={{ fontSize: 10, color: "#8fe8ee" }}>
            Base: {character === "MALE" ? "Male Chibi" : "Female Chibi"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="btn-secondary"
          style={{
            padding: "3px 8px",
            fontSize: 11,
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
                  fontFamily: "var(--font-pixel)",
                  fontSize: 9,
                  letterSpacing: "0.05em",
                  color: "#4fd8e0",
                  marginBottom: 6,
                  paddingBottom: 4,
                  borderBottom: "1px solid #1f7a82",
                  textTransform: "uppercase",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
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
                        padding: "7px 10px",
                        borderRadius: 2,
                        border: isEquipped ? "2px solid #4fd8e0" : "1px solid #1f7a82",
                        background: isEquipped ? "rgba(31, 185, 196, 0.18)" : "rgba(10, 16, 22, 0.8)",
                        color: isEquipped ? "#dffcff" : "#8fe8ee",
                        cursor: "pointer",
                        fontSize: 12,
                        textAlign: "left",
                        boxShadow: isEquipped ? "2px 2px 0px #1f7a82" : "none",
                        transition: "all 0.1s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{item.name}</span>
                        {!item.hasWalkSheets && (
                          <span
                            style={{
                              fontSize: 9,
                              background: "rgba(10, 16, 22, 0.9)",
                              border: "1px solid #1f7a82",
                              color: "#8fe8ee",
                              padding: "1px 4px",
                              borderRadius: 2,
                            }}
                            title="Static idle overlay"
                          >
                            Static
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700 }}>
                        {isEquipped ? (
                          <span
                            style={{
                              fontFamily: "var(--font-pixel)",
                              fontSize: 8,
                              color: "#061e22",
                              background: "#4fd8e0",
                              padding: "2px 6px",
                              borderRadius: 2,
                            }}
                          >
                            EQUIPPED
                          </span>
                        ) : isHiddenByDress ? (
                          <span style={{ color: "#1f7a82", fontSize: 10 }}>Overridden</span>
                        ) : (
                          <span style={{ color: "#4fd8e0" }}>Equip</span>
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
