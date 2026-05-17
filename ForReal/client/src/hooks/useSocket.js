import { useSocket, getSocket } from '../realtime/socket';

/**
 * Compatibility shim.
 * Some components import from "../../hooks/useSocket" while the realtime
 * implementation lives in "../realtime/socket".
 *
 * This file re-exports the realtime hook(s) under the expected path.
 */
export { useSocket, getSocket };
