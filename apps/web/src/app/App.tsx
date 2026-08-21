import { RENDERER_PACKAGE } from '@nova/renderer';
import { SHARED_PACKAGE } from '@nova/shared';

/**
 * Placeholder root component proving that apps/web resolves
 * packages/renderer and packages/shared, and that the Vite/React
 * toolchain builds. No Three.js scene or product feature exists yet —
 * see ticket T-001's scope note.
 */
export function App() {
  return (
    <div id="app">
      <p>
        NOVA — foundation build ({SHARED_PACKAGE}, {RENDERER_PACKAGE})
      </p>
    </div>
  );
}
