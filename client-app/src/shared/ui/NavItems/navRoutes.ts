// A nav entry stays lit for every route it owns, not just its own path: the
// Matches entry covers /matches/tournament/:code and /matches/spectate/:code,
// and the Tournaments entry covers the /tournament/:id detail route.
const ROUTES_OWNED_BY_NAV_PATH: Record<string, string[]> = {
  "/tournaments": ["/tournaments", "/tournament"],
};

export const isNavPathActive = (currentPath: string, navPath: string) =>
  (ROUTES_OWNED_BY_NAV_PATH[navPath] ?? [navPath]).some(
    (route) => currentPath === route || currentPath.startsWith(`${route}/`),
  );
