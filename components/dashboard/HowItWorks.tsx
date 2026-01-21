"use client";

const steps = [
  {
    number: 1,
    title: "Connect & Join",
    description:
      "Connect your wallet and pay a 10% deposit to join the waiting list. You'll be added to the current batch.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Batch Fills",
    description:
      "Wait for 23 other participants to join. When the batch reaches 24 people, it becomes active.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Pay Balance",
    description:
      "Pay the remaining 90% within 7 days. Then submit your shipping info (encrypted) and optional metadata.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    number: 4,
    title: "Register Kit",
    description:
      "Receive your DNA kit. Register the kit ID with a secure 6-digit PIN that only you know.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    number: 5,
    title: "Lab Processing",
    description:
      "Send your sample back. The lab processes all 24 samples together (2-4 weeks for sequencing).",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
  },
  {
    number: 6,
    title: "Download Results",
    description:
      "Get notified when results are ready. Enter your PIN to decrypt and download your DNA data CSV. Data is purged after 60 days.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
        />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 sm:p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">How It Works</h2>
        <p className="text-gray-600">
          Simple, secure, and privacy-preserving DNA testing
        </p>
      </div>

      {/* Desktop: Grid Layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                {step.number}
              </div>
              <div className="ml-4 flex-1">
                <div className="text-blue-600 mb-2">{step.icon}</div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Mobile: Vertical Stack */}
      <div className="md:hidden space-y-4">
        {steps.map((step, idx) => (
          <div key={step.number}>
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <div className="flex items-start mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                  {step.number}
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <div className="ml-2 text-blue-600">{step.icon}</div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed ml-13">
                {step.description}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
