// pages/dao.tsx — DAO Voting Page UI
import { useWallet, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey('EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8');
const connection = new anchor.web3.Connection('https://api.devnet.solana.com');

export default function DaoPage() {
  const wallet = useWallet();
  const [proposals, setProposals] = useState([
    { id: 1, title: 'Increase Cashback from 5% to 7%', yes: 0, no: 0 },
    { id: 2, title: 'Lower LP threshold from 0.1 SOL to 0.05 SOL', yes: 0, no: 0 },
  ]);
  const [votes, setVotes] = useState({});

  const handleVote = (id: number, vote: 'yes' | 'no') => {
    setVotes((prev) => ({ ...prev, [id]: vote }));
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [vote]: p[vote] + 1 } : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">🗳 DAO Governance Voting</h1>
      <WalletMultiButton className="mb-6" />

      <div className="grid gap-6">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="bg-gray-800 rounded-xl p-4 shadow-md"
          >
            <h2 className="text-lg font-semibold">{proposal.title}</h2>
            <p className="mt-2">✅ Yes: {proposal.yes} | ❌ No: {proposal.no}</p>
            {!votes[proposal.id] ? (
              <div className="mt-4 space-x-4">
                <button
                  onClick={() => handleVote(proposal.id, 'yes')}
                  className="bg-green-600 px-4 py-2 rounded hover:bg-green-500"
                >
                  Vote Yes
                </button>
                <button
                  onClick={() => handleVote(proposal.id, 'no')}
                  className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
                >
                  Vote No
                </button>
              </div>
            ) : (
              <p className="mt-3 text-yellow-400">
                You voted: {votes[proposal.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
