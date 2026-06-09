import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { useMobileCardTapGlow } from "@/hooks/useMobileCardTapGlow";
import { SplashScreen } from "@/components/common/SplashScreen";
import { store } from "@/store/store";
import "@/styles/globals.css";

function App() {
  useMobileCardTapGlow();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen appName="ARBITRUM" onFinish={() => setShowSplash(false)} />}
      <RouterProvider router={router} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
