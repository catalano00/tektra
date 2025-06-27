/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// pages/api/sync-autodesk.ts

import { syncAutodesk } from '@/lib/autodesk'

export default async function handler(req, res) {
  const result = await syncAutodesk()
  res.status(200).json(result)
}
// This is a placeholder for the actual Autodesk sync logic.