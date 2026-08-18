import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Foundation-ticket config: no product features, just a build that proves
// the toolchain works end to end. See ticket T-001.
export default defineConfig({
  plugins: [react()],
});
