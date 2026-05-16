// ─── BetsPage.jsx ─────────────────────────────────────────────────────────────
// Accountability bets: propose, accept, settle.
// Wire createBet / acceptBet / settleBet to contract calls when ready.

import { useState } from "react";
import { DeadlineChip, ensName, Modal } from "../contract/Constants.jsx";

const money = (value) => Number.parseFloat(value || 0);
const signedMon = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)} MON`;

// ─── Create Bet Modal ─────────────────────────────────────────────────────────
function CreateBetModal({ onClose, onCreate, state, preGoalId }) {
  const [against,   setAgainst]   = useState(state.friends[0]?.address || "");
  const [amount,    setAmount]    = useState("");
  const [condition, setCondition] = useState("");
  const [goalId,    setGoalId]    = useState(preGoalId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = against && Number(amount) > 0 && condition.trim() && goalId && !isSubmitting;

  async function submit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const created = await onCreate({
      groupId:
        state.goals.find((g) => g.id === goalId)?.groupId ||
        state.groups[0]?.id,
      goalId,
      creator: state.account,
      against,
      amount,
      token: "MON",
      condition: condition.trim(),
      creatorWins: "goal achieved",
      againstWins: "goal missed",
    });
    setIsSubmitting(false);
    if (created) onClose();
  }

  return (
    <Modal
      title="New Bet"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-rose" disabled={!canSubmit} onClick={submit}>
            {isSubmitting ? "Confirming..." : "Propose Bet"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      {/* Challenge */}
      <div className="field">
        <label className="label">Challenge</label>
        <select
          className="select"
          value={against}
          onChange={(e) => setAgainst(e.target.value)}
        >
          {state.friends.length === 0 && (
            <option value="">Add friends first</option>
          )}
          {state.friends.map((f) => (
            <option key={f.address} value={f.address}>
              {f.ens}
            </option>
          ))}
        </select>
      </div>

      {/* Amount */}
      <div className="field">
        <label className="label">Stake Amount (MON)</label>
        <input
          className="input"
          type="number"
          placeholder="0.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Condition */}
      <div className="field">
        <label className="label">Condition</label>
        <textarea
          className="textarea"
          placeholder="e.g. 'Deploy contract by end of month'"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
      </div>

      {/* Link to goal */}
      {state.goals.length > 0 && (
        <div className="field">
          <label className="label">Linked Goal</label>
          <select
            className="select"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            <option value="">Choose the goal this bet follows</option>
            {state.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warning */}
      <div
        style={{
          background: "var(--cream)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "12px 14px",
          fontSize: 13,
          color: "var(--muted)",
          fontStyle: "italic",
        }}
      >
        The app settles this bet from the linked goal: completed means the goal owner wins, missed deadline means the other side wins.
      </div>
    </Modal>
  );
}

function getBetOutcome(bet, goals) {
  const goal = goals.find((g) => g.id === bet.goalId);
  if (!goal) {
    return {
      goal,
      status: "missing",
      label: "No linked goal",
      detail: "Link this bet to a goal so GoalPool can decide the result.",
      winner: null,
    };
  }

  if (goal.completedAt) {
    return {
      goal,
      status: "completed",
      label: "Completed",
      detail: "The linked goal was marked complete.",
      winner: goal.owner,
    };
  }

  if (Date.now() > goal.deadline) {
    const winner = goal.owner === bet.creator ? bet.against : bet.creator;
    return {
      goal,
      status: "failed",
      label: "Failed",
      detail: "The linked goal passed its deadline without completion.",
      winner,
    };
  }

  return {
    goal,
    status: "pending",
    label: "Still pending",
    detail: "The deadline has not passed yet.",
    winner: null,
  };
}

// ─── Bet Card ─────────────────────────────────────────────────────────────────
function BetCard({ bet, account, friends, goals, onAccept, onDecline, onSettle, onMarkComplete, pendingAction }) {
  const isMine       = bet.creator === account;
  const counterparty = isMine
    ? ensName(bet.against, friends)
    : ensName(bet.creator, friends);
  const outcome = getBetOutcome(bet, goals);
  const ownsGoal = outcome.goal?.owner === account;
  const opponent = bet.creator === account ? bet.against : bet.creator;
  const outcomeTag =
    outcome.status === "completed" ? "tag-sage" :
    outcome.status === "failed"    ? "tag-rose" :
    "tag-muted";

  const accentColor =
    bet.status === "settled"        ? "sage"  :
    bet.status === "active"         ? "amber" :
    bet.status === "declined"       ? "rose"  :
    "muted";

  const tagClass =
    bet.status === "settled"        ? "tag-sage"  :
    bet.status === "active"         ? "tag-amber" :
    bet.status === "declined"       ? "tag-rose"  :
    "tag-muted";

  return (
    <div className="card">
      <div className={`card-accent ${accentColor}`} />
      <div style={{ paddingLeft: 8 }}>
        <div className="card-row" style={{ alignItems: "flex-start" }}>
          {/* Left: amount + condition */}
          <div className="card-body">
            <div className="bet-amount">
              {bet.amount} {bet.token}
            </div>
            <div className="bet-vs">vs {counterparty}</div>
            <div className="bet-condition">{bet.condition}</div>
            {outcome.goal && (
              <div className="card-meta" style={{ marginTop: 8 }}>
                Goal: {outcome.goal.title} · <DeadlineChip deadline={outcome.goal.deadline} />
              </div>
            )}
            {bet.winner && (
              <div style={{ marginTop: 8 }}>
                <span className="tag tag-sage">
                  Winner: {ensName(bet.winner, friends)}
                </span>
              </div>
            )}
            <TxHash label="Proposed" hash={bet.txHash} />
            <TxHash label="Accepted" hash={bet.acceptTxHash} />
            <TxHash label="Settled" hash={bet.settleTxHash} />
          </div>

          {/* Right: status + actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <span className={`tag ${tagClass}`}>{bet.status}</span>

            {/* Counterparty can accept or decline pending bets */}
            {bet.status === "pending_accept" && !isMine && (
              <>
                <button
                  className="btn btn-amber btn-sm"
                  onClick={() => onAccept(bet.id)}
                  disabled={!!pendingAction}
                >
                  {pendingAction === `accept:${bet.id}` ? "Confirming..." : "Accept Bet"}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onDecline(bet.id)}
                  disabled={!!pendingAction}
                >
                  {pendingAction === `decline:${bet.id}` ? "Declining..." : "Decline"}
                </button>
              </>
            )}

            {/* Active bet — settle by whether the goal was completed */}
            {bet.status === "active" && (
              <>
                <span className={`tag ${outcomeTag}`}>{outcome.label}</span>
                <div className="field-hint" style={{ maxWidth: 180, textAlign: "right" }}>
                  {outcome.detail}
                </div>
                {outcome.status === "pending" && ownsGoal && (
                  <>
                    <button
                      className="btn btn-sage btn-sm"
                      onClick={() => {
                        onMarkComplete(outcome.goal.id);
                        onSettle(bet.id, account);
                      }}
                      disabled={!!pendingAction}
                    >
                      I Completed
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onSettle(bet.id, opponent)}
                      disabled={!!pendingAction}
                    >
                      I Failed
                    </button>
                  </>
                )}
                {outcome.winner && (
                  <button
                    className="btn btn-amber btn-sm"
                    onClick={() => onSettle(bet.id, outcome.winner)}
                    disabled={!!pendingAction}
                  >
                    {pendingAction === `settle:${bet.id}` ? "Confirming..." : "Confirm Payout"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          Created {new Date(bet.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function TxHash({ label, hash }) {
  if (!hash) return null;

  return (
    <div className="bet-tx">
      {label}: {hash.slice(0, 10)}...{hash.slice(-6)}
    </div>
  );
}

function dueLabel(deadline) {
  if (!deadline) return "";
  const days = Math.ceil((deadline - Date.now()) / 86400000);
  const date = new Date(deadline).toLocaleDateString();
  if (days < 0) return `Due ${date} · expired`;
  if (days === 0) return `Due ${date} · today`;
  if (days === 1) return `Due ${date} · tomorrow`;
  return `Due ${date} · ${days}d left`;
}

function SettlementModal({ bet, winner, state, onClose, onConfirm, pendingAction }) {
  const goal = state.goals.find((g) => g.id === bet.goalId);
  const userWins = winner === state.account;
  const completed = goal?.owner === winner;
  const goalOwner = goal?.owner === state.account ? "you" : ensName(goal?.owner, state.friends);
  const winnerName = winner === state.account ? "you" : ensName(winner, state.friends);
  const amount = money(bet.amount).toFixed(2);

  return (
    <Modal
      title="Confirm bet result"
      onClose={onClose}
      footer={
        <>
          <button
            className={userWins ? "btn btn-sage" : "btn btn-rose"}
            disabled={!!pendingAction}
            onClick={onConfirm}
          >
            {pendingAction ? "Confirming..." : "Confirm Result"}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={!!pendingAction}>
            Cancel
          </button>
        </>
      }
    >
      <div className="wallet-connect-box">
        <div className="wallet-connect-icon">{userWins ? "+" : "-"}</div>
        <div>
          <div className="wallet-connect-title">
            {completed ? `${goalOwner} completed the goal` : `${goalOwner} did not complete the goal`}
          </div>
          <div className="wallet-connect-copy">
            Winner: {winnerName}
          </div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "14px 16px",
          background: "var(--paper)",
        }}
      >
        <div className="label">{userWins ? "Amount you gain" : "Amount you will send"}</div>
        <div className={`stat-num ${userWins ? "sage" : "rose"}`} style={{ marginTop: 4 }}>
          {userWins ? "+" : "-"}{amount} {bet.token}
        </div>
        {goal?.deadline && (
          <div className="history-meta" style={{ marginTop: 4 }}>
            {dueLabel(goal.deadline)}
          </div>
        )}
        <div className="field-hint" style={{ marginTop: 8 }}>
          {userWins
            ? "This records your gain. Your friend must connect their wallet to send the payment from their MetaMask."
            : "MetaMask will pop up and ask you to send this amount to the winner."}
        </div>
      </div>
    </Modal>
  );
}

function TransactionRow({ tx, bet, goal }) {
  const isGain = tx.amount > 0;
  const isLoss = tx.amount < 0;
  const hash = tx.hash || "";
  const deadline = goal?.deadline;

  return (
    <div className="history-row">
      <div className="history-main">
        <div className="history-title-row">
          <span className={`tag ${isGain ? "tag-sage" : isLoss ? "tag-rose" : "tag-muted"}`}>
            {isGain ? "Gain" : isLoss ? "Loss" : "Record"}
          </span>
          <div className="history-title">{tx.label}</div>
        </div>
        <div className="history-meta">
          {new Date(tx.createdAt).toLocaleString()}
          {hash && <> · {hash.slice(0, 10)}...{hash.slice(-6)}</>}
        </div>
      </div>
      <div className={`history-amount ${isLoss ? "loss" : "gain"}`}>
        {signedMon(tx.amount)}
        {deadline && (
          <div className="history-meta" style={{ marginTop: 4 }}>
            {dueLabel(deadline)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bets Page ────────────────────────────────────────────────────────────────
export default function BetsPage({
  state,
  acceptBet,
  declineBet,
  settleBet,
  createBet,
  markComplete,
  preGoalId,   // optional: pre-link a goal when opened from GoalsPage
}) {
  const [filter,    setFilter]    = useState("active");
  const [showModal, setShowModal] = useState(!!preGoalId);
  const [pendingAction, setPendingAction] = useState("");
  const [settlement, setSettlement] = useState(null);

  const FILTERS = [
    ["active",         "Active"],
    ["pending_accept", "Pending"],
    ["settled",        "Settled"],
    ["declined",       "Declined"],
    ["all",            "All"],
  ];

  const displayed =
    filter === "all"
      ? state.bets
      : state.bets.filter((b) => b.status === filter);

  const incomingPending = state.bets.filter(
    (b) => b.status === "pending_accept" && b.against === state.account
  );

  const transactions = [...(state.transactions || [])].sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const gained = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const sent = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const net = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const totalStaked = state.bets
    .filter((b) => b.status === "active")
    .reduce((s, b) => s + money(b.amount), 0)
    .toFixed(2);

  function requestSettlement(betId, winner) {
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return;
    setSettlement({ bet, winner });
  }

  async function confirmSettlement() {
    if (!settlement) return;
    setPendingAction(`settle:${settlement.bet.id}`);
    const settled = await settleBet(settlement.bet.id, settlement.winner);
    setPendingAction("");
    if (settled) setSettlement(null);
  }

  return (
    <div className="page">
      <div className="page-eyebrow">Accountability</div>
      <div className="page-title">Bets</div>
      <div className="page-sub">Put MON on the line. Keep each other honest.</div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num amber">
            {state.bets.filter((b) => b.status === "active").length}
          </div>
          <div className="stat-lbl">Active</div>
        </div>
        <div className="stat-box">
          <div className="stat-num rose">
            {state.bets.filter((b) => b.status === "pending_accept").length}
          </div>
          <div className="stat-lbl">Pending</div>
        </div>
        <div className="stat-box">
          <div className={`stat-num ${net < 0 ? "rose" : "sage"}`}>
            {net.toFixed(2)}
          </div>
          <div className="stat-lbl">Net P/L</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{totalStaked}</div>
          <div className="stat-lbl">MON at stake</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num sage">{gained.toFixed(2)}</div>
          <div className="stat-lbl">Gained MON</div>
        </div>
        <div className="stat-box">
          <div className="stat-num rose">{sent.toFixed(2)}</div>
          <div className="stat-lbl">Sent / Lost MON</div>
        </div>
        <div className="stat-box">
          <div className="stat-num sage">
            {state.bets.filter((b) => b.status === "settled").length}
          </div>
          <div className="stat-lbl">Settled</div>
        </div>
      </div>

      {incomingPending.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-label" style={{ color: "var(--rose)" }}>
              Bets Waiting for You
            </div>
            <span className="tag tag-rose">{incomingPending.length} need response</span>
          </div>
          <div className="card-list" style={{ marginBottom: 24 }}>
            {incomingPending.map((b) => (
              <BetCard
                key={b.id}
                bet={b}
                account={state.account}
                friends={state.friends}
                goals={state.goals}
                pendingAction={pendingAction}
                onAccept={async (betId) => {
                  setPendingAction(`accept:${betId}`);
                  await acceptBet(betId);
                  setPendingAction("");
                }}
                onDecline={async (betId) => {
                  setPendingAction(`decline:${betId}`);
                  await declineBet(betId);
                  setPendingAction("");
                }}
                onSettle={async (betId, winner) => {
                  requestSettlement(betId, winner);
                }}
                onMarkComplete={markComplete}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Filter tabs + CTA ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            className={`btn btn-sm ${filter === v ? "btn-ink" : "btn-ghost"}`}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
        <button
          className="btn btn-rose btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowModal(true)}
        >
          + New Bet
        </button>
      </div>

      {/* ── Bet cards ── */}
      {displayed.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⬡</div>
          <div className="empty-text">No bets in this view</div>
        </div>
      ) : (
        <div className="card-list">
          {displayed.map((b) => (
            <BetCard
              key={b.id}
              bet={b}
              account={state.account}
              friends={state.friends}
              goals={state.goals}
              pendingAction={pendingAction}
              onAccept={async (betId) => {
                setPendingAction(`accept:${betId}`);
                await acceptBet(betId);
                setPendingAction("");
              }}
              onDecline={async (betId) => {
                setPendingAction(`decline:${betId}`);
                await declineBet(betId);
                setPendingAction("");
              }}
              onSettle={async (betId, winner) => {
                requestSettlement(betId, winner);
              }}
              onMarkComplete={markComplete}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <CreateBetModal
          state={state}
          preGoalId={preGoalId}
          onClose={() => setShowModal(false)}
          onCreate={createBet}
        />
      )}
      {settlement && (
        <SettlementModal
          bet={settlement.bet}
          winner={settlement.winner}
          state={state}
          pendingAction={pendingAction}
          onClose={() => setSettlement(null)}
          onConfirm={confirmSettlement}
        />
      )}

      <hr className="divider" />
      <div className="section-head">
        <div className="section-label">Transaction History</div>
        <span className="section-count">{transactions.length} records</span>
      </div>
      {transactions.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◇</div>
          <div className="empty-text">No transaction records yet</div>
        </div>
      ) : (
        <div className="history-list">
          {transactions.map((tx) => {
            const bet = state.bets.find((b) => b.id === tx.betId);
            const goal = state.goals.find((g) => g.id === bet?.goalId);
            return <TransactionRow key={tx.id} tx={tx} bet={bet} goal={goal} />;
          })}
        </div>
      )}
    </div>
  );
}
