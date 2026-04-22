import { createContext, useReducer, type ReactNode } from "react";
import type { FormStateType, RoomStateType } from "../types";
import { formReducer, RoomDetailsReducer } from "../state/reducer";
import { initialRoomState, initialState } from "../state/initialState";
import type { FormActionType, RoomInfoActionType } from "../state/actions";
const FormContext = createContext<
  | {
      formDataState: FormStateType;
      setFormDataState: (action: FormActionType) => void;
      roomDetailsState: RoomStateType;
      setRoomDetailsState: (action: RoomInfoActionType) => void;
    }
  | undefined
>(undefined);

const FormContextProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useReducer(formReducer, initialState);
  const [roomDetails, setRoomDetails] = useReducer(
    RoomDetailsReducer,
    initialRoomState
  );
  return (
    <FormContext.Provider
      value={{
        formDataState: formData,
        setFormDataState: setFormData,
        roomDetailsState: roomDetails,
        setRoomDetailsState: setRoomDetails,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};
export { FormContextProvider, FormContext };
