// lp_cron_bot.js — Monitor vault YOT and trigger on-chain liquidity logic

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');

const WALLET = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./wallet.json', 'utf8')))
);
const PROGRAM_ID = new PublicKey('EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8');
const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');
const VAULT_AUTHORITY = new PublicKey('CeuRAzZ58St8B29XKWo647CGtY7FL5qpwv8WGZUHAuA9');

const connection = new Connection('https://api.devnet.solana.com');

async function run() {
  console.log('⏳ Monitoring YOT vault...');

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(WALLET), {
    commitment: 'confirmed'
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync('./idl/yot_yos_dapp.json', 'utf8'));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  const [globalStatePDA] = await PublicKey.findProgramAddress(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  const state = await program.account.globalState.fetch(globalStatePDA);
  const threshold = 100_000_000; // 0.1 SOL worth of YOT assumed

  if (Number(state.accumulatedYot) >= threshold) {
    console.log(`✅ Threshold met: ${state.accumulatedYot}. Triggering LP...`);

    await program.methods
      .addLiquidityIfThreshold()
      .accounts({
        globalState: globalStatePDA,
      })
      .rpc();

    console.log('🚀 LP logic triggered successfully.');
  } else {
    console.log(`📊 Accumulated YOT: ${state.accumulatedYot}. Below threshold.`);
  }
}

run().catch(console.error);
