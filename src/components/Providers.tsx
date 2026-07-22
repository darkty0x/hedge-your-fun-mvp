"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "apple", "sms", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#c8f54a",
          showWalletLoginFirst: false,
          walletChainType: "solana-only",
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
