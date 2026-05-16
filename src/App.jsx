// ─── App.jsx ──────────────────────────────────────────────────────────────────
// Root shell: sidebar nav, global state, toast system, page routing.
// Each page is a separate file — see FriendsPage, GroupsPage, GoalsPage, BetsPage.

import { useState, useCallback, useEffect } from "react";
import { parseEther } from "viem";
import { CSS }          from "./styles.js";
import { INITIAL_STATE, MOCK_ACCOUNT, short, ensName, DeadlineChip, Modal } from "./contract/Constants.jsx";
import FriendsPage from "./components/FriendsPage.jsx";
import GroupsPage  from "./components/CreateGroup.jsx";
import GoalsPage   from "./components/GoalsPage.jsx";
import BetsPage    from "./components/BetsPage.jsx";

// ─── Toast hook ───────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, state, walletAddress, onWalletClick }) {
  const pendingCount = state.pendingRequests.length;
  const activeBets   = state.bets.filter((b) => b.status === "active" || b.status === "pending_accept").length;

  const NAV = [
    { id: "home",    icon: "⌂",  label: "Dashboard" },
    { id: "friends", icon: "◈",  label: "Friends",  badge: pendingCount || null },
    { id: "groups",  icon: "◉",  label: "Groups" },
    { id: "goals",   icon: "◎",  label: "Goals" },
    { id: "bets",    icon: "⬡",  label: "Bets",     badge: activeBets || null },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-word">GOALPOOL</span>
        <span className="logo-sub">on Monad</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Menu</div>
        {NAV.map((n) => (
          <div
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
            {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
          </div>
        ))}
      </nav>

      <button className="sidebar-wallet" onClick={onWalletClick}>
        <span className="wallet-dot" />
        {walletAddress
          ? short(walletAddress)
          : isAddress(state.account)
          ? `Test ${short(state.account)}`
          : "Connect Wallet"}
      </button>
    </aside>
  );
}

// ─── Wallet Modal ────────────────────────────────────────────────────────────
function WalletModal({ account, activeAccount, onClose, onConnect, onSwitch, onDisconnect, onUseTestUser }) {
  const [testAddress, setTestAddress] = useState("");
  const canUseTestUser = isAddress(testAddress);
  const hasLocalTestUser = !account && activeAccount && isAddress(activeAccount);

  return (
    <Modal
      title="Connect to wallet"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {(account || hasLocalTestUser) && (
            <button className="btn btn-ghost" onClick={onDisconnect}>
              Disconnect
            </button>
          )}
          {account && (
            <button className="btn btn-amber" onClick={onSwitch}>
              Switch Wallet
            </button>
          )}
          <button className="btn btn-ink" onClick={() => onConnect(true)}>
            Connect MetaMask
          </button>
        </>
      }
    >
      <div className="wallet-connect-box">
        <div className="wallet-connect-icon">M</div>
        <div>
          <div className="wallet-connect-title">Your MetaMask wallet</div>
          <div className="wallet-connect-copy">
            {account
              ? `Connected wallet: ${short(account)}`
              : hasLocalTestUser
              ? `Local test user: ${short(activeAccount)}`
              : "Open MetaMask and choose the wallet you want to use."}
          </div>
          <div className="wallet-actions-inline">
            <button className="btn btn-ink btn-sm" onClick={() => onConnect(true)}>
              Connect MetaMask
            </button>
            {account && (
              <button className="btn btn-amber btn-sm" onClick={onSwitch}>
                Switch Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="wallet-test-box">
        <label className="label">Friend/test wallet address</label>
        <div className="wallet-test-row">
          <input
            className="input"
            placeholder="Paste friend's 0x wallet address"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
          />
          <button
            className="btn btn-ghost"
            disabled={!canUseTestUser}
            onClick={() => onUseTestUser(testAddress)}
          >
            Use
          </button>
        </div>
        <div className="field-hint">
          Use this to view the app as your friend during local testing. For real transactions, MetaMask must be connected to that same wallet.
        </div>
      </div>

      {(account || hasLocalTestUser) && (
        <div className="wallet-disconnect-box">
          <div>
            <div className="wallet-disconnect-title">Disconnect current user</div>
            <div className="field-hint">
              Clears this app's active wallet so another user can connect.
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )}
    </Modal>
  );
}

const MONAD_TESTNET = {
  chainId: "0x279f",
  chainName: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  blockExplorerUrls: ["https://testnet.monadexplorer.com"],
};

const isAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || "");
const mon = (value) => Number.parseFloat(value || 0);

