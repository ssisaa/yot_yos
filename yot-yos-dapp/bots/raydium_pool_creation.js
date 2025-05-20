// raydium_pool_creation.js — Create a Raydium-like pool on Devnet for YOT-SOL

const { Connection, PublicKey, Keypair, sendAndConfirmTransaction, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const { createPoolInstruction } = require('@raydium-io/raydium-sdk');
const fs = require('fs');

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./wallet.json', 'utf8')))
);

const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

(async () => {
  const yotATA = await getAssociatedTokenAddress(YOT_MINT, wallet.publicKey);
  const wsolATA = await getAssociatedTokenAddress(WSOL_MINT, wallet.publicKey);

  const poolIxData = await createPoolInstruction({
    provider: { connection, wallet: { payer: wallet } },
    tokenMintA: YOT_MINT,
    tokenMintB: WSOL_MINT,
    userAccounts: {
      owner: wallet.publicKey,
      tokenAccounts: [yotATA, wsolATA],
    },
    amountA: 1_000_000_000, // 1 YOT
    amountB: 1_000_000_000, // 1 SOL (WSOL)
    makeTxVersion: 0,
  });

  const tx = new Transaction();
  poolIxData.innerTransactions.forEach(ixs => ixs.instructions.forEach(ix => tx.add(ix)));

  const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log('✅ Pool created. TX:', sig);
  console.log('🆔 POOL ID:', poolIxData.poolKeys.id.toBase58());
  console.log('🪙 LP Mint:', poolIxData.poolKeys.lpMint.toBase58());
  console.log('🧪 Token Vault A:', poolIxData.poolKeys.tokenVaultA.toBase58());
  console.log('🧪 Token Vault B:', poolIxData.poolKeys.tokenVaultB.toBase58());
})();
