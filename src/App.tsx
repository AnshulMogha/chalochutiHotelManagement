import { Suspense } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { LoadingSpinner } from "./components/ui";
import { UserProvider } from "./context/UserContext";
import "./App.css";

function App() {
  return (
    <UserProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <RouterProvider router={router} />
      </Suspense>
    </UserProvider>
  );
}

export default App;
