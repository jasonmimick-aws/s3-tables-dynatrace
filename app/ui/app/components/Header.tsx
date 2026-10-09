import React from "react";
import { Link, useLocation } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components/layouts";

export const Header = () => {
  const location = useLocation();
  return (
    <AppHeader>
      <AppHeader.Navigation>
        <AppHeader.Logo as={Link} to="/" />
        <AppHeader.NavigationItem as={Link} to="/" isSelected={location.pathname === "/"}>
          Overview
        </AppHeader.NavigationItem>
        <AppHeader.NavigationItem as={Link} to="/explore" isSelected={location.pathname.startsWith("/explore")}>
          Explore
        </AppHeader.NavigationItem>
      </AppHeader.Navigation>
    </AppHeader>
  );
};
