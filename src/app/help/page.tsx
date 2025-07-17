// app/(dashboard)/help/page.tsx
'use client';

export default function HelpPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Help & Support</h1>
      <p className="text-gray-600 mb-4">
        If you're experiencing issues or have questions, please review the documentation or contact support.
      </p>
      <ul className="list-disc list-inside text-gray-700">
        <li>Email: <a className="text-blue-600" href="mailto:support@tektrabuilt.com">support@tektrabuilt.com</a></li>
        <li>Docs: <a className="text-blue-600" href="/docs">View Documentation</a></li>
        <li>Slack: Join the internal #tektrasupport channel</li>
      </ul>
    </div>
  );
}