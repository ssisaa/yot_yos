// raydium_add_liquidity.js — Add liquidity to a Raydium pool using YOT and SOL

const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createApproveInstruction } = require('@solana/spl-token');
const { createAddLiquidityInstruction, fetchPoolKeys } = require('@raydium-io/raydium-sdk');
const fs = require('fs');

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./wallet.json', 'utf8')))
);

// Replace this with your created pool ID from Raydium pool creation step
const POOL_ID = new PublicKey('PASTE_YOUR_RAYDIUM_POOL_ID');
const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

(async () => {
  const poolKeys = await fetchPoolKeys(connection, POOL_ID);

  const yotATA = await getAssociatedTokenAddress(YOT_MINT, wallet.publicKey);
  const wsolATA = await getAssociatedTokenAddress(WSOL_MINT, wallet.publicKey);
  const lpATA = await getAssociatedTokenAddress(poolKeys.lpMint, wallet.publicKey);

  const approveYOT = createApproveInstruction(yotATA, poolKeys.authority, wallet.publicKey, 100_000_000);
  const approveWSOL = createApproveInstruction(wsolATA, poolKeys.authority, wallet.publicKey, 100_000_000);

  const addLiquidityIx = await createAddLiquidityInstruction({
    poolKeys,
    userKeys: {
      owner: wallet.publicKey,
      tokenAccounts: [yotATA, wsolATA],
      lpTokenAccount: lpATA,
    },
    amountInA: 100_000_000,
    amountInB: 100_000_000,
    fixedSide: 'a',
  });

  const tx = new Transaction().add(approveYOT, approveWSOL, ...addLiquidityIx.instructions);
  const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);

  console.log('✅ Liquidity added to Raydium pool. TX:', sig);
})();
