// pages/admin.tsx — Admin dashboard to initialize + configure on-chain parameters
import { useEffect, useState } from 'react';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { useWallet, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import * as anchor from '@coral-xyz/anchor';

const connection = new Connection('https://api.devnet.solana.com');
const PROGRAM_ID = new PublicKey('EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8');

export default function AdminInitPage() {
  const wallet = useWallet();
  const [status, setStatus] = useState('');
  const [cashback, setCashback] = useState(5);
  const [liquidityThreshold, setLiquidityThreshold] = useState(0.1);
  const [weeklyAPR, setWeeklyAPR] = useState(7.01);

  const provider = new anchor.AnchorProvider(connection, wallet as any, {});
  anchor.setProvider(provider);

  async function loadProgram() {
    const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
    if (!idl) throw new Error('IDL not found');
    return new anchor.Program(idl, PROGRAM_ID, provider);
  }

  const handleInitialize = async () => {
    if (!wallet.publicKey) return;
    try {
      setStatus('⏳ Initializing...');
      const program = await loadProgram();
      const [globalStatePDA] = await PublicKey.findProgramAddress([
        Buffer.from('state')
      ], program.programId);

      await program.methods.initialize().accounts({
        globalState: globalStatePDA,
        poolAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId
      }).rpc();

      setStatus('✅ Program initialized.');
    } catch (err) {
      console.error(err);
      setStatus('❌ Initialization failed.');
    }
  };

  const handleSetParams = async () => {
    try {
      const program = await loadProgram();
      const [globalStatePDA] = await PublicKey.findProgramAddress([
        Buffer.from('state')
      ], program.programId);

      await program.methods.setParams(
        Math.floor(cashback * 100),
        Math.floor(liquidityThreshold * 1e9),
        Math.floor(weeklyAPR * 100)
      ).accounts({
        globalState: globalStatePDA,
        authority: wallet.publicKey
      }).rpc();

      setStatus('✅ Parameters updated.');
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to update parameters.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <h1 className="text-2xl font-bold mb-4">🔐 Admin Panel: YOT-YOS Config</h1>
      <WalletMultiButton className="mb-4" />

      {wallet.connected && (
        <div className="grid gap-6">
          <button className="px-4 py-2 bg-green-600 rounded hover:bg-green-500" onClick={handleInitialize}>
            Initialize Program
          </button>

          <div className="bg-gray-900 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">⚙️ Update Parameters</h2>
            <label className="block">Cashback %:
              <input type="number" value={cashback} onChange={e => setCashback(Number(e.target.value))} className="w-full p-1 mt-1 text-black" />
            </label>
            <label className="block mt-2">Liquidity Threshold (in SOL):
              <input type="number" value={liquidityThreshold} onChange={e => setLiquidityThreshold(Number(e.target.value))} className="w-full p-1 mt-1 text-black" />
            </label>
            <label className="block mt-2">Weekly APR %:
              <input type="number" value={weeklyAPR} onChange={e => setWeeklyAPR(Number(e.target.value))} className="w-full p-1 mt-1 text-black" />
            </label>

            <button className="mt-4 px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-400" onClick={handleSetParams}>
              Save Parameters
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-green-400">{status}</p>
    </div>
  );
}
