import { useState } from "react";
import { RoomsList } from "./RoomList";
import { RoomsForm } from "./RoomsForm";
import { useSearchParams, useOutletContext, useParams } from "react-router";

type Mode = "LIST" | "CREATE" | "EDIT";

type OutletContext = { readOnly?: boolean };

export function RoomsPage() {
  const [mode, setMode] = useState<Mode>("LIST");
  const [editingRoomKey, setEditingRoomKey] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const params = useParams<{ hotelId?: string }>();
  const outletContext = useOutletContext<OutletContext>();
  const readOnly = outletContext?.readOnly ?? false;
  // Get hotelId from search params (onboarding) or route params (admin review)
  const hotelId = searchParams.get("draftId") || params.hotelId;
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
          readOnly={readOnly}
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
