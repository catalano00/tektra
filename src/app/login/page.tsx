'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to TEKTRA</h1>
        <p className="text-gray-600">Sign in using your Microsoft account</p>
        <button
          onClick={(e) => {
            e.preventDefault();
            signIn('azure-ad');
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700"
        >
          Sign in with Microsoft
        </button>
      </div>
    </main>
  );
}