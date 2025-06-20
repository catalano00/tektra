import { getAutodeskAccessToken } from '@/lib/autodesk';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const token = await getAutodeskAccessToken();

    // TODO: Replace with your actual project and file URN
    const urn = 'YOUR_REVIT_FILE_URN'; // base64-encoded objectId
    const metadataRes = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const metadataGuid = metadataRes.data.data.metadata[0].guid;

    const propertiesRes = await axios.get(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/metadata/${metadataGuid}/properties`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const panels = []; // <- you'll filter and transform propertiesRes.data here

    // Example insert
    await prisma.component.createMany({
      data: panels,
      skipDuplicates: true,
    });

    res.status(200).json({ success: true, count: panels.length });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Sync failed' });
  }
}
