// lib/autodesk.ts
import axios from 'axios';

export async function getAutodeskAccessToken() {
  const clientId = process.env.AUTODESK_CLIENT_ID;
  const clientSecret = process.env.AUTODESK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Autodesk client ID or secret in environment variables');
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'data:read data:write');

  const res = await axios.post(
    'https://developer.api.autodesk.com/authentication/v1/authenticate',
    params,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return res.data.access_token;
}