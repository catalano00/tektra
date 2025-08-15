'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-white relative">
      {/* Centered Card */}
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-8 flex flex-col items-center">
        {/* Logo */}
        <img
          src="/tektra-logo.png"
          alt="TEKTRA Logo"
          className="h-16 mb-6"
        />

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 text-center">Sign in to TEKTRA</h1>

        {/* Email Input */}
        <div className="w-full mb-4 text-left">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email Address"
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Continue Button */}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white font-bold py-2 rounded mb-4 hover:bg-blue-600 transition"
        >
          CONTINUE
        </button>

        {/* Sign up link */}
        <div className="w-full flex justify-between items-center text-sm mb-4">
          <span className="text-gray-600">Need an account?</span>
          <a href="#" className="text-blue-600 font-medium hover:underline">Sign up</a>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full my-4">
          <div className="flex-grow h-px bg-gray-300" />
          <span className="mx-2 text-gray-500 text-xs">OR</span>
          <div className="flex-grow h-px bg-gray-300" />
        </div>

        {/* Microsoft Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            signIn('azure-ad', { callbackUrl: '/' });
          }}
          className="w-full flex items-center justify-center border border-gray-300 rounded py-2 font-semibold bg-white hover:bg-gray-50 transition"
        >
          <img
            src="/microsoft-logo.png"
            alt="Microsoft Logo"
            className="h-5 w-50 mr-2"
          />
        </button>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 w-full text-center text-xs text-gray-500">
        © TEKTRA 2326 I-70 Frontage Rd Grand Junction, CO 81505 •{' '}
        <a href="#" className="underline hover:text-gray-700">TERMS OF USE</a>
      </footer>
    </main>
  );
}