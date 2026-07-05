import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={10}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid rgba(103, 232, 249, 0.2)",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            boxShadow: "0 16px 40px -12px rgba(2, 8, 23, 0.7)",
          },
          success: {
            iconTheme: { primary: "#34d399", secondary: "#0f172a" },
          },
          error: {
            iconTheme: { primary: "#fb7185", secondary: "#0f172a" },
          },
        }}
      />
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
