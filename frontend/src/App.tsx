import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract, ethers } from "ethers";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  ExternalLink,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { appConfig, isConfigured } from "./config/env";
import { secureVoteAbi } from "./config/abi";
import {
  formatError,
  getContract,
  getInjected,
  getWriteContract,
} from "./lib/contract";
import {
  Candidate,
  Election,
  Result,
  VoterStatus,
  formatTime,
  phaseOf,
  shortAddress,
  toCandidates,
  toElection,
} from "./lib/types";
import {
  VoteReceipt,
  downloadReceipt,
  loadReceipt,
  saveReceipt,
  parseReceipt,
  commitmentFor,
} from "./lib/receipts";

type TxState = {
  status: "idle" | "pending" | "success" | "error";
  label?: string;
  hash?: string;
  message?: string;
};

type WalletStatus =
  | "checking"
  | "unavailable"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

function useWallet() {
  const [address, setAddress] = useState<string>();
  const [provider, setProvider] = useState<BrowserProvider>();
  const [chainId, setChainId] = useState<number>();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<WalletStatus>("checking");

  const sync = useCallback(async (accounts?: string[]) => {
    const injected = getInjected();
    if (!injected?.isMetaMask) {
      setStatus("unavailable");
      setAddress(undefined);
      setProvider(undefined);
      setChainId(undefined);
      return;
    }
    const nextProvider = new BrowserProvider(injected as any);
    const nextAccounts =
      accounts ||
      ((await injected.request({ method: "eth_accounts" })) as string[]);
    if (!nextAccounts[0]) {
      setAddress(undefined);
      setProvider(undefined);
      setChainId(undefined);
      setStatus("disconnected");
      return;
    }
    const network = await nextProvider.getNetwork();
    setAddress(nextAccounts[0]);
    setProvider(nextProvider);
    setChainId(Number(network.chainId));
    setError("");
    setStatus("connected");
  }, []);

  useEffect(() => {
    const injected = getInjected();
    if (!injected?.isMetaMask) {
      setStatus("unavailable");
      return;
    }
    void sync().catch((err) => { setError(formatError(err)); setStatus("error"); });
    const accountsChanged = (accounts: unknown) => {
      setAddress(undefined);
      setProvider(undefined);
      setChainId(undefined);
      setError("");
      setStatus("checking");
      void sync(accounts as string[]).catch((err) => { setError(formatError(err)); setStatus("error"); });
    };
    const chainChanged = () => window.location.reload();
    injected.on?.("accountsChanged", accountsChanged);
    injected.on?.("chainChanged", chainChanged);
    return () => {
      injected.removeListener?.("accountsChanged", accountsChanged);
      injected.removeListener?.("chainChanged", chainChanged);
    };
  }, [sync]);

  const connect = async () => {
    const injected = getInjected();
    if (!injected?.isMetaMask) {
      setStatus("unavailable");
      setError(
        "MetaMask or another injected wallet is required for voting transactions.",
      );
      return;
    }
    try {
      setStatus("connecting");
      setError("");
      const accounts = (await injected.request({
        method: "eth_requestAccounts",
      })) as string[];
      await sync(accounts);
    } catch (err) {
      setStatus("error");
      setError(formatError(err));
    }
  };

  const switchNetwork = async () => {
    const injected = getInjected();
    if (!injected?.isMetaMask || !appConfig.chainId) return;
    try {
      await injected.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${appConfig.chainId.toString(16)}` }],
      });
      await sync();
    } catch (err) {
      const value = err as { code?: number; message?: string };
      setError(
        value.code === 4902
          ? `Add chain ${appConfig.chainId} to MetaMask, then try again.`
          : formatError(err),
      );
    }
  };

  return { address, provider, chainId, connect, switchNetwork, error, status };
}

function App() {
  const wallet = useWallet();
  return <AppShell wallet={wallet} />;
}

function AppShell({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const configured = isConfigured;
  const wrongNetwork = Boolean(
    wallet.chainId && appConfig.chainId && wallet.chainId !== appConfig.chainId,
  );
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">₿</span>
          <span>
            <strong>SecureVote</strong>
            <small>Campus election registry</small>
          </span>
        </Link>
        <button
          className="menu-button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          <Menu size={19} />
        </button>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"}>
          <NavLink to="/guide" onClick={() => setMenuOpen(false)}>
            Guided mode
          </NavLink>
          <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>
            Elections
          </NavLink>
          <NavLink to="/audit" onClick={() => setMenuOpen(false)}>
            Public audit
          </NavLink>
          <NavLink to="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </NavLink>
        </nav>
        <div className="header-actions">
          <span
            className={
              wrongNetwork
                ? "network-dot is-wrong"
                : configured
                  ? "network-dot is-live"
                  : "network-dot"
            }
          >
            {wrongNetwork
              ? "Wrong network"
              : configured
                ? `Chain ${appConfig.chainId}`
                : "Not configured"}
          </span>
          <button
            className="wallet-button"
            onClick={() => void wallet.connect()}
          >
            <Wallet size={16} />{" "}
            {wallet.address ? shortAddress(wallet.address) : "Connect MetaMask"}
          </button>
        </div>
      </header>
      {wallet.error && location.pathname === "/" && (
        <div className="top-error">
          <CircleAlert size={16} /> {wallet.error}
          <button
            onClick={() => window.location.reload()}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {!configured && location.pathname === "/" && <ConfigNotice />}
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/guide" element={<GuidedMode wallet={wallet} />} />
          <Route
            path="/dashboard"
            element={
              <RequireMetaMask wallet={wallet}>
                <Dashboard wallet={wallet} />
              </RequireMetaMask>
            }
          />
          <Route
            path="/elections/:id"
            element={
              <RequireMetaMask wallet={wallet}>
                <ElectionPage key={`${location.pathname}:${wallet.address}`} wallet={wallet} />
              </RequireMetaMask>
            }
          />
          <Route
            path="/audit"
            element={
              <RequireMetaMask wallet={wallet}>
                <AuditIndex wallet={wallet} />
              </RequireMetaMask>
            }
          />
          <Route
            path="/audit/:id"
            element={
              <RequireMetaMask wallet={wallet}>
                <ElectionPage key={`${location.pathname}:${wallet.address}`} wallet={wallet} auditOnly />
              </RequireMetaMask>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireMetaMask wallet={wallet}>
                <Admin wallet={wallet} />
              </RequireMetaMask>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span>SecureVote / {networkLabel(appConfig.chainId)}</span>
        <span>Delayed disclosure · public verification</span>
      </footer>
    </div>
  );
}

function ConfigNotice() {
  return (
    <section className="setup-banner">
      <CircleAlert size={19} />
      <div>
        <strong>Blockchain connection not configured</strong>
        <p>
          Add <code>VITE_CONTRACT_ADDRESS</code> and <code>VITE_CHAIN_ID</code>{" "}
          to connect the live application. No sample elections are shown.
        </p>
      </div>
    </section>
  );
}

function networkLabel(chainId: number) {
  if (chainId === 11155111) return "Ethereum Sepolia";
  if (chainId === 31337) return "Hardhat local";
  return `chain ${chainId}`;
}

function walletStateLabel(wallet: ReturnType<typeof useWallet>) {
  if (wallet.status === "unavailable") return "MetaMask not detected";
  if (wallet.status === "checking") return "Checking MetaMask";
  if (wallet.status === "connecting") return "Approval pending";
  if (wallet.status === "error") return "Connection not completed";
  if (wallet.status === "disconnected") return "MetaMask disconnected";
  if (!isConfigured) return "Configuration missing";
  if (wallet.chainId !== appConfig.chainId)
    return `Wrong chain · ${wallet.chainId ? networkLabel(wallet.chainId) : "unknown"}`;
  return `Connected · ${wallet.chainId ? networkLabel(wallet.chainId) : "unknown chain"}`;
}

function WalletCheckpoint({
  activeStep,
  title,
  copy,
  children,
}: {
  activeStep: 1 | 2 | 3;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  const steps = ["Connect wallet", "Verify network", "Enter election"];
  return (
    <section className="wallet-gate" aria-labelledby="wallet-gate-title">
      <div className="wallet-gate-panel">
        <div className="wallet-gate-mark">
          <Wallet size={20} />
          <span>Wallet checkpoint</span>
        </div>
        <div className="checkpoint-rail" aria-label="SecureVote access steps">
          {steps.map((step, index) => (
            <div
              className={`checkpoint-step ${index + 1 <= activeStep ? "is-active" : ""} ${index + 1 === activeStep ? "is-current" : ""}`}
              key={step}
            >
              <span>0{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <p className="eyebrow">Protected application route</p>
        <h1 id="wallet-gate-title">{title}</h1>
        <p className="wallet-gate-copy">{copy}</p>
        {children}
      </div>
    </section>
  );
}

export function RequireMetaMask({
  wallet,
  children,
}: {
  wallet: ReturnType<typeof useWallet>;
  children: React.ReactNode;
}) {
  if (wallet.status === "checking") {
    return (
      <WalletCheckpoint
        activeStep={1}
        title="Checking for MetaMask"
        copy="SecureVote is checking the browser wallet before loading election records."
      >
        <div className="wallet-gate-state">
          <span className="loader" />{" "}
          <span>Inspecting wallet availability…</span>
        </div>
      </WalletCheckpoint>
    );
  }

  if (wallet.status === "unavailable") {
    return (
      <WalletCheckpoint
        activeStep={1}
        title="MetaMask is required"
        copy="MetaMask is required to use SecureVote. Install or enable MetaMask to continue."
      >
        <div className="wallet-gate-actions">
          <a
            className="primary-action"
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
          >
            Install MetaMask <ExternalLink size={16} />
          </a>
          <button
            className="text-action wallet-gate-link"
            onClick={() => void wallet.connect()}
          >
            Try again <ArrowRight size={16} />
          </button>
        </div>
      </WalletCheckpoint>
    );
  }

  if (wallet.status === "connecting") {
    return (
      <WalletCheckpoint
        activeStep={1}
        title="Waiting for MetaMask"
        copy="Approve the connection request in MetaMask. SecureVote will continue only after the wallet grants access."
      >
        <div className="wallet-gate-state">
          <span className="loader" /> <span>MetaMask approval pending…</span>
        </div>
      </WalletCheckpoint>
    );
  }

  if (wallet.status === "disconnected") {
    return (
      <WalletCheckpoint
        activeStep={1}
        title="Connect MetaMask to continue"
        copy="This route reads account-specific election state and requires an explicit MetaMask connection. No local flag can bypass this checkpoint."
      >
        <div className="wallet-gate-actions">
          <button
            className="primary-action"
            onClick={() => void wallet.connect()}
          >
            Connect MetaMask <Wallet size={16} />
          </button>
          <p className="wallet-gate-note">
            Your wallet address is public. Connection is not proof of student
            eligibility; eligibility still comes from the on-chain registry.
          </p>
        </div>
      </WalletCheckpoint>
    );
  }

  if (wallet.status === "error") {
    return (
      <WalletCheckpoint
        activeStep={1}
        title="MetaMask connection was not completed"
        copy="The wallet did not grant SecureVote access. Review the message below and retry when ready."
      >
        <div className="wallet-gate-error">
          <CircleAlert size={17} />
          <span>{wallet.error || "The MetaMask request failed."}</span>
        </div>
        <button
          className="primary-action"
          onClick={() => void wallet.connect()}
        >
          Retry MetaMask connection <ArrowRight size={16} />
        </button>
      </WalletCheckpoint>
    );
  }

  if (!isConfigured) {
    return (
      <WalletCheckpoint
        activeStep={2}
        title="Application configuration required"
        copy="MetaMask is connected, but this build has no contract address and configured chain. Protected routes stay locked until deployment configuration is present."
      >
        <div className="wallet-gate-error">
          <CircleAlert size={17} />
          <span>
            Set VITE_CONTRACT_ADDRESS and VITE_CHAIN_ID, then reload the app.
          </span>
        </div>
      </WalletCheckpoint>
    );
  }

  if (wallet.chainId !== appConfig.chainId) {
    return (
      <WalletCheckpoint
        activeStep={2}
        title="Switch MetaMask network"
        copy={`SecureVote is configured for ${networkLabel(appConfig.chainId)} (chain ID ${appConfig.chainId}). Your connected wallet is on ${wallet.chainId ? networkLabel(wallet.chainId) : "an unknown network"}.`}
      >
        <div className="wallet-gate-actions">
          <button
            className="primary-action"
            onClick={() => void wallet.switchNetwork()}
          >
            Switch network <ArrowRight size={16} />
          </button>
          {wallet.error && (
            <div className="wallet-gate-error">
              <CircleAlert size={17} />
              <span>{wallet.error}</span>
            </div>
          )}
          <p className="wallet-gate-note">
            Manual fallback: open MetaMask → Networks → Add network, choose the
            configured network, confirm chain ID {appConfig.chainId}, then
            return and retry.
          </p>
        </div>
      </WalletCheckpoint>
    );
  }

  return <>{children}</>;
}

export function GuidedMode({
  wallet,
}: {
  wallet: ReturnType<typeof useWallet>;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const connectedOnTarget =
    wallet.status === "connected" &&
    wallet.chainId === appConfig.chainId &&
    isConfigured;
  const steps = [
    {
      label: "The real record",
      eyebrow: "01 / Start here",
      title: "The chain is the backend.",
      copy: "SecureVote does not keep a second election database behind the interface. Election configuration, eligibility, commitments, reveals, finalization, results, and audit events come from the deployed SecureVote contract.",
    },
    {
      label: "Connect MetaMask",
      eyebrow: "02 / Wallet checkpoint",
      title: "Bring the wallet that signs the record.",
      copy: "MetaMask is required before the application loads protected routes. Connection is an access requirement, not proof of student eligibility; the voter registry on-chain makes that decision.",
    },
    {
      label: "Open an election",
      eyebrow: "03 / Live registry",
      title: "Enter only after the network is verified.",
      copy: "Once MetaMask is connected to the configured chain, Elections reads the actual election count and records from the contract. If the provider or configuration is unavailable, SecureVote shows an error instead of inventing a list.",
    },
    {
      label: "Commit a ballot",
      eyebrow: "04 / Temporary secrecy",
      title: "Seal a choice before anyone can see it.",
      copy: "Choose a candidate and generate a cryptographically secure secret in the browser. The contract receives only the commitment hash, bound to this election and wallet. Save the receipt; the secret cannot be recovered on-chain.",
    },
    {
      label: "Reveal and finalize",
      eyebrow: "05 / Count honestly",
      title: "Reveal the same proof, then unlock the tally.",
      copy: "During reveal, the contract recomputes the commitment from your candidate and secret. Anyone can finalize after the deadline. Non-revealed commitments are excluded, and results stay unavailable until finalization.",
    },
    {
      label: "Audit the record",
      eyebrow: "06 / Verify independently",
      title: "Follow the receipt all the way to the block.",
      copy: "Audit views use the same deployed contract and connected MetaMask provider. Confirm events, block numbers, and transaction hashes on the configured explorer. Admin actions still depend on the on-chain owner() check.",
    },
  ];
  const step = steps[activeStep];

  const renderStepDetail = () => {
    if (activeStep === 0)
      return (
        <div className="guide-evidence-grid">
          <div>
            <span className="record-tag">READS</span>
            <strong>Contract state</strong>
            <p>
              <code>getElection</code>, <code>getCandidates</code>, voter
              status, and finalized results.
            </p>
          </div>
          <div>
            <span className="record-tag">WRITES</span>
            <strong>Signed transactions</strong>
            <p>
              MetaMask signs creation, registration, commit, reveal, and
              finalization.
            </p>
          </div>
          <div>
            <span className="record-tag">LOCAL ONLY</span>
            <strong>Optional receipt</strong>
            <p>
              Local storage can hold your recovery receipt; it is never the
              election database.
            </p>
          </div>
        </div>
      );
    if (activeStep === 1)
      return (
        <div className="guide-wallet-panel">
          <div className="guide-status-row">
            <span className="eyebrow">Live wallet state</span>
            <span className="guide-status-value">
              {walletStateLabel(wallet)}
            </span>
          </div>
          {wallet.status === "unavailable" && (
            <div className="guide-action-row">
              <a
                className="primary-action"
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
              >
                Install MetaMask <ExternalLink size={16} />
              </a>
              <span>Then return here and retry the checkpoint.</span>
            </div>
          )}
          {wallet.status === "disconnected" && (
            <div className="guide-action-row">
              <button
                className="primary-action"
                onClick={() => void wallet.connect()}
              >
                Connect MetaMask <Wallet size={16} />
              </button>
              <span>
                SecureVote waits for an explicit{" "}
                <code>eth_requestAccounts</code> approval.
              </span>
            </div>
          )}
          {wallet.status === "connecting" && (
            <div className="wallet-gate-state">
              <span className="loader" />{" "}
              <span>Approve the request in MetaMask…</span>
            </div>
          )}
          {wallet.status === "error" && (
            <div className="wallet-gate-error">
              <CircleAlert size={17} />
              <span>{wallet.error || "The MetaMask request failed."}</span>
              <button
                className="text-action wallet-gate-link"
                onClick={() => void wallet.connect()}
              >
                Retry
              </button>
            </div>
          )}
          {wallet.status === "connected" &&
            wallet.chainId !== appConfig.chainId && (
              <div className="guide-action-row">
                <button
                  className="primary-action"
                  onClick={() => void wallet.switchNetwork()}
                >
                  Switch network <ArrowRight size={16} />
                </button>
                <span>
                  Expected chain: <code>{appConfig.chainId}</code>. Current
                  chain: <code>{wallet.chainId}</code>.
                </span>
              </div>
            )}
          {wallet.status === "connected" &&
            wallet.chainId === appConfig.chainId && (
              <div className="guide-confirmed">
                <Check size={17} /> MetaMask is connected to the configured
                chain. Protected routes can now load real contract state.
              </div>
            )}
          {wallet.error &&
            wallet.status === "connected" &&
            wallet.chainId !== appConfig.chainId && (
              <div className="wallet-gate-error">
                <CircleAlert size={17} />
                <span>{wallet.error}</span>
              </div>
            )}
        </div>
      );
    if (activeStep === 2)
      return (
        <div className="guide-flow-panel">
          <div className="guide-flow-line">
            <span>MetaMask</span>
            <ArrowRight size={16} />
            <span>BrowserProvider</span>
            <ArrowRight size={16} />
            <span>SecureVote.sol</span>
          </div>
          <p className="guide-note">
            No election cards are fabricated in guided mode. Use the live
            registry when the checkpoint is complete.
          </p>
          {connectedOnTarget ? (
            <Link className="primary-action" to="/dashboard">
              Open live elections <ArrowRight size={16} />
            </Link>
          ) : (
            <button className="primary-action" onClick={() => setActiveStep(1)}>
              Verify wallet first <Wallet size={16} />
            </button>
          )}
        </div>
      );
    if (activeStep === 3)
      return (
        <div className="guide-flow-panel">
          <div className="guide-code-line">
            <span>candidate</span>
            <code>+ secret</code>
            <ArrowRight size={16} />
            <span>keccak256 commitment</span>
            <ArrowRight size={16} />
            <span>commitVote()</span>
          </div>
          <p className="guide-note">
            The receipt contains the actual candidate ID, wallet address,
            secret, commitment, and creation time generated for your session.
            Never put the secret in a URL or share it.
          </p>
          {connectedOnTarget ? (
            <Link className="primary-action" to="/dashboard">
              Go to a live election <ArrowRight size={16} />
            </Link>
          ) : (
            <button className="primary-action" onClick={() => setActiveStep(1)}>
              Connect to continue <Wallet size={16} />
            </button>
          )}
        </div>
      );
    if (activeStep === 4)
      return (
        <div className="guide-flow-panel">
          <PhaseRail phase="reveal" />
          <p className="guide-note">
            Only the contract can verify the commitment. The UI enables Reveal
            only after the recomputed hash matches the stored on-chain
            commitment.
          </p>
          {connectedOnTarget ? (
            <Link className="primary-action" to="/dashboard">
              Open the voter console <ArrowRight size={16} />
            </Link>
          ) : (
            <button className="primary-action" onClick={() => setActiveStep(1)}>
              Connect to continue <Wallet size={16} />
            </button>
          )}
        </div>
      );
    return (
      <div className="guide-audit-panel">
        <div>
          <span className="record-tag">PUBLIC EVIDENCE</span>
          <strong>Events, blocks, and transaction hashes</strong>
          <p>
            These values are read from the contract and linked to the network
            explorer. There is no fabricated activity feed.
          </p>
        </div>
        <div className="guide-action-row">
          <Link className="primary-action" to="/audit">
            Open audit route <ExternalLink size={16} />
          </Link>
          <Link className="text-action" to="/admin">
            Owner console <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <section className="guide-page">
      <div className="guide-heading">
        <div>
          <p className="eyebrow">Guided mode / real application walkthrough</p>
          <h1>Follow one ballot from wallet to block.</h1>
          <p>
            Move through the six checkpoints at your pace. This guide explains
            what SecureVote does and exposes the live wallet state without
            manufacturing elections, balances, or transactions.
          </p>
        </div>
        <div className="guide-heading-status">
          <span className="record-tag">LIVE WALLET</span>
          <strong>{walletStateLabel(wallet)}</strong>
          {wallet.address && <small>{shortAddress(wallet.address)}</small>}
        </div>
      </div>
      <div className="guide-layout">
        <aside className="guide-step-list" aria-label="Tutorial steps">
          {steps.map((item, index) => (
            <button
              type="button"
              className={`guide-step-button ${activeStep === index ? "is-active" : ""} ${index < activeStep ? "is-complete" : ""}`}
              aria-current={activeStep === index ? "step" : undefined}
              onClick={() => setActiveStep(index)}
              key={item.label}
            >
              <span>0{index + 1}</span>
              <strong>{item.label}</strong>
              <ChevronRight size={15} />
            </button>
          ))}
        </aside>
        <div className="guide-content" aria-live="polite">
          <div className="guide-content-head">
            <span className="record-tag">
              CHECKPOINT {String(activeStep + 1).padStart(2, "0")} /{" "}
              {String(steps.length).padStart(2, "0")}
            </span>
            <span className="guide-progress-track">
              <span
                style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
              />
            </span>
          </div>
          <article className="guide-card">
            <p className="eyebrow">{step.eyebrow}</p>
            <h2>{step.title}</h2>
            <p className="guide-copy">{step.copy}</p>
            {renderStepDetail()}
          </article>
          <div className="guide-navigation">
            <button
              type="button"
              className="text-action"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((value) => Math.max(0, value - 1))}
            >
              ← Previous
            </button>
            {activeStep < steps.length - 1 ? (
              <button
                type="button"
                className="primary-action"
                onClick={() =>
                  setActiveStep((value) =>
                    Math.min(steps.length - 1, value + 1),
                  )
                }
              >
                Next: {steps[activeStep + 1].label} <ArrowRight size={16} />
              </button>
            ) : (
              <Link className="primary-action" to="/">
                Return to SecureVote <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">A verifiable campus election system</p>
          <h1>
            Make the ballot
            <br />
            <em>traceable.</em>
          </h1>
          <p className="hero-lede">
            SecureVote uses Ethereum commitments and delayed reveals so students
            can verify the election record without asking one central database
            to be trusted.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/dashboard">
              View elections <ArrowRight size={17} />
            </Link>
            <Link className="text-action" to="/guide">
              Take the guided mode <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        <div className="hero-ledger">
          <div className="ledger-top">
            <span>Protocol brief / live state</span>
            <span className="verified-label">
              <Check size={13} /> protocol ready
            </span>
          </div>
          <div className="ledger-number">₿</div>
          <div className="ledger-row">
            <span>Ballot record</span>
            <strong>COMMIT → REVEAL</strong>
          </div>
          <div className="ledger-row">
            <span>Authority</span>
            <strong>Ethereum / Sepolia</strong>
          </div>
          <div className="ledger-row">
            <span>Visibility</span>
            <strong>Publicly auditable</strong>
          </div>
          <div className="block-stamp">
            BLOCKCHAIN
            <br />
            <b>NOT A BLACK BOX</b>
          </div>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">How a ballot moves</p>
          <h2>Three states. One public record.</h2>
        </div>
        <PhaseRail phase="landing" />
      </section>
      <section className="security-grid">
        <SecurityCard
          icon={<LockKeyhole size={19} />}
          title="Commitment-bound"
          copy="A vote is sealed against the election and the voter's wallet before it can be revealed."
        />
        <SecurityCard
          icon={<ShieldCheck size={19} />}
          title="No invented state"
          copy="The interface reads from the deployed contract. Missing infrastructure produces a clear setup state."
        />
        <SecurityCard
          icon={<Clipboard size={19} />}
          title="Audit trail"
          copy="Finalized outcomes, events, transaction hashes, and block references remain independently inspectable."
        />
      </section>
      <section className="limitations-panel">
        <p className="eyebrow">Read this before voting</p>
        <h2>Delayed disclosure is not permanent anonymity.</h2>
        <p>
          Reveal transactions become observable on a public blockchain. Voter
          registration is still administrator-controlled, and a lost secret
          cannot be recovered by the contract.
        </p>
        <Link to="/audit">
          Read the limitations <ChevronRight size={15} />
        </Link>
      </section>
    </>
  );
}

function SecurityCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <article className="security-card">
      <div className="icon-square">{icon}</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function PhaseRail({ phase = "landing" }: { phase?: string }) {
  const steps = [
    { key: "commit", label: "Commit", description: "Your choice is sealed." },
    { key: "reveal", label: "Reveal", description: "Your secret verifies it." },
    {
      key: "finalized",
      label: "Finalized",
      description: "The tally is readable.",
    },
  ];
  return (
    <div className="phase-rail">
      {steps.map((step, index) => (
        <div
          className={`phase-step ${phase === step.key || (phase === "landing" && index === 0) ? "is-active" : ""}`}
          key={step.key}
        >
          <span className="phase-index">0{index + 1}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.description}</small>
          </div>
          {index < steps.length - 1 && <span className="phase-arrow">→</span>}
        </div>
      ))}
    </div>
  );
}

function Dashboard({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const provider = wallet.provider;
  const [elections, setElections] = useState<Election[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    async function load() {
      if (!provider || !appConfig.contractAddress) {
        setState("ready");
        return;
      }
      try {
        const contract = getContract(provider);
        const count = Number(await contract!.getElectionCount());
        const values: Election[] = [];
        for (let id = 1; id <= count; id += 1)
          values.push(toElection(await contract!.getElection(id)));
        if (live) {
          setElections(values.reverse());
          setState("ready");
        }
      } catch (err) {
        if (live) {
          setError(formatError(err));
          setState("error");
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [provider]);
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Election registry</p>
          <h1>Current ballots</h1>
          <p>Real elections loaded from the configured SecureVote contract.</p>
        </div>
        <span className="record-count">
          {elections.length.toString().padStart(2, "0")} records
        </span>
      </div>
      {state === "loading" && (
        <LoadingState text="Reading the election ledger…" />
      )}
      {state === "error" && <ErrorState message={error} />}
      {state === "ready" && elections.length === 0 && (
        <EmptyState
          title="No elections recorded"
          copy="Deploy the contract and create an election from the administrator view. This page does not use sample data."
        />
      )}
      {state === "ready" && (
        <div className="election-list">
          {elections.map((election) => (
            <ElectionCard key={election.id.toString()} election={election} />
          ))}
        </div>
      )}
    </section>
  );
}

function ElectionCard({ election }: { election: Election }) {
  const phase = phaseOf(election);
  return (
    <Link to={`/elections/${election.id}`} className="election-card">
      <div className="election-card-meta">
        <span className="record-tag">
          ELECTION / {election.id.toString().padStart(3, "0")}
        </span>
        <StatusBadge phase={phase} />
      </div>
      <h2>{election.title}</h2>
      <p>{election.description}</p>
      <div className="election-card-foot">
        <span>
          {election.totalCommitted.toString()} committed ·{" "}
          {election.totalRevealed.toString()} revealed
        </span>
        <ArrowRight size={17} />
      </div>
    </Link>
  );
}

function StatusBadge({ phase }: { phase: string }) {
  return (
    <span className={`status-badge status-${phase}`}>
      {phase === "finalized"
        ? "Finalized"
        : phase === "commit"
          ? "Commit open"
          : phase === "reveal"
            ? "Reveal open"
            : phase === "ready"
              ? "Ready to finalize"
              : "Scheduled"}
    </span>
  );
}

function ElectionPage({
  wallet,
  auditOnly = false,
}: {
  wallet: ReturnType<typeof useWallet>;
  auditOnly?: boolean;
}) {
  const { id } = useParams();
  const provider = wallet.provider;
  const [election, setElection] = useState<Election>();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [status, setStatus] = useState<VoterStatus>();
  const [results, setResults] = useState<Result[]>();
  const [totals, setTotals] = useState<{
    committed: bigint;
    revealed: bigint;
    nonRevealed: bigint;
  }>();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [secret, setSecret] = useState("");
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  const [saveLocally, setSaveLocally] = useState(true);
  const [backedUp, setBackedUp] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [chainTime, setChainTime] = useState<number>();
  const transactionBusy = useRef(false);
  const loading = useRef(false);
  useEffect(() => {
    if (id && wallet.address) setReceipt(loadReceipt(id, wallet.address));
  }, [id, wallet.address]);
  const [events, setEvents] = useState<
    { label: string; hash: string; block: number }[]
  >([]);

  const load = useCallback(async () => {
    if (!provider || !id || !appConfig.contractAddress) {
      setState("ready");
      return;
    }
    if (loading.current) return;
    loading.current = true;
    try {
      const contract = getContract(provider);
      const [rawElection, rawCandidates, block] = await Promise.all([
        contract!.getElection(id), contract!.getCandidates(id), provider.getBlock("latest"),
      ]);
      if (block) setChainTime(block.timestamp);
      const electionValue = toElection(rawElection);
      const candidateValues = toCandidates(rawCandidates);
      setElection(electionValue);
      setCandidates(candidateValues);
      if (wallet.address) {
        const voterValue = await contract!.getVoterStatus(id, wallet.address);
        setStatus({
          eligible: voterValue.eligible,
          committed: voterValue.committed,
          revealed: voterValue.revealed,
          commitment: voterValue.commitment,
        });
      }
      if (electionValue.finalized) {
        const result = await contract!.getElectionResults(id);
        setResults(
          result[0].map((candidateId: bigint, index: number) => ({
            id: candidateId,
            name: result[1][index],
            votes: result[2][index],
          })),
        );
        setTotals({
          committed: result[3],
          revealed: result[4],
          nonRevealed: result[5],
        });
      }
      setState("ready");
      setError("");
      try {
      const eventFilters = [
        contract!.filters.ElectionCreated(id),
        contract!.filters.VoteCommitted(id),
        contract!.filters.VoteRevealed(id),
        contract!.filters.ElectionFinalized(id),
      ];
      const eventLabels = [
        "Election created",
        "Vote committed",
        "Vote revealed",
        "Election finalized",
      ];
      const eventValues: { label: string; hash: string; block: number }[] = [];
      for (let i = 0; i < eventFilters.length; i += 1) {
        const latest = block?.number ?? await provider.getBlockNumber();
        const from = Math.max(appConfig.deploymentBlock, latest - 2000, 0);
        const logs = await contract!.queryFilter(eventFilters[i], from, latest);
        for (const log of logs)
          eventValues.push({
            label: eventLabels[i],
            hash: log.transactionHash,
            block: log.blockNumber,
          });
      }
      setEvents(eventValues.sort((a, b) => b.block - a.block));
      setAuditError("");
      } catch (err) {
        setAuditError(`Recent activity could not be loaded: ${formatError(err)}`);
      }
    } catch (err) {
      setError(formatError(err));
      setState("error");
    }
    finally { loading.current = false; }
  }, [id, provider, wallet.address]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const runTransaction = async (
    label: string,
    action: (contract: Contract) => Promise<any>,
  ) => {
    if (!wallet.provider) {
      setTx({
        status: "error",
        label,
        message: "Connect a wallet before sending a transaction.",
      });
      return;
    }
    if (wallet.chainId !== appConfig.chainId) {
      setTx({
        status: "error",
        label,
        message: `Switch your wallet to chain ${appConfig.chainId} before sending this transaction.`,
      });
      return;
    }
    if (transactionBusy.current) return;
    transactionBusy.current = true;
    try {
      setTx({ status: "pending", label });
      const contract = await getWriteContract(wallet.provider);
      if (!contract) throw new Error("Contract configuration is missing.");
      const response = await action(contract);
      setTx({ status: "pending", label, hash: response.hash });
      await response.wait();
      setTx({ status: "success", label, hash: response.hash });
      await load();
    } catch (err) {
      setTx({ status: "error", label, message: formatError(err) });
    } finally {
      transactionBusy.current = false;
    }
  };

  const prepareCommit = () => {
    if (!id || !wallet.address || !selectedCandidate) return;
    const generated = ethers.hexlify(
      crypto.getRandomValues(new Uint8Array(32)),
    );
    const commitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "uint256", "bytes32"],
        [id, wallet.address, selectedCandidate, generated],
      ),
    );
    const next: VoteReceipt = {
      version: 2,
      chainId: appConfig.chainId,
      contractAddress: appConfig.contractAddress!,
      electionId: id,
      walletAddress: wallet.address,
      candidateId: selectedCandidate,
      secret: generated,
      commitment,
      createdAt: new Date().toISOString(),
    };
    setSecret(generated);
    setReceipt(next);
    setBackedUp(false);
  };

  const commit = async () => {
    if (!id || !receipt || !backedUp || receipt.candidateId !== selectedCandidate) return;
    try {
      if (saveLocally) saveReceipt(receipt);
    } catch {
      setTx({ status: "error", message: "Browser storage is unavailable. Keep your downloaded receipt and uncheck local recovery to continue." });
      return;
    }
    await runTransaction("Commit ballot", (contract) => contract.commitVote(id, receipt.commitment));
  };

  const reveal = async () => {
    if (!id || !selectedCandidate || !secret) return;
    await runTransaction("Reveal ballot", (contract) =>
      contract.revealVote(id, selectedCandidate, secret),
    );
  };

  const phase = election ? phaseOf(election, chainTime) : "scheduled";
  const computedCommitment = commitmentFor(id || "", wallet.address || "", selectedCandidate, secret);
  const importReceipt = async (file?: File) => {
    if (!file || !id || !wallet.address) return;
    try {
      if (file.size > 16384) throw new Error("Receipt file is too large.");
      const imported = parseReceipt(await file.text(), id, wallet.address);
      if (status?.committed && imported.commitment.toLowerCase() !== status.commitment.toLowerCase()) {
        throw new Error("This receipt does not match your on-chain ballot.");
      }
      setReceipt(imported);
      setSelectedCandidate(imported.candidateId);
      setSecret(imported.secret);
      setTx({ status: "idle" });
    } catch (err) { setTx({ status: "error", message: formatError(err) }); }
  };
  const matches = Boolean(
    status?.commitment &&
    computedCommitment &&
    status.commitment.toLowerCase() === computedCommitment.toLowerCase(),
  );
  if (state === "loading")
    return <LoadingState text="Reading this election from the chain…" />;
  if (state === "error" || !election)
    return (
      <ErrorState
        message={
          error ||
          "This election could not be read from the configured contract."
        }
      />
    );
  return (
    <section>
      <Link to={auditOnly ? "/audit" : "/dashboard"} className="back-link">
        ← Back to {auditOnly ? "audit" : "elections"}
      </Link>
      <div className="detail-heading">
        <div>
          <span className="record-tag">
            ELECTION / {election.id.toString().padStart(3, "0")}
          </span>
          <h1>{election.title}</h1>
          <p>{election.description}</p>
        </div>
        <StatusBadge phase={phase} />
      </div>
      <PhaseRail phase={phase} />
      <p className="helper-copy">Updates every 10 seconds from the blockchain. <button className="text-action" onClick={() => void load()}>Refresh now</button></p>
      <div className="detail-grid">
        <div className="detail-main">
          <section className="section-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Candidates</p>
                <h2>Choose a record to commit</h2>
              </div>
              <span className="muted-mono">{candidates.length} registered</span>
            </div>
            <div className="candidate-grid">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id.toString()}
                  className={`candidate-card ${selectedCandidate === candidate.id.toString() ? "is-selected" : ""}`}
                  disabled={tx.status === "pending"}
                  onClick={() => {
                    setSelectedCandidate(candidate.id.toString());
                    setBackedUp(false);
                    if (!status?.committed) setReceipt(null);
                  }}
                >
                  <span className="candidate-index">
                    {String(Number(candidate.id) + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.manifesto}</small>
                  </span>
                  {selectedCandidate === candidate.id.toString() && (
                    <Check size={17} />
                  )}
                </button>
              ))}
            </div>
          </section>
          {!auditOnly && (
            <section className="section-panel flow-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Voter console</p>
                  <h2>
                    {phase === "commit"
                      ? "Commit your ballot"
                      : phase === "reveal"
                        ? "Reveal your ballot"
                        : "Ballot status"}
                  </h2>
                </div>
                {wallet.address && (
                  <span className="wallet-label">
                    {shortAddress(wallet.address)}
                  </span>
                )}
              </div>
              {!wallet.address && (
                <StateNotice
                  title="Connect a wallet to vote"
                  copy="Public election data remains readable, but committing and revealing require a wallet transaction."
                />
              )}
              {wallet.address && status && !status.eligible && (
                <StateNotice
                  title="This wallet is not on the registry"
                  copy="Eligibility is recorded per election by the election administrator."
                />
              )}
              {wallet.address &&
                status?.eligible &&
                phase === "commit" &&
                !status.committed && (
                  <div className="flow-actions">
                    <p className="helper-copy">
                      Select a candidate, generate a private receipt, then
                      commit the hash. The contract never sees your secret.
                    </p>
                    <button
                      className="primary-action"
                      disabled={!selectedCandidate || tx.status === "pending"}
                      onClick={prepareCommit}
                    >
                      Generate private receipt <LockKeyhole size={16} />
                    </button>
                    {receipt && (
                      <div className="receipt-preview">
                        <div>
                          <span className="eyebrow">Ready to commit</span>
                          <strong>{receipt.commitment.slice(0, 18)}…</strong>
                          <small>
                            Save this receipt. It is the only way to reveal
                            later.
                          </small>
                        </div>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={saveLocally}
                            onChange={(event) =>
                              setSaveLocally(event.target.checked)
                            }
                          />{" "}
                          Save a local recovery copy
                        </label>
                        <button className="text-action" onClick={() => downloadReceipt(receipt)}>
                          Download private receipt
                        </button>
                        <label className="check-row">
                          <input type="checkbox" checked={backedUp} onChange={(event) => setBackedUp(event.target.checked)} />
                          I downloaded my receipt and will return during the reveal window.
                        </label>
                        <button
                          className="primary-action"
                          disabled={!backedUp || receipt.candidateId !== selectedCandidate || tx.status === "pending"}
                          onClick={() => void commit()}
                        >
                          Commit ballot <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              {wallet.address &&
                status?.eligible &&
                phase === "reveal" &&
                status.committed &&
                !status.revealed && (
                  <div className="flow-actions">
                    <p className="helper-copy">
                      Load the same candidate and secret used during commitment.
                      The computed hash must match the chain.
                    </p>
                    <label className="helper-copy">Import your private receipt JSON
                      <input type="file" accept=".json,application/json" disabled={tx.status === "pending"}
                        onChange={(event) => { void importReceipt(event.target.files?.[0]); event.target.value = ""; }} />
                    </label>
                    <div className="reveal-controls">
                      <select
                        value={selectedCandidate}
                        onChange={(event) =>
                          setSelectedCandidate(event.target.value)
                        }
                        aria-label="Candidate to reveal"
                      >
                        <option value="">Select committed candidate</option>
                        {candidates.map((candidate) => (
                          <option
                            value={candidate.id.toString()}
                            key={candidate.id.toString()}
                          >
                            {candidate.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="password"
                        autoComplete="off"
                        value={secret}
                        onChange={(event) => setSecret(event.target.value)}
                        placeholder="0x… secret from your receipt"
                        aria-label="Reveal secret"
                      />
                    </div>
                    {receipt && (
                      <button
                        className="text-action"
                        onClick={() => {
                          setSelectedCandidate(receipt.candidateId);
                          setSecret(receipt.secret);
                        }}
                      >
                        Load saved receipt
                      </button>
                    )}
                    <div className={`match-check ${matches ? "is-match" : ""}`}>
                      {matches ? (
                        <>
                          <Check size={16} /> Commitment matches the chain
                        </>
                      ) : (
                        <>○ Waiting for a matching candidate and secret</>
                      )}
                    </div>
                    <button
                      className="primary-action"
                      disabled={!matches || tx.status === "pending"}
                      onClick={() => void reveal()}
                    >
                      Reveal ballot <ShieldCheck size={16} />
                    </button>
                  </div>
                )}
              {status?.committed && !status.revealed && phase === "commit" && (
                <StateNotice title="Ballot committed — one more step remains"
                  copy={`Return after ${formatTime(election.commitEnd)} and reveal before ${formatTime(election.revealEnd)}. Your vote is counted only after reveal.`} />
              )}
              {status?.committed && !status.revealed && (phase === "ready" || phase === "finalized") && (
                <StateNotice title="Reveal deadline missed" copy="This commitment was not revealed and is excluded from the result." />
              )}
              {phase === "scheduled" && <StateNotice title="Registration is open" copy={`Ask the administrator to register your wallet before ${formatTime(election.commitStart)}.`} />}
              {wallet.address && status?.revealed && (
                <StateNotice
                  title="Your ballot is revealed"
                  copy="This wallet has successfully revealed its committed choice. The final tally will be available after the reveal window closes."
                />
              )}
              {wallet.address && phase === "ready" && (
                <div className="flow-actions">
                  <StateNotice
                    title="Reveal window closed"
                    copy="Anyone can now finalize this election. Results will unlock after finalization."
                  />
                  <button
                    className="primary-action"
                    disabled={tx.status === "pending"}
                    onClick={() =>
                      void runTransaction("Finalize election", (contract) =>
                        contract.finalizeElection(election.id),
                      )
                    }
                  >
                    Finalize election <Check size={16} />
                  </button>
                </div>
              )}
              {tx.status !== "idle" && <TxBanner tx={tx} />}
            </section>
          )}
          {election.finalized && results && (
            <section className="section-panel results-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Finalized record</p>
                  <h2>Final election results</h2>
                </div>
                <span className="verified-label">
                  <Check size={13} /> finalized on-chain
                </span>
              </div>
              <p className="helper-copy">
                {election.totalRevealed === 0n ? "No votes were revealed. There is no winner." : (() => {
                  const highest = results.reduce((max, row) => row.votes > max ? row.votes : max, 0n);
                  const winners = results.filter((row) => row.votes === highest);
                  return `${winners.length > 1 ? "Tie" : "Winner"}: ${winners.map((row) => row.name).join(", ")}`;
                })()}
              </p>
              <div className="results-list">
                {results.map((result) => (
                  <div className="result-row" key={result.id.toString()}>
                    <span>{result.name}</span>
                    <strong>{result.votes.toString()}</strong>
                    <div className="result-bar">
                      <span
                        style={{
                          width: `${(Number(result.votes) / Math.max(1, Number(election.totalRevealed))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="totals-strip">
                <span>{totals?.committed.toString()} committed</span>
                <span>{totals?.revealed.toString()} revealed</span>
                <span>{totals?.nonRevealed.toString()} not revealed</span>
              </div>
            </section>
          )}
        </div>
        <aside className="detail-aside">
          <section className="aside-panel">
            <p className="eyebrow">Election record</p>
            <dl>
              <dt>Commit opens</dt>
              <dd>{formatTime(election.commitStart)}</dd>
              <dt>Commit closes</dt>
              <dd>{formatTime(election.commitEnd)}</dd>
              <dt>Reveal closes</dt>
              <dd>{formatTime(election.revealEnd)}</dd>
              <dt>Committed</dt>
              <dd>{election.totalCommitted.toString()}</dd>
              <dt>Revealed</dt>
              <dd>{election.totalRevealed.toString()}</dd>
            </dl>
          </section>
          <section className="aside-panel security-aside">
            <ShieldCheck size={18} />
            <p>
              <strong>Security note</strong>Commit-reveal delays disclosure
              during the commit period. Reveal transactions are still public on
              Ethereum.
            </p>
          </section>
          {auditError && <p role="status" className="helper-copy">{auditError} Voting remains available. Retry with Refresh now.</p>}
          {events.length > 0 && (
            <section className="aside-panel">
              <p className="eyebrow">Recent chain activity (last 2,000 blocks)</p>
              <div className="event-list">
                {events.map((event) =>
                  appConfig.explorerUrl ? (
                    <a
                      href={`${appConfig.explorerUrl}/tx/${event.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      key={`${event.hash}-${event.label}`}
                    >
                      <span>
                        {event.label}
                        <small>Block {event.block}</small>
                      </span>
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <div
                      className="event-row"
                      key={`${event.hash}-${event.label}`}
                    >
                      <span>
                        {event.label}
                        <small>Block {event.block}</small>
                      </span>
                      <code>{event.hash.slice(0, 10)}…</code>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

function AuditIndex({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Read-only verification</p>
          <h1>Public audit</h1>
          <p>
            Connect MetaMask to enter the audit view; the records themselves
            remain independently inspectable on-chain.
          </p>
        </div>
        <span className="record-tag">WALLET CHECKPOINT</span>
      </div>
      <Dashboard wallet={wallet} />
    </section>
  );
}

function Admin({ wallet }: { wallet: ReturnType<typeof useWallet> }) {
  const provider = wallet.provider;
  const [isOwner, setIsOwner] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidateText, setCandidateText] = useState("");
  const [voters, setVoters] = useState("");
  const [electionId, setElectionId] = useState("1");
  const [scheduleMinutes, setScheduleMinutes] = useState({
    start: "30",
    commit: "90",
    reveal: "150",
  });
  useEffect(() => {
    let live = true;
    async function load() {
      if (!provider || !wallet.address || !appConfig.contractAddress) {
        setState("ready");
        return;
      }
      try {
        const contract = getContract(provider);
        setIsOwner(
          (await contract!.owner()).toLowerCase() ===
            wallet.address.toLowerCase(),
        );
        if (live) setState("ready");
      } catch (err) {
        if (live) {
          setError(formatError(err));
          setState("error");
        }
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [provider, wallet.address]);
  const createElection = async () => {
    if (!wallet.provider) {
      setTx({
        status: "error",
        label: "Create election",
        message: "Connect the owner wallet first.",
      });
      return;
    }
    if (wallet.chainId !== appConfig.chainId) {
      setTx({
        status: "error",
        label: "Create election",
        message: `Switch your wallet to chain ${appConfig.chainId} before sending this transaction.`,
      });
      return;
    }
    const rows = candidateText
      .split("\n")
      .map((line) => line.split("|").map((value) => value.trim()))
      .filter((row) => row[0]);
    if (!title || rows.length === 0 || rows.some((row) => row.length < 2)) {
      setTx({
        status: "error",
        label: "Create election",
        message: "Add a title and candidates in Name | manifesto format.",
      });
      return;
    }
    const offsets = [scheduleMinutes.start, scheduleMinutes.commit, scheduleMinutes.reveal].map(Number);
    if (offsets.some((value) => !Number.isSafeInteger(value) || value <= 0 || value > 525600)
        || offsets[0] >= offsets[1] || offsets[1] >= offsets[2] || rows.length > 20) {
      setTx({ status: "error", message: "Use 1–20 candidates and increasing whole-minute deadlines: start < commit end < reveal end (maximum one year)." });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const start = now + Number(scheduleMinutes.start) * 60;
    const commitEnd = now + Number(scheduleMinutes.commit) * 60;
    const revealEnd = now + Number(scheduleMinutes.reveal) * 60;
    try {
      setTx({ status: "pending", label: "Create election" });
      const contract = await getWriteContract(wallet.provider);
      const response = await contract!.createElection(
        title,
        description,
        rows.map((row) => row[0]),
        rows.map((row) => row[1]),
        start,
        commitEnd,
        revealEnd,
      );
      setTx({
        status: "pending",
        label: "Create election",
        hash: response.hash,
      });
      const mined = await response.wait();
      for (const log of mined.logs) {
        try {
          const event = contract!.interface.parseLog(log);
          if (event?.name === "ElectionCreated") setElectionId(event.args.electionId.toString());
        } catch { /* Other contract events are not election IDs. */ }
      }
      setTx({
        status: "success",
        label: "Create election",
        hash: response.hash,
      });
    } catch (err) {
      setTx({
        status: "error",
        label: "Create election",
        message: formatError(err),
      });
    }
  };
  const register = async () => {
    if (!wallet.provider) {
      setTx({
        status: "error",
        label: "Register voters",
        message: "Connect the owner wallet first.",
      });
      return;
    }
    if (wallet.chainId !== appConfig.chainId) {
      setTx({
        status: "error",
        label: "Register voters",
        message: `Switch your wallet to chain ${appConfig.chainId} before sending this transaction.`,
      });
      return;
    }
    const list = [...new Map(voters.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean)
      .map((value) => [value.toLowerCase(), value])).values()];
    if (!/^[1-9]\d*$/.test(electionId) || list.length === 0 || list.length > 200) {
      setTx({ status: "error", message: "Enter a valid election ID and 1–200 unique wallet addresses." });
      return;
    }
    if (!list.every((value) => ethers.isAddress(value))) {
      setTx({
        status: "error",
        label: "Register voters",
        message: "Every entry must be a valid Ethereum address.",
      });
      return;
    }
    try {
      setTx({ status: "pending", label: "Register voters" });
      const contract = await getWriteContract(wallet.provider);
      const response =
        list.length === 1
          ? await contract!.registerVoter(electionId, list[0])
          : await contract!.registerVoters(electionId, list);
      setTx({
        status: "pending",
        label: "Register voters",
        hash: response.hash,
      });
      await response.wait();
      setTx({
        status: "success",
        label: "Register voters",
        hash: response.hash,
      });
    } catch (err) {
      setTx({
        status: "error",
        label: "Register voters",
        message: formatError(err),
      });
    }
  };
  if (!wallet.address)
    return (
      <StateNotice
        title="Connect the administrator wallet"
        copy="SecureVote reads owner() from the contract. There is no local admin password or hard-coded administrator address."
      />
    );
  if (state === "loading")
    return <LoadingState text="Checking the contract owner…" />;
  if (state === "error") return <ErrorState message={error} />;
  if (!isOwner)
    return (
      <StateNotice
        title="This wallet is not the contract owner"
        copy="Administrator controls are unavailable. Connect the owner wallet recorded on-chain."
      />
    );
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Owner console</p>
          <h1>Configure an election</h1>
          <p>
            Every action below becomes a real transaction against the deployed
            contract.
          </p>
        </div>
        <span className="verified-label">
          <Check size={13} /> owner verified
        </span>
      </div>
      <div className="admin-grid">
        <section className="section-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New election</p>
              <h2>Open a ballot record</h2>
            </div>
          </div>
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Student Union Representative 2026"
            />
          </label>
          <label>
            Description
            <textarea
              className="resize-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this election deciding?"
            />
          </label>
          <label>
            Candidates <small>Name | manifesto, one per line</small>
            <textarea
              className="resize-none"
              value={candidateText}
              onChange={(event) => setCandidateText(event.target.value)}
              rows={6}
              placeholder="Candidate name | manifesto"
            />
          </label>
          <p className="helper-copy">All deadlines are minutes from creation. Register every wallet before voting starts; registration then closes. Defaults: 30 minutes to register, 60 to commit, 60 to reveal.</p>
          <div className="three-fields">
            <label>
              Start in minutes
              <input
                type="number"
                min="1"
                value={scheduleMinutes.start}
                onChange={(event) =>
                  setScheduleMinutes({
                    ...scheduleMinutes,
                    start: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Commit closes
              <input
                type="number"
                min="2"
                value={scheduleMinutes.commit}
                onChange={(event) =>
                  setScheduleMinutes({
                    ...scheduleMinutes,
                    commit: event.target.value,
                  })
                }
              />
            </label>
            <label>
              Reveal closes
              <input
                type="number"
                min="3"
                value={scheduleMinutes.reveal}
                onChange={(event) =>
                  setScheduleMinutes({
                    ...scheduleMinutes,
                    reveal: event.target.value,
                  })
                }
              />
            </label>
          </div>
          <button
            className="primary-action"
            disabled={tx.status === "pending"}
            onClick={() => void createElection()}
          >
            Create on-chain election <ArrowRight size={16} />
          </button>
        </section>
        <section className="section-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Eligibility registry</p>
              <h2>Register wallets</h2>
            </div>
          </div>
          <p className="helper-copy">After creation, the new election ID is selected below. Register your own wallet too if you want to vote.</p>
          <Link className="text-action" to={`/elections/${electionId}`}>Open election / share its URL</Link>
          <label>
            Election ID
            <input
              value={electionId}
              onChange={(event) => setElectionId(event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label>
            Wallet addresses <small>Comma, space, or newline separated</small>
            <textarea
              className="resize-none"
              value={voters}
              onChange={(event) => setVoters(event.target.value)}
              rows={8}
              placeholder="0x…"
            />
          </label>
          <button className="primary-action" disabled={tx.status === "pending"} onClick={() => void register()}>
            Register voters <ShieldCheck size={16} />
          </button>
          <div className="security-note">
            <LockKeyhole size={17} />
            <p>
              <strong>Owner trust is explicit.</strong> Registration is
              administrator-controlled, but committed votes and finalized
              results cannot be edited by this dashboard.
            </p>
          </div>
        </section>
      </div>
      {tx.status !== "idle" && <TxBanner tx={tx} />}
    </section>
  );
}

function TxBanner({ tx }: { tx: TxState }) {
  return (
    <div className={`tx-banner tx-${tx.status}`}>
      <span>
        {tx.status === "pending" ? "↻" : tx.status === "success" ? "✓" : "!"}
      </span>
      <div>
        <strong>{tx.label}</strong>
        <p>
          {tx.status === "pending"
            ? "Waiting for a real blockchain receipt…"
            : tx.status === "success"
              ? "Confirmed on-chain."
              : tx.message}
        </p>
        {tx.hash &&
          (appConfig.explorerUrl ? (
            <a
              href={`${appConfig.explorerUrl}/tx/${tx.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction <ExternalLink size={13} />
            </a>
          ) : (
            <span className="tx-local-hash">
              Transaction <code>{tx.hash}</code>
            </span>
          ))}
      </div>
    </div>
  );
}

function StateNotice({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="state-notice">
      <CircleAlert size={18} />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}
function LoadingState({ text }: { text: string }) {
  return (
    <div className="large-state">
      <span className="loader" />
      <p>{text}</p>
    </div>
  );
}
function ErrorState({ message }: { message: string }) {
  return (
    <div className="large-state is-error">
      <CircleAlert size={22} />
      <h2>Chain data unavailable</h2>
      <p>{message}</p>
    </div>
  );
}
function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="large-state">
      <Clipboard size={22} />
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export default App;

