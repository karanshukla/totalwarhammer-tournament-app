import React, { createContext, useState, useContext, useCallback } from "react";

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: window.location.pathname,
  navigate: () => {},
});

export const useRouter = () => useContext(RouterContext);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname || "/"
  );

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setCurrentPath(path);
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const Route: React.FC<{
  path: string;
  component: React.ComponentType;
}> = ({ path, component: Component }) => {
  const { currentPath } = useRouter();

  const pathMatches = () => {
    if (path === "*") return true;
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return pathMatches() ? <Component /> : null;
};
