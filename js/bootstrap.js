import { ensureLatestVersion } from './versionCheck.js';

await ensureLatestVersion();
await import('./app.js');
