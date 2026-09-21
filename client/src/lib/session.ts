const HOUSE_ID_KEY = "habbo_selected_house_id";
const ROOM_ID_KEY = "habbo_selected_room_id";
const ROOM_TYPE_KEY = "habbo_selected_room_type";
const SHARED_ROOM_ID_KEY = "habbo_selected_shared_room_id";

export function setSelectedRoom(
  houseId: string,
  roomId: string,
  roomType: "SHARED" | "PERSONAL",
  sharedRoomId: string,
) {
  localStorage.setItem(HOUSE_ID_KEY, houseId);
  localStorage.setItem(ROOM_ID_KEY, roomId);
  localStorage.setItem(ROOM_TYPE_KEY, roomType);
  localStorage.setItem(SHARED_ROOM_ID_KEY, sharedRoomId);
}

export function getSelectedRoom() {
  if (typeof window === "undefined") return null;
  const houseId = localStorage.getItem(HOUSE_ID_KEY);
  const roomId = localStorage.getItem(ROOM_ID_KEY);
  const roomType = localStorage.getItem(ROOM_TYPE_KEY);
  const sharedRoomId = localStorage.getItem(SHARED_ROOM_ID_KEY);
  if (!houseId || !roomId || !sharedRoomId || (roomType !== "SHARED" && roomType !== "PERSONAL")) {
    return null;
  }
  return { houseId, roomId, roomType, sharedRoomId };
}