// ─── Per-account localStorage persistence ─────────────────────────────────────
const STORAGE_KEY = "goalpool_accounts";

function loadAllAccounts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function persistAccount(address, fields) {
  if (!address || address === MOCK_ACCOUNT) return;
  const all = loadAllAccounts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [address]: fields }));
}

const ACCOUNT_DEFAULTS = {
  friends: [],
  pendingRequests: [],
  groups: [],
  goals: [],
  bets: [],
  transactions: [],
};

function accountFields(s) {
  return {
    friends: s.friends,
    pendingRequests: s.pendingRequests,
    groups: s.groups,
    goals: s.goals,
    bets: s.bets,
    transactions: s.transactions,
  };
}

// Write a bet into another account's stored data without touching current state
function injectBetToAccount(address, bet) {
  if (!address || !isAddress(address)) return;
  const all = loadAllAccounts();
  const data = all[address] || { ...ACCOUNT_DEFAULTS };
  if (data.bets.some((b) => b.id === bet.id)) return;
  data.bets = [...data.bets, bet];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [address]: data }));
}

// Update a bet's fields in another account's stored data
function syncBetToAccount(address, betId, updates) {
  if (!address || !isAddress(address)) return;
  const all = loadAllAccounts();
  const data = all[address];
  if (!data) return;
  data.bets = data.bets.map((b) => (b.id === betId ? { ...b, ...updates } : b));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [address]: data }));
}

