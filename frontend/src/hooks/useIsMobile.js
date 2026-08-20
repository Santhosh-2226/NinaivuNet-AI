import { useState, useEffect } from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Media query matching screens less than 768px (mobile range)
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    
    // Set initial state
    setIsMobile(mediaQuery.matches);

    // Dynamic resize handler
    const handler = (e) => setIsMobile(e.matches);

    // Subscribe to query updates
    mediaQuery.addEventListener("change", handler);

    // Cleanup subscription
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
