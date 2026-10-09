import { PageLayout } from "@dynatrace/strato-components/layouts";
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Overview } from "./pages/Overview";
import { Explore } from "./pages/Explore";
import "./app.css";

export const App = () => (
  <PageLayout>
    <PageLayout.Header><Header /></PageLayout.Header>
    <PageLayout.Content>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/explore" element={<Explore />} />
        {/* Preserve old bookmarks while presenting one coherent investigation flow. */}
        <Route path="/data" element={<Navigate to="/explore#data-profile" replace />} />
        <Route path="/datasets" element={<Navigate to="/explore#data-profile" replace />} />
        <Route path="/changes" element={<Navigate to="/explore#changes" replace />} />
        <Route path="/schema" element={<Navigate to="/explore#changes" replace />} />
        <Route path="/cost" element={<Navigate to="/explore#cost" replace />} />
        <Route path="/finops" element={<Navigate to="/explore#cost" replace />} />
        <Route path="/topology" element={<Navigate to="/explore#state" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageLayout.Content>
  </PageLayout>
);
