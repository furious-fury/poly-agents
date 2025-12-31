import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Header() {
  return (
    <header className="flex justify-end p-2 md:p-0">
      <div className="scale-75 origin-right md:scale-100 transition-transform">
        <WalletMultiButton />
      </div>
    </header>
  )
}
