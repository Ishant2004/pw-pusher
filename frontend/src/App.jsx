import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ViewerPage from "./pages/ViewerPage.jsx";

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/s/:token" element={<ViewerPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<div className="center muted">Page not found.</div>} />
        </Routes>
      </main>
    </>
  );
}
