import { SHARED_PACKAGE } from '@nova/shared';

/**
 * Placeholder export proving that packages/renderer resolves
 * packages/shared. No Three.js scene code exists yet — see ticket
 * T-001's scope note.
 */
export const RENDERER_PACKAGE = '@nova/renderer' as const;
export const RENDERER_SHARED_DEPENDENCY = SHARED_PACKAGE;
