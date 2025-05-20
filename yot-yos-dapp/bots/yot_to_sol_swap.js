// yot_to_sol_swap.js — Jupiter swap script to convert YOT -> SOL

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Jupiter, RouteMap } = require('@jup-ag/core');
const fs = require('fs');

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('./wallet.json', 'utf8')))
);

const YOT_MINT = new PublicKey('9KxQHJcBxp29AjGTAqF3LCFzodSpkuv986wsSEwQi6Cw');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

(async () => {
  const jupiter = await Jupiter.load({
    connection,
    cluster: 'devnet',
    user: wallet,
  });

  const inputAmount = 50 * 1e9; // 50 YOT

  const routes = await jupiter.computeRoutes({
    inputMint: YOT_MINT,
    outputMint: WSOL_MINT,
    amount: inputAmount,
    slippageBps: 100,
  });

  const bestRoute = routes.routesInfos[0];

  if (!bestRoute) {
    console.log('❌ No route found for YOT → SOL');
    return;
  }

  const { execute } = await jupiter.exchange({ routeInfo: bestRoute });
  const txid = await execute();

  console.log('✅ YOT → SOL swap complete:', txid);
})();