// ─── Home / Dashboard ─────────────────────────────────────────────────────────
function HomePage({ state, setPage, onBet, markComplete }) {
  const myGoals   = state.goals.filter((g) => g.owner === state.account);
  const doneGoals = myGoals.filter((g) => g.completedAt);
  const activeBets = state.bets.filter((b) => b.status !== "settled");
  const pct = myGoals.length
    ? Math.round((doneGoals.length / myGoals.length) * 100)
    : 0;

  const upcoming = myGoals
    .filter((g) => !g.completedAt)
    .sort((a, b) => a.deadline - b.deadline)
    .slice(0, 3);

  const recentBets = [...state.bets].reverse().slice(0, 2);

  return (
    <div className="page">
      <div className="page-eyebrow">Overview</div>
      <div className="page-title">
        Your <span>Sprint</span>
      </div>
      <div className="page-sub">
        Stay accountable. Win your bets. Ship your goals.
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num amber">{myGoals.length}</div>
          <div className="stat-lbl">Active Goals</div>
        </div>
        <div className="stat-box">
          <div className="stat-num sage">{doneGoals.length}</div>
          <div className="stat-lbl">Completed</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{state.groups.length}</div>
          <div className="stat-lbl">Groups</div>
        </div>
        <div className="stat-box">
          <div className="stat-num rose">{activeBets.length}</div>
          <div className="stat-lbl">Active Bets</div>
        </div>
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Goal completion rate
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>
            {pct}%
          </span>
        </div>
        <div className="progress-wrap">
          <div
            className={`progress-fill ${pct === 100 ? "done" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <hr className="divider" />

      {/* Upcoming goals */}
      <div className="section-head">
        <div className="section-label">Upcoming Deadlines</div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage("goals")}
        >
          See all
        </button>
      </div>
      {upcoming.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎯</div>
          <div className="empty-text">No active goals — set one now</div>
        </div>
      ) : (
        <div className="card-list">
          {upcoming.map((g) => (
            <div className="card" key={g.id}>
              <div className="card-accent amber" />
              <div className="card-row" style={{ paddingLeft: 8 }}>
                <div className="card-body">
                  <div className="card-title">{g.title}</div>
                  <div className="card-meta">
                    <DeadlineChip deadline={g.deadline} />
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="btn btn-sage btn-sm"
                    onClick={() => markComplete(g.id)}
                  >
                    ✓ Done
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="divider" />

      {/* Recent bets */}
      <div className="section-head">
        <div className="section-label">Recent Bets</div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPage("bets")}
        >
          See all
        </button>
      </div>
      {recentBets.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🤝</div>
          <div className="empty-text">No bets yet</div>
        </div>
      ) : (
        <div className="card-list">
          {recentBets.map((b) => (
            <div className="card" key={b.id}>
              <div className="card-accent rose" />
              <div style={{ paddingLeft: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div className="bet-amount">
                      {b.amount} {b.token}
                    </div>
                    <div className="bet-condition">{b.condition}</div>
                  </div>
                  <span
                    className={`tag ${
                      b.status === "settled"
                        ? "tag-sage"
                        : b.status === "active"
                        ? "tag-amber"
                        : "tag-muted"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <hr className="divider" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-ink" onClick={() => setPage("goals")}>
          + Set Goal
        </button>
        <button className="btn btn-amber" onClick={() => setPage("bets")}>
          + New Bet
        </button>
        <button className="btn btn-ghost" onClick={() => setPage("groups")}>
          + Group
        </button>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const [page,  setPage]  = useState("home");
  const [betGoalId, setBetGoalId] = useState(null); // pre-link goal → bets page
  const [showWallet, setShowWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const { toasts, push } = useToast();

  const update = (fn) => setState((s) => fn({ ...s }));

  function activateWalletAccount(account) {
    if (!account) return;

    setState((s) => {
      // Save the outgoing account before switching
      persistAccount(s.account, accountFields(s));
      // Load stored data for the incoming account (or start fresh)
      const stored = loadAllAccounts();
      const data = stored[account] ?? { ...ACCOUNT_DEFAULTS };
      return { ...s, account, ...data };
    });
    setWalletAddress(account);
  }

  function clearWalletAccount() {
    setState((s) => {
      persistAccount(s.account, accountFields(s));
      return { ...INITIAL_STATE };
    });
    setWalletAddress("");
  }

  // Auto-save each account's data whenever state changes
  useEffect(() => {
    persistAccount(state.account, accountFields(state));
  }, [state]);

  useEffect(() => {
    if (!window.ethereum?.on) return;

    const handleAccountsChanged = (accounts) => {
      const account = accounts?.[0] || "";
      setWalletAddress(account);
      if (account) activateWalletAccount(account);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  // ── Actions (wire to contract here) ────────────────────────────────────────
  function addFriend(address, name) {
    update((s) => {
      s.friends = [
        ...s.friends,
        { address, ens: name || address, since: Date.now() },
      ];
      return s;
    });
    push(`${name || short(address)} added`, "success");
  }

  function acceptFriendRequest(addr, name) {
    update((s) => {
      s.friends = [
        ...s.friends,
        { address: addr, ens: name || addr, since: Date.now() },
      ];
      s.pendingRequests = s.pendingRequests.filter((r) => r.address !== addr);
      return s;
    });
    push(`${name || short(addr)} added as friend`, "success");
  }

  function declineRequest(addr) {
    update((s) => {
      s.pendingRequests = s.pendingRequests.filter((r) => r.address !== addr);
      return s;
    });
    push("Request declined");
  }

  function createGroup(name, description, isPrivate) {
    const id = "g" + Date.now();
    update((s) => {
      s.groups = [
        ...s.groups,
        {
          id, name, description,
          creator: s.account,
          members: [s.account],
          isPrivate,
          createdAt: Date.now(),
        },
      ];
      return s;
    });
    push("Group created!", "success");
  }

  function addGoal(title, description, deadline, groupId) {
    const id = "goal" + Date.now();
    update((s) => {
      s.goals = [
        ...s.goals,
        {
          id, title, description, deadline, groupId,
          owner: s.account,
          completedAt: null,
          verified: false,
          verifiedBy: [],
        },
      ];
      return s;
    });
    push("Goal set!", "success");
  }

  function markComplete(goalId) {
    update((s) => {
      s.goals = s.goals.map((g) =>
        g.id === goalId ? { ...g, completedAt: Date.now() } : g
      );
      return s;
    });
    push("Marked complete — awaiting group verification", "success");
  }

  function verifyGoal(goalId) {
    update((s) => {
      s.goals = s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const newVerifiers = [...g.verifiedBy, s.account];
        return {
          ...g,
          verifiedBy: newVerifiers,
          verified: newVerifiers.length >= 1,
        };
      });
      return s;
    });
    push("Goal verified!", "success");
  }

  async function createBet(data) {
    const id = "bet" + Date.now();
    const newBet = {
      id,
      ...data,
      txHash: null,
      status: "pending_accept",
      winner: null,
      createdAt: Date.now(),
    };
    update((s) => {
      s.bets = [...s.bets, newBet];
      s.transactions = [
        ...(s.transactions || []),
        {
          id: "tx" + Date.now(),
          betId: id,
          type: "bet_proposed",
          label: "Bet proposed",
          amount: 0,
          token: data.token,
          hash: null,
          counterparty: data.against,
          createdAt: Date.now(),
        },
      ];
      return s;
    });
    // Let the counterparty see the incoming bet when they connect
    injectBetToAccount(data.against, newBet);
    push("Bet proposed — waiting for accept or decline", "success");
    return true;
  }

  async function acceptBet(betId) {
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return false;

    update((s) => {
      s.bets = s.bets.map((b) =>
        b.id === betId ? { ...b, status: "active", acceptTxHash: null } : b
      );
      s.transactions = [
        ...(s.transactions || []),
        {
          id: "tx" + Date.now(),
          betId,
          type: "bet_accepted",
          label: "Bet accepted",
          amount: 0,
          token: bet.token,
          hash: null,
          counterparty: bet.creator,
          createdAt: Date.now(),
        },
      ];
      return s;
    });
    // Sync accepted status back to the creator's stored data
    syncBetToAccount(bet.creator, betId, { status: "active", acceptTxHash: null });
    push("Bet accepted — no MON moves until settlement", "success");
    return true;
  }

  function declineBet(betId) {
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return false;

    const declinedAt = Date.now();
    update((s) => {
      s.bets = s.bets.map((b) =>
        b.id === betId ? { ...b, status: "declined", declinedAt } : b
      );
      s.transactions = [
        ...(s.transactions || []),
        {
          id: "tx" + Date.now(),
          betId,
          type: "bet_declined",
          label: "Bet declined",
          amount: 0,
          token: bet.token,
          hash: null,
          counterparty: bet.creator,
          createdAt: Date.now(),
        },
      ];
      return s;
    });
    // Sync declined status back to the creator's stored data
    syncBetToAccount(bet.creator, betId, { status: "declined", declinedAt });
    push("Bet declined", "success");
    return true;
  }

  async function settleBet(betId, winner) {
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return false;

    let settleTxHash = null;
    const userLost = winner !== state.account;
    const settlementValue = userLost ? bet.amount : "0";
    const canConfirmOnChain = userLost && isAddress(winner);

    if (canConfirmOnChain) {
      try {
        settleTxHash = await requestBetTransaction({
          amount: settlementValue,
          to: winner,
          label: "settlement payment",
        });
      } catch (error) {
        console.error("Settlement transaction failed:", error);
        push(error.message || "Settlement transaction cancelled", "error");
        return false;
      }
    } else {
      settleTxHash = "local-mock-" + Date.now();
      push("Demo settlement recorded locally.");
    }

    update((s) => {
      const won = bet && winner === s.account;
      const settlementAmount = won ? mon(bet.amount) : -mon(bet.amount);
      const goal = s.goals.find((g) => g.id === bet.goalId);
      const goalOwner = goal?.owner === s.account ? "you" : ensName(goal?.owner, s.friends);
      const completed = goal?.owner === winner;

      s.bets = s.bets.map((b) =>
        b.id === betId ? { ...b, status: "settled", winner, settleTxHash } : b
      );
      if (bet) {
        s.transactions = [
          ...(s.transactions || []),
          {
            id: "tx" + Date.now(),
            betId,
            type: won ? "settlement_gain" : "settlement_loss",
            label: completed
              ? `${goalOwner} completed the goal`
              : `${goalOwner} did not complete the goal`,
            amount: settlementAmount,
            token: bet.token,
            hash: settleTxHash,
            counterparty: won ? (bet.creator === s.account ? bet.against : bet.creator) : winner,
            createdAt: Date.now(),
          },
        ];
      }
      return s;
    });
    // Sync settled status to the other party's stored data
    const counterparty = bet.creator === state.account ? bet.against : bet.creator;
    syncBetToAccount(counterparty, betId, { status: "settled", winner, settleTxHash });
    push(canConfirmOnChain ? "Bet settled with MetaMask payment" : "Demo bet settled locally", "success");
    return true;
  }

  // Open bets page pre-linked to a goal
  function openBetForGoal(goalId) {
    setBetGoalId(goalId);
    setPage("bets");
  }

  async function connectWallet(forcePicker = false) {
    if (!window.ethereum) {
      push("MetaMask is not installed", "error");
      return;
    }

    try {
      if (forcePicker) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0];

      activateWalletAccount(account);
      setShowWallet(false);
      push(`Wallet connected as ${short(account)}`, "success");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      push("Wallet connection cancelled", "error");
    }
  }

  async function disconnectWallet() {
    try {
      await window.ethereum?.request?.({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      console.info("MetaMask permission revoke unavailable or cancelled:", error);
    }

    clearWalletAccount();
    setShowWallet(false);
    push("Wallet disconnected", "success");
  }

  function useTestUser(address) {
    activateWalletAccount(address);
    setWalletAddress("");
    setShowWallet(false);
    push(`Local test user set to ${short(address)}`, "success");
  }

  async function ensureMonadTestnet() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [MONAD_TESTNET],
      });
    }
  }

  async function requestBetTransaction({ amount, to, label }) {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const [account] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (isAddress(state.account) && state.account.toLowerCase() !== account.toLowerCase()) {
      throw new Error(`MetaMask is connected to ${short(account)}. Switch MetaMask to ${short(state.account)} first.`);
    }

    activateWalletAccount(account);
    await ensureMonadTestnet();

    if (!isAddress(to)) {
      throw new Error("This bet uses a mock address. Add your friend's real 0x wallet address first.");
    }

    const recipient = to;
    const value = `0x${parseEther(amount || "0").toString(16)}`;

    push(`Confirm ${label} in MetaMask`);
    return window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: account, to: recipient, value }],
    });
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <Sidebar
          page={page}
          setPage={setPage}
          state={state}
          walletAddress={walletAddress}
          onWalletClick={() => setShowWallet(true)}
        />

        <main className="content">
          {page === "home" && (
            <HomePage
              state={state}
              setPage={setPage}
              onBet={openBetForGoal}
              markComplete={markComplete}
            />
          )}
          {page === "friends" && (
            <FriendsPage
              state={state}
              addFriend={addFriend}
              acceptFriendRequest={acceptFriendRequest}
              declineRequest={declineRequest}
            />
          )}
          {page === "groups" && (
            <GroupsPage
              state={state}
              createGroup={createGroup}
            />
          )}
          {page === "goals" && (
            <GoalsPage
              state={state}
              addGoal={addGoal}
              markComplete={markComplete}
              verifyGoal={verifyGoal}
              onBet={openBetForGoal}
            />
          )}
          {page === "bets" && (
            <BetsPage
              state={state}
              createBet={createBet}
              acceptBet={acceptBet}
              declineBet={declineBet}
              settleBet={settleBet}
              markComplete={markComplete}
              preGoalId={betGoalId}
            />
          )}
        </main>
      </div>

      {showWallet && (
        <WalletModal
          account={walletAddress}
          activeAccount={state.account}
          onClose={() => setShowWallet(false)}
          onConnect={connectWallet}
          onSwitch={() => connectWallet(true)}
          onDisconnect={disconnectWallet}
          onUseTestUser={useTestUser}
        />
      )}

      {/* Global toasts */}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  );
}