'use client';

import * as Sentry from '@sentry/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestErrorPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  // Function to trigger a client-side error
  const triggerClientError = () => {
    // Let the error bubble up naturally for Sentry to catch
    // This simulates a real uncaught error
    setTimeout(() => {
      const obj: any = null;
      obj.nonExistentMethod(); // This will throw and be caught by Sentry
    }, 0);
    setMessage('Client error triggered! Check your dashboard in a few seconds.');
  };

  // Function to trigger a server-side error
  const triggerServerError = async () => {
    try {
      const response = await fetch('/api/test-error');
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Server error triggered! Check your Sentry dashboard.');
    }
  };

  // Function to trigger an API error
  const triggerApiError = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/test-error`);
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('API error triggered! Check your Sentry dashboard.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sentry Test Page</h1>
      
      <div className="space-y-8">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Next.js Client Error</h2>
          <p className="mb-4">Triggers a JavaScript error in the browser.</p>
          <button 
            onClick={triggerClientError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Trigger Client Error
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Next.js Server Error</h2>
          <p className="mb-4">Triggers an error in a Next.js API route.</p>
          <button 
            onClick={triggerServerError}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Trigger Server Error
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Fastify API Error</h2>
          <p className="mb-4">Triggers an error in the Fastify API.</p>
          <button 
            onClick={triggerApiError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Trigger API Error
          </button>
        </div>

        {message && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <div className="mt-8">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
