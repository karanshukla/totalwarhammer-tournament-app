import { useState, useEffect, useCallback } from "react";

const readHash = () => window.location.hash.replace("#", "");

/**
 * Two-way binding between the URL hash and the active tab, so deep links and
 * the browser's back/forward buttons both land on the right tab. An unknown or
 * missing hash falls back to the first tab.
 */
export function useHashTab(tabIds: string[]) {
  const getInitialTab = useCallback(() => {
    const hash = readHash();
    return hash && tabIds.includes(hash) ? hash : tabIds[0];
  }, [tabIds]);

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (readHash() !== activeTab) {
      window.location.hash = `#${activeTab}`;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = readHash();
      if (newHash && tabIds.includes(newHash)) {
        if (activeTab !== newHash) {
          setActiveTab(newHash);
        }
      } else if (!newHash && activeTab !== tabIds[0]) {
        setActiveTab(tabIds[0]);
      } else if (
        newHash &&
        !tabIds.includes(newHash) &&
        activeTab !== tabIds[0]
      ) {
        setActiveTab(tabIds[0]);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    /* c8 ignore next 3 — the sync effect above always sets the hash before this runs */
    if (readHash() !== activeTab) {
      window.location.hash = `#${activeTab}`;
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [tabIds, activeTab]);

  return [activeTab, setActiveTab] as const;
}
