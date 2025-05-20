// lp_automation_bot.js — Monitors vault, swaps 50% YOT→SOL, adds LP when threshold is met
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const fs = require('fs');
const { execSync } = require('child_process');

const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('./wallet.json', 'utf8'))));
const connection = new Connection('https://api.devnet.solana.com');
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
  commitment: 'confirmed'
});
anchor.setProvider(provider);

const PROGRAM_ID = new PublicKey('EymbuAC1fMRMieLcmAf8edFA39292ckFqjEunxjrwgu8');
const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');

async function run() {
  const idl = JSON.parse(fs.readFileSync('./idl/yot_yos_dapp.json', 'utf8'));
  const program = new anchor.Program(idl, PROGRAM_ID, provider);
  const [globalStatePDA] = await PublicKey.findProgramAddress([
    Buffer.from('state')
  ], PROGRAM_ID);

  const state = await program.account.globalState.fetch(globalStatePDA);
  const threshold = Number(state.liquidityThreshold);
  const accumulated = Number(state.accumulatedYot);

  console.log(`🔍 Vault YOT: ${accumulated}, Threshold: ${threshold}`);

  if (accumulated >= threshold) {
    const halfYOT = Math.floor(accumulated / 2);

    console.log(`💱 Swapping ${halfYOT / 1e9} YOT to SOL...`);
    execSync(`node bots/yot_to_sol_swap.js ${halfYOT}`, { stdio: 'inherit' });

    console.log(`➕ Adding ${halfYOT / 1e9} YOT + equivalent SOL to Raydium LP...`);
    execSync(`node bots/raydium_add_liquidity.js ${halfYOT}`, { stdio: 'inherit' });

    console.log(`✅ Automated LP complete for ${accumulated / 1e9} YOT.`);
  } else {
    console.log('⚠️ Threshold not met. No action taken.');
  }
}

run().catch(console.error);
