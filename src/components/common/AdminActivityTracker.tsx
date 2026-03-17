import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { post } from "@/services/apiService";

function buildPageTitle(pathname: string) {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "admin" && segment !== "vendor");

  if (segments.length === 0) {
    return "Dashboard";
  }

  return segments
    .map((segment) =>
      segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase())
    )
    .join(" / ");
}

export default function AdminActivityTracker() {
  const location = useLocation();
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");
    const user = localStorage.getItem("user");
    const currentPath = `${location.pathname}${location.search}`;

    if (!authToken || !user || lastTrackedPathRef.current === currentPath) {
      return;
    }

    lastTrackedPathRef.current = currentPath;

    void post("/audit-logs/page-view", {
      path: location.pathname,
      search: location.search,
      title: buildPageTitle(location.pathname),
    }).catch((error) => {
      console.error("Failed to log page activity:", error);
    });
  }, [location.pathname, location.search]);

  return null;
}
