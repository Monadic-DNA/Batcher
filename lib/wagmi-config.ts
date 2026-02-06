import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient } from '@tanstack/react-query'

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.org'),
  },
  // Disable auto-reconnect to prevent MetaMask errors when extension not installed
  multiInjectedProviderDiscovery: false,
  ssr: true,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})
