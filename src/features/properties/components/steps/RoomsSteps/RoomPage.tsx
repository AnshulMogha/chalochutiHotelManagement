import { useState } from "react";
import { RoomsList } from "./RoomList";
import { RoomsForm } from "./RoomsForm";
import { useSearchParams } from "react-router";

type Mode = "LIST" | "CREATE" | "EDIT";

export function RoomsPage() {
  const [mode, setMode] = useState<Mode>("LIST");
  const [editingRoomKey, setEditingRoomKey] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get("draftId");
  const handleOnAddNew = () => {
    setMode("CREATE");
  };
  const handleOnEdit = (roomKey: string) => {
    setEditingRoomKey(roomKey);
    setMode("EDIT");
  };
  return (
    <div className="p-6 w-3xl">
      {mode === "LIST" && (
        <RoomsList
          hotelId={hotelId}
          onAddNew={handleOnAddNew}
          onEdit={handleOnEdit}
        />
      )}

      {(mode === "CREATE" || mode === "EDIT") && (
        <RoomsForm
          mode={mode}
          editingRoomKey={editingRoomKey ?? undefined}
          onCancel={() => {
            setEditingRoomKey(null);
            setMode("LIST");
          }}
          onSuccess={() => {
            setEditingRoomKey(null);
            setMode("LIST");
          }}
        />
      )}
    </div>
  );
}
