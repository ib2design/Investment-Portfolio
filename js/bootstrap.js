import { ensureLatestVersion } from './versionCheck.js';
import { registerUserOnce } from './userAnalytics.js';

await ensureLatestVersion();
registerUserOnce();
await import('./app.js');
