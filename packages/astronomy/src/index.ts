import { SHARED_PACKAGE } from '@nova/shared';

/**
 * Placeholder export proving that packages/astronomy resolves
 * packages/shared at both the type-checker and the bundler. No
 * astronomical calculation exists yet — see ticket T-001's scope note.
 */
export const ASTRONOMY_PACKAGE = '@nova/astronomy' as const;
export const ASTRONOMY_SHARED_DEPENDENCY = SHARED_PACKAGE;
