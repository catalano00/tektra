// scripts/get-token.ts
import 'dotenv/config'; // 👈 Load .env.local at runtime
import { getAutodeskAccessToken } from '../lib/autodesk';

(async () => {
  const token = await getAutodeskAccessToken();
  console.log('Access Token:', token);
})();