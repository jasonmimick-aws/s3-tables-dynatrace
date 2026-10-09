import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo as={Link} to="/" />
        <AppHeader.NavigationItem as={Link} to="/">
          Overview
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/topology">
          Topology
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/datasets">
          Datasets
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/schema">
          Schema timeline
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/finops">
          FinOps
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/data">
          Data insights
        </AppHeader.NavigationItem>
      </AppHeader.Navigation>
    </AppHeader>
  );
};
