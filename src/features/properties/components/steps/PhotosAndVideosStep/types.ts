export interface MediaFile {
  mediaId: number;
  
  fileUrl: string;
  type: "IMAGE" | "VIDEO";
  
  tag: string;
}
export interface  RoomMediaFile {
  mediaId: number;
  fileUrl: string;
  type: "IMAGE" | "VIDEO";
  tag: string;
  roomId: string;
  roomName: string;
}

export type MediaTag =
  | "EXTERIOR"
  | "LOBBY"
  | "RECEPTION"
  | "ROOM"
  | "BEDROOM"
  | "BATHROOM"
  | "KITCHEN"
  | "BALCONY"
  | "RESTAURANT"
  | "POOL"
  | "GYM"
  | "SPA"
  | "CONFERENCE"
  | "VIEW"
  | "OTHER";

export type ActiveTab = "inventory" | "hotel" | "rooms";

export interface MediaData {
  inventory: MediaFile[];
  hotel: { mediaIds: string[] };
  rooms: Record<string, { mediaIds: string[] }>;
}

export interface UploadMediaResponse {
  mediaId: number;
  fileUrl: string;
  fileType: "IMAGE" | "VIDEO";
}
