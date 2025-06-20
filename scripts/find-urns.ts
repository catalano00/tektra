// scripts/find-urns.ts
import 'dotenv/config';
import axios from 'axios';
import { getAutodeskAccessToken } from '../lib/autodesk';

function encodeURN(objectId: string) {
  return Buffer.from(objectId).toString('base64');
}

async function run() {
  const token = await getAutodeskAccessToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Step 1: List hubs
  const hubsRes = await axios.get('https://developer.api.autodesk.com/project/v1/hubs', { headers });
  const hubs = hubsRes.data.data;

  if (hubs.length === 0) {
    console.error('❌ No hubs found.');
    return;
  }

  for (const hub of hubs) {
    console.log(`🔹 Hub: ${hub.attributes.name} (${hub.id})`);

    // Step 2: List projects in this hub
    const projectsRes = await axios.get(
      `https://developer.api.autodesk.com/project/v1/hubs/${hub.id}/projects`,
      { headers }
    );
    const projects = projectsRes.data.data;

    for (const project of projects) {
      console.log(`  📁 Project: ${project.attributes.name} (${project.id})`);

      // Step 3: List top-level folders (like "Project Files")
      const foldersRes = await axios.get(
        `https://developer.api.autodesk.com/project/v1/projects/${project.id}/folders`,
        { headers }
      );
      const folders = foldersRes.data.data;

      for (const folder of folders) {
        console.log(`    📂 Folder: ${folder.attributes.name} (${folder.id})`);

        // Step 4: List files inside folder
        const contentsRes = await axios.get(
          `https://developer.api.autodesk.com/data/v1/projects/${project.id}/folders/${folder.id}/contents`,
          { headers }
        );
        const contents = contentsRes.data.data;

        for (const item of contents) {
          if (item.type === 'items' && item.attributes.displayName.endsWith('.rvt')) {
            const rawUrn = item.id.replace('urn:', '');
            const urn = encodeURN(rawUrn);
            console.log(`      🧱 Revit File: ${item.attributes.displayName}`);
            console.log(`         ➤ URN: ${urn}\n`);
          }
        }
      }
    }
  }
}

run().catch((err) => {
  console.error('❌ Error:', err.response?.data || err.message);
});
