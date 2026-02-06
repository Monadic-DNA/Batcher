"use client";

import {
  DynamicContextProvider,
  DynamicWidget,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface BatchInfo {
  batchId: number;
  joined: boolean;
  depositPaid: boolean;
  balancePaid: boolean;
  batchState: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: unknown | null;
  batchInfo: BatchInfo | null;
  userBatches: BatchInfo[];
  checkingBatch: boolean;
  refreshBatch: () => Promise<void>;
  initializeDynamic: () => void;
  isDynamicInitialized: boolean;
  openAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  batchInfo: null,
  userBatches: [],
  checkingBatch: false,
  refreshBatch: async () => {},
  initializeDynamic: () => {},
  isDynamicInitialized: false,
  openAuthModal: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Inner component to sync Dynamic context with Auth context
function AuthStateSync({
  onAuthStateChange,
  onOpenAuthModal,
}: {
  onAuthStateChange: (isAuth: boolean, user: unknown) => void;
  onOpenAuthModal: (openFn: () => void) => void;
}) {
  const { user: dynamicUser, setShowAuthFlow } = useDynamicContext();

  useEffect(() => {
    console.log("[AuthStateSync] Dynamic state:", {
      hasUser: !!dynamicUser,
      userAddress: (dynamicUser as any)?.verifiedCredentials?.[0]?.address,
    });

    // If we have a user with a wallet, treat them as authenticated
    const isAuth = !!dynamicUser;

    // Sync Dynamic's auth state with our context
    onAuthStateChange(isAuth, dynamicUser);
  }, [dynamicUser, onAuthStateChange]);

  // Provide the openAuthModal function to the parent
  useEffect(() => {
    if (setShowAuthFlow) {
      onOpenAuthModal(() => setShowAuthFlow(true));
    }
  }, [setShowAuthFlow, onOpenAuthModal]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<unknown>(null);
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [userBatches, setUserBatches] = useState<BatchInfo[]>([]);
  const [checkingBatch, setCheckingBatch] = useState(false);
  const [isDynamicInitialized, setIsDynamicInitialized] = useState(false);
  const [openAuthModalFn, setOpenAuthModalFn] = useState<(() => void) | null>(
    null
  );

  // If environment ID is not set, render without Dynamic
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const isDynamicEnabled = !!environmentId;

  const checkBatchStatus = useCallback(async (walletAddress: string) => {
    try {
      console.log("[AuthProvider] Checking batch status for:", walletAddress);
      setCheckingBatch(true);

      // Query API for user's batch participation
      const response = await fetch("/api/check-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Unknown error");
      }

      setBatchInfo(result.batchInfo);
      setUserBatches(result.batches || []);

      console.log("[AuthProvider] Batch check complete:", result.batchInfo);
      console.log("[AuthProvider] User batches:", result.batches);

      return result.batchInfo;
    } catch (error) {
      console.error("[AuthProvider] Failed to check batch status:", error);
      setBatchInfo(null);
      setUserBatches([]);
      return null;
    } finally {
      setCheckingBatch(false);
    }
  }, []);

  const refreshBatch = async () => {
    const walletAddress = (user as any)?.verifiedCredentials?.[0]?.address;
    if (walletAddress) {
      await checkBatchStatus(walletAddress);
    }
  };

  // Initialize Dynamic and trigger batch check
  const initializeDynamic = useCallback(() => {
    if (!isDynamicEnabled) {
      console.log(
        "[AuthProvider] Dynamic not enabled (missing environment ID)"
      );
      return;
    }

    if (isDynamicInitialized) {
      console.log("[AuthProvider] Dynamic already initialized");
      return;
    }

    console.log("[AuthProvider] Initializing Dynamic...");
    setIsDynamicInitialized(true);

    // If we already have a user (from previous session), check batch
    if (user) {
      const walletAddress = (user as any)?.verifiedCredentials?.[0]?.address;
      if (walletAddress) {
        console.log(
          "[AuthProvider] Checking batch for existing user:",
          walletAddress
        );
        checkBatchStatus(walletAddress);
      }
    }
  }, [isDynamicEnabled, isDynamicInitialized, user, checkBatchStatus]);

  const handleAuthStateChange = useCallback(
    (isAuth: boolean, dynamicUser: unknown) => {
      console.log("[AuthProvider] Auth state changed:", {
        isAuth,
        hasUser: !!dynamicUser,
        userAddress: (dynamicUser as any)?.verifiedCredentials?.[0]?.address,
      });

      setIsAuthenticated(isAuth);
      setUser(dynamicUser);

      if (!isAuth) {
        // User logged out
        setBatchInfo(null);
        setCheckingBatch(false);
      } else if (dynamicUser && isDynamicInitialized) {
        // User logged in
        const walletAddress = (dynamicUser as any)?.verifiedCredentials?.[0]?.address;
        if (walletAddress) {
          console.log(
            "[AuthProvider] User logged in, checking batch:",
            walletAddress
          );
          checkBatchStatus(walletAddress);
        }
      }
    },
    [isDynamicInitialized, checkBatchStatus]
  );

  const handleOpenAuthModal = useCallback((openFn: () => void) => {
    setOpenAuthModalFn(() => openFn);
  }, []);

  const openAuthModal = useCallback(() => {
    if (openAuthModalFn) {
      openAuthModalFn();
    }
  }, [openAuthModalFn]);

  // If Dynamic is not enabled, render children with default auth context
  if (!isDynamicEnabled) {
    return (
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          user: null,
          batchInfo: null,
          userBatches: [],
          checkingBatch: false,
          refreshBatch: async () => {},
          initializeDynamic: () => {},
          isDynamicInitialized: false,
          openAuthModal: () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // Always render DynamicContextProvider
  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId,
        walletConnectors: [
          EthereumWalletConnectors,
          ZeroDevSmartWalletConnectors,
        ],
        events: {
          onLogout: () => {
            setIsAuthenticated(false);
            setUser(null);
            setBatchInfo(null);
            setCheckingBatch(false);
          },
        },
      }}
    >
      {isDynamicInitialized && (
        <AuthStateSync
          onAuthStateChange={handleAuthStateChange}
          onOpenAuthModal={handleOpenAuthModal}
        />
      )}
      <AuthContext.Provider
        value={{
          isAuthenticated,
          user,
          batchInfo,
          userBatches,
          checkingBatch,
          refreshBatch,
          initializeDynamic,
          isDynamicInitialized,
          openAuthModal,
        }}
      >
        {children}
      </AuthContext.Provider>
    </DynamicContextProvider>
  );
}

export function AuthButton() {
  const { isDynamicInitialized } = useAuth();

  // Don't render widget if Dynamic is not initialized yet
  if (!isDynamicInitialized) {
    return null;
  }

  return <DynamicWidget />;
}
