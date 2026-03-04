"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

// Simple function to convert markdown links to JSX
function renderMarkdown(text: string) {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 underline"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

const faqs: FAQItem[] = [
  {
    question: "What is Batcher?",
    answer:
      "Batcher is a privacy-first DNA sequencing service that lets you explore your genetic data without compromising your anonymity. Unlike traditional services, we do not tie your data to your identity or store it permanently. Think of us as a mixing service for DNA. After payment, you submit your saliva sample anonymously and then, after a few weeks, you can claim your genetic data in a text file. We do not retain your data after your batch is complete.",
  },
  {
    question: "How is Batcher different from 23andMe or AncestryDNA?",
    answer:
      "Conventional sequencing services keep a copy of your data and tie it to your account information. They may sell your data to other companies for monetization. They have also repeatedly been [breached](https://en.wikipedia.org/wiki/23andMe_data_leak) in the past and people's sensitive genetic data has fallen in the hands of malicious actors.",
  },
  {
    question: "Do you sell or share my data?",
    answer:
      "No, we will never sell your data or share your data with third parties without your explicit consent. Please see our privacy policy for more information.",
  },
  {
    question: "What is a batch and why do you use batching?",
    answer:
      "A batch is simply a collection of people who want to get their DNA sequenced. By processing DNA samples from multiple people together, we introduce a level of anonymization to each individual sample and also lower costs for everyone participating in a batch.",
  },
  {
    question: "What are the steps a batch goes through?",
    answer:
      "Each batch goes through the following stages: (1) Pending: User can join the batch by making a deposit. (2) Staged: The batch has filled and is awaiting admin activation. (3) Active: Batch participants pay their balances, receive and register their sample collection kits using their kit ID and PIN and mail their samples in. (4) Sequencing: Our lab partner works on the submitted samples. (5) Completed: All results are ready and can be claimed using participants' kit IDs and PINs. (6) Purged: All batch-related data on the Monadic DNA servers has been purged.",
  },
  {
    question: "What does a sample collection kit look like and how do I get my kit ID?",
    answer:
      "You can search for 'Oragene saliva collection device' to see what a typical [sample collection kit](https://store.orasure.com/product/saliva-selfcollection-kit/01t5f000004BUiRAAW) looks like. The kit ID is the number printed on the kit by the manufacturer.",
  },
  {
    question: "What deadlines should I be aware of if I am participating in a batch?",
    answer:
      "Once a batch is active, you have 14 days to pay your balance. If you do not pay within 14 days, you will lose 50% of your deposit as a penalty. You will still have another 14 days (grace period) to make your balance payment. After 28 days total, you can no longer pay the balance. If the admin removes you from the batch, you will receive a refund of any remaining deposit (50% if you were slashed). This is done to ensure smooth coordination between the service and its users, ensure only serious participants sign up and one user cannot hold up an entire batch at any stage.",
  },
  {
    question: "What is your refund policy?",
    answer:
      "Once you pay your deposit, you can withdraw it yourself after 90 days if the batch is still in Pending stage (has not been activated yet). If a batch has moved to Active or later stages, refunds are at admin discretion only.",
  },
  {
    question: "How long does the entire process take from signing up to claiming my data?",
    answer:
      "In the best case scenario, the whole process will take about six weeks. On average, expect a batch to complete in three months.",
  },
  {
    question: "How much does Batcher cost?",
    answer:
      "The deposit to sign up for a batch is $25. Once a batch is full and activated, you will be notified of your balance. The balance amount for each batch will depend on lab availability and operational costs but should be under $150. The amount includes the cost of processing to us, the quote from the chosen lab and a small overhead for technical operations.",
  },
  {
    question: "What forms of payment do you accept for the deposit and balance?",
    answer:
      "We currently accept stablecoin payments in USDC on Ethereum for anonymity, automation and simplicity. We will support credit card payments once we have larger volumes.",
  },
  {
    question: "What type of sequencing is performed?",
    answer:
      "We are currently focused on genotyping using the [Infinium Global Screening Array](https://www.illumina.com/products/by-type/microarray-kits/infinium-global-screening.html).",
  },
  {
    question: "In what format will I receive the data?",
    answer:
      "You will be able to download your data as a text file, in either CSV or TSV format.",
  },
  {
    question: "Do you offer whole genome sequencing?",
    answer:
      "No, we do not currently offer full genome sequencing. Once we establish our genotyping product, we plan to add blended genome-exome sequencing and whole genome sequencing.",
  },
  {
    question: "How do I submit my DNA sample and what happens to it?",
    answer:
      "Once your batch is in the active stage, you can sign up to receive an included kit and we will ship you one. Follow the instructions included with the kit to submit your saliva sample and mail it back to our office at the provided address. Once all the samples for a batch are in, we will ship them together to our lab partner who will begin the sequencing process. The lab partner will destroy the samples after any legally mandated periods according to local laws and regulations.",
  },
  {
    question: "Why should I use Batcher instead of simply approaching a lab directly?",
    answer:
      "If you approach a lab yourself, the lab will be able to associate your identity with your genetic data. Batcher adds a layer of probabilistic anonymity by acting as a mixing layer for all the samples in a batch.",
  },
  {
    question: "What can I do with my DNA data once I have it?",
    answer:
      "Monadic DNA provides other tools to put your data to use while still preserving anonymity and privacy. [Monadic DNA Explorer](https://explorer.monadicdna.com/) lets you run your data against over one million scientifically vetted genetic traits from the GWAS Catalog. [Monadic DNA Vault](https://monadicdna.com/vault) (under development) will let you store your data without letting anyone read it while still being able to selectively share your traits with third parties of your choice.",
  },
  {
    question: "Which labs will sequence my DNA?",
    answer:
      "We work with a variety of accredited labs, including major commercial providers and academic institutions.",
  },
  {
    question: "What information about me do you send to the labs?",
    answer:
      "For each batch, we simply send the labs a manifest file with a table associating kit IDs with an internal randomly generated customer ID.",
  },
  {
    question: "What trust assumptions am I making when I use Batcher?",
    answer:
      "Until Monadic DNA runs its own lab, the following points of trust are required: Labs retain anonymous genetic data to comply with legal requirements (usually six months). Labs share anonymous genetic data in plaintext with Monadic DNA over FTP or Amazon S3 or equivalent, although data is transmitted over encrypted channels and access is restricted. Monadic DNA needs to retain plaintext genetic data (in a secured location) so users can claim their data before the Purge phase. Monadic DNA needs to hold on to encrypted shipping data for those who use kits supplied by us until the Sequencing phase.",
  },
  {
    question: "If your nilDB storage is breached, what harm can an attacker do?",
    answer:
      "If, before the purge stage of a batch, our nilDB storage is somehow breached, the attacker could download all genetic data for a batch and then probabilistically associate data files with wallet addresses or email addresses. Using auxiliary data, e.g. using chain analysis, they could increase the probability further but the probability would still be quite low.",
  },
  {
    question: "Have you undergone a formal security audit?",
    answer:
      "No, we have not yet undergone a formal security audit. We plan to commission an independent security audit as usage grows.",
  },
  {
    question: "If I use a sample collector provided by Batcher, where will my shipping information be stored?",
    answer:
      "Your shipping information will be stored in an encrypted database provided by [Nillion nilDB](https://docs.nillion.com/blind-computer/build/storage/overview). Once a batch is complete, the shipping information will be purged.",
  },
  {
    question: "What if I don't want to share my shipping information with you?",
    answer:
      "If you are a participant in an active batch, we will tell you which sample collector we are using for the batch. You may choose to procure the collector yourself without sharing your shipping information with us, instead of receiving a free collector. Usually collectors can only be bought in packs but packs usually cost under $20.",
  },
  {
    question: "How do I use Batcher in the most paranoid manner possible?",
    answer:
      "Enter a throwaway email address for receiving correspondence from us. Use a onetime Ethereum account to sign in and make your payments. Buy the sample collection kit yourself and mail it to us from a location not directly associated with your home address.",
  },
  {
    question: "What happens if I lose my PIN?",
    answer:
      "You will effectively be locked out of your data with no means to recover it. You will have to participate again in a future batch if you still want your DNA information. This is a consequence of the anonymity and privacy baked into our service.",
  },
  {
    question: "What happens if my sample is unusable or fails sequencing?",
    answer:
      "You will be fully refunded if your sample cannot be processed.",
  },
  {
    question: "In which countries is Batcher currently available?",
    answer:
      "Batcher is currently available for users in the United States.",
  },
  {
    question: "What is the age requirement for using Batcher?",
    answer:
      "You must be over 18 years of age to use Batcher.",
  },
  {
    question: "Is Batcher covered by HIPAA?",
    answer:
      "No, your use of Batcher is not covered by HIPAA.",
  },
  {
    question: "What happens to my data if Batcher shuts down?",
    answer:
      "Your dealing with us is transient and you no longer need Batcher once your batch is complete and you download your data. During an active batch, however, you will have to rely on our service not shutting down.",
  },
  {
    question: "Why do you use Ethereum?",
    answer:
      "Using an Ethereum smart contract adds transparency and auditability to Batcher. In the future, it lets us open up the process further by building a protocol and removing all single points of failure or trust.",
  },
  {
    question: "How can I contact customer service if I have an issue?",
    answer:
      "Please send an email to support@monadicdna.com",
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
                  {renderMarkdown(faq.answer)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
