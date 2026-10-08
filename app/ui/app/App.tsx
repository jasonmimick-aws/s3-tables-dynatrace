import { PageLayout } from "@dynatrace/strato-components/layouts";
import React from "react";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Overview } from "./pages/Overview";
import { Topology } from "./pages/Topology";
import { SchemaTimeline } from "./pages/SchemaTimeline";
import { FinOps } from "./pages/FinOps";

export const App = () => {
  return (
    <PageLayout>
      <PageLayout.Header>
        <Header />
      </PageLayout.Header>
      <PageLayout.Content>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/topology" element={<Topology />} />
          <Route path="/schema" element={<SchemaTimeline />} />
          <Route path="/finops" element={<FinOps />} />
        </Routes>
      </PageLayout.Content>
    </PageLayout>
  );
};
