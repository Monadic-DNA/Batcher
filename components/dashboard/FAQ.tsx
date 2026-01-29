"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is a batch?",
    answer:
      "A batch is a group of exactly 24 people who share the cost of DNA sequencing. By pooling together, everyone gets professional-grade DNA testing at a fraction of the individual cost. Each batch moves through defined stages: Pending (collecting participants), Staged (full, awaiting activation), Active (kits being sent), Sequencing (lab processing), Completed (results ready), and Purged (data deleted after 60 days).",
  },
  {
    question: "How does the DNA Batcher work?",
    answer:
      "DNA Batcher coordinates groups of 24 people to share DNA testing costs. You pay a 10% deposit to join the queue, then pay the remaining 90% when your batch is full. Once activated, you'll receive a kit, send your sample, and get encrypted results.",
  },
  {
    question: "How is my privacy protected?",
    answer:
      "Your personal data (email, shipping address, DNA results) is stored encrypted in Nillion's privacy-preserving database (nilDB). You create a PIN that only you know - without it, your data cannot be decrypted. We never see your raw data.",
  },
  {
    question: "What happens if I don't pay the balance on time?",
    answer:
      "You have 7 days to pay the 90% balance after your batch activates. If you miss the deadline, you'll be charged a 1% penalty. However, you have a 6-month patience window to still complete payment if needed.",
  },
  {
    question: "How long until I get my results?",
    answer:
      "After your batch fills and everyone pays: 1-2 weeks for kit delivery, 2-4 weeks for lab sequencing, then results are immediately available for download. You have 60 days to claim your results.",
  },
  {
    question: "How can I pay?",
    answer:
      "You can pay with any major credit or debit card. For advanced users, we also support paying with Ethereum or stablecoins like USDC.",
  },
  {
    question: "What DNA data do I receive?",
    answer:
      "You receive your raw DNA sequencing data as a CSV file, compatible with analysis tools. This includes SNP genotypes that can be analyzed for various genetic traits.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "The 10% deposit is non-refundable once your batch becomes active. If a batch cannot be completed for administrative reasons, all deposits are refunded.",
  },
  {
    question: "What if I lose my PIN?",
    answer:
      "Your PIN cannot be recovered - this is a security feature. Without your PIN, your encrypted data cannot be accessed. Make sure to store it securely (we recommend a password manager).",
  },
  {
    question: "How are the kits randomized?",
    answer:
      "Kit IDs are randomly assigned by the admin before shipping to ensure anonymity. The lab only sees Kit ID + optional metadata (age/sex/ethnicity), never names or addresses.",
  },
  {
    question: "What happens to my data after 60 days?",
    answer:
      "All user data is automatically purged 60 days after batch completion. Shipping data is deleted immediately after kits are sent. This ensures maximum privacy.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-4 py-4 sm:px-6 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="font-medium text-gray-900 pr-4">
                {faq.question}
              </span>
              <svg
                className={`w-5 h-5 text-gray-500 transform transition-transform flex-shrink-0 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openIndex === index && (
              <div className="px-4 py-4 sm:px-6 bg-white">
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-medium">Need more help?</span> Check out our{" "}
          <a href="#" className="text-blue-600 hover:text-blue-700 underline">
            help center
          </a>{" "}
          for detailed information about our privacy protections and how the system works.
        </p>
      </div>
    </div>
  );
}
