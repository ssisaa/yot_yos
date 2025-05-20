// Fully Enhanced Dashboard.tsx — On-chain config + claim + swap + faucet
import { useEffect, useState } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { useWallet, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import * as anchor from '@coral-xyz/anchor';
import { JupiterProvider, JupiterForm } from '@jup-ag/react-hook';
import { getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const PROGRAM_ID = new PublicKey('EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8');
const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');
const YOS_MINT = new PublicKey('2SWCnck3vLAVKaLkAjVtNnsVJVGYmGzyNVnte48SQRop');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const VAULT_AUTHORITY = new PublicKey('CeuRAzZ58St8B29XKWo647CGtY7FL5qpwv8WGZUHAuA9');
const PYTH_SOL_PRICE_FEED = new PublicKey('J83mH6KFx6b6vYcm5wzcGzF1YjBWz9tCcYuq3zpG7jhD');

export default function Dashboard() {
  const wallet = useWallet();
  const [vaultYOT, setVaultYOT] = useState(0);
  const [solPrice, setSolPrice] = useState(0);
  const [yosBalance, setYosBalance] = useState(0);
  const [cashbackRate, setCashbackRate] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [apr, setApr] = useState(0);
  const [lastClaim, setLastClaim] = useState(0);
  const [connected, setConnected] = useState(false);

  const provider = new anchor.AnchorProvider(connection, wallet as any, {});
  anchor.setProvider(provider);

  const fetchGlobalState = async () => {
    const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
    const program = new anchor.Program(idl!, PROGRAM_ID, provider);
    const [state] = await PublicKey.findProgramAddress([Buffer.from('state')], PROGRAM_ID);
    const globalState = await program.account.globalState.fetch(state);
    setCashbackRate(globalState.cashbackBps / 100);
    setThreshold(globalState.liquidityThreshold / 1e9);
    setApr(globalState.weeklyAprBps / 100);
  };

  const fetchVaultBalance = async () => {
    const ata = await getAssociatedTokenAddress(YOT_MINT, VAULT_AUTHORITY, true);
    const acc = await getAccount(connection, ata).catch(() => null);
    if (acc) setVaultYOT(Number(acc.amount) / 1e9);
  };

  const fetchYOSBalance = async () => {
    if (!wallet.publicKey) return;
    const ata = await getAssociatedTokenAddress(YOS_MINT, wallet.publicKey);
    const acc = await getAccount(connection, ata).catch(() => null);
    if (acc) setYosBalance(Number(acc.amount) / 1e9);
  };

  const fetchSOLPrice = async () => {
    const acc = await connection.getAccountInfo(PYTH_SOL_PRICE_FEED);
    if (!acc) return;
    const priceExponent = acc.data.readInt32LE(20);
    const priceMantissa = acc.data.readBigInt64LE(32);
    const price = Number(priceMantissa) * Math.pow(10, priceExponent);
    setSolPrice(price);
  };

  const requestFaucet = async () => {
    if (!wallet.publicKey) return;
    const ata = await getOrCreateAssociatedTokenAccount(connection, wallet.adapter, YOS_MINT, wallet.publicKey);
    const tx = new Transaction().add(
      await mintTo(
        connection,
        wallet.adapter,
        YOS_MINT,
        ata.address,
        wallet.publicKey,
        100_000_000
      )
    );
    const sig = await wallet.sendTransaction(tx, connection);
    console.log('✅ Faucet TX:', sig);
  };

  const claimWeeklyAPR = async () => {
    if (!wallet.publicKey) return;
    const ata = await getOrCreateAssociatedTokenAccount(connection, wallet.adapter, YOS_MINT, wallet.publicKey);
    const tx = new Transaction().add(
      await mintTo(
        connection,
        wallet.adapter,
        YOS_MINT,
        ata.address,
        wallet.publicKey,
        250_000_000
      )
    );
    const sig = await wallet.sendTransaction(tx, connection);
    setLastClaim(Date.now());
    console.log('✅ Weekly Claim TX:', sig);
  };

  useEffect(() => {
    if (wallet.connected) {
      setConnected(true);
      fetchVaultBalance();
      fetchYOSBalance();
      fetchSOLPrice();
      fetchGlobalState();
    }
  }, [wallet.connected]);

  const claimEnabled = Date.now() - lastClaim > 7 * 24 * 3600 * 1000 || lastClaim === 0;

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">YOT-YOS DApp Dashboard</h1>
      <WalletMultiButton className="mb-4" />

      {connected && (
        <div className="grid gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold">Vault Stats</h2>
            <p>YOT in Vault: {vaultYOT.toFixed(4)}</p>
            <p>Current SOL Price: ${solPrice.toFixed(2)}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold">Chain Parameters</h2>
            <p>Cashback %: {cashbackRate}</p>
            <p>Liquidity Threshold: {threshold} SOL</p>
            <p>Weekly APR: {apr}%</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold">YOS Rewards</h2>
            <p>My YOS Balance: {yosBalance.toFixed(4)}</p>
            <button className="mt-2 px-4 py-2 bg-purple-600 rounded hover:bg-purple-500" onClick={claimWeeklyAPR} disabled={!claimEnabled}>
              {claimEnabled ? 'Claim Weekly Reward' : 'Claimed Recently'}
            </button>
            <button className="mt-2 ml-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500" onClick={requestFaucet}>
              Faucet 0.1 YOS
            </button>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Swap: SOL → YOT</h2>
            <JupiterProvider connection={connection} cluster="devnet">
              <JupiterForm defaultInputMint={WSOL_MINT} defaultOutputMint={YOT_MINT} wrapUnwrapSOL={true} />
            </JupiterProvider>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Swap: YOS → YOT</h2>
            <JupiterProvider connection={connection} cluster="devnet">
              <JupiterForm defaultInputMint={YOS_MINT} defaultOutputMint={YOT_MINT} wrapUnwrapSOL={false} />
            </JupiterProvider>
          </div>
        </div>
      )}
    </div>
  );
}
