import dynamic from 'next/dynamic'
import Head from 'next/head'

const Dashboard = dynamic(() => import('../components/Dashboard'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>YOT-YOS DApp</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <main className="bg-black min-h-screen p-4 text-white">
        <Dashboard />
      </main>
    </>
  )
}
