/**
 * Tournament format service — encapsulates bracket/schedule generation and
 * round-advancement logic for all supported tournament types.
 *
 * Supported formats:
 *   - Single Elimination
 *   - Double Elimination
 *   - Round Robin
 *   - Swiss System
 *
 * Each format's generation/advancement logic lives in its own colocated
 * module; this file just composes their public exports so callers (the
 * tournament controller, tests) keep importing from one place.
 */

export {
  doubleElimStart,
  doubleElimAdvance,
} from "./double-elimination-service.js";
export {
  roundRobinStart,
  roundRobinAdvance,
  roundRobinStandings,
} from "./round-robin-service.js";
export {
  singleElimStart,
  singleElimAdvance,
} from "./single-elimination-service.js";
export { swissStart, swissAdvance, swissStandings } from "./swiss-service.js";
