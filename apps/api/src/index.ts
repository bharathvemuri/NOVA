import { ASTRONOMY_PACKAGE } from '@nova/astronomy';
import { SHARED_PACKAGE } from '@nova/shared';

/**
 * Placeholder export proving that apps/api resolves packages/astronomy
 * and packages/shared. No HTTP route or Express server exists yet —
 * see ticket T-001's scope note.
 */
export const API_APP = '@nova/api' as const;
export const API_DEPENDENCIES = [SHARED_PACKAGE, ASTRONOMY_PACKAGE] as const;
