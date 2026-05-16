// ─── GoalsPage.jsx ────────────────────────────────────────────────────────────
import { useState } from "react";
import { ensName, DeadlineChip, Modal } from "../Constants.jsx";

// ─── Add Goal Modal ───────────────────────────────────────────────────────────
function AddGoalModal({ onClose, onAdd, groups }) {
  const [title, setTitle]           = useState("");
  const [desc,  setDesc]            = useState("");
  const [dl,    setDl]              = useState("");
  const [gid,   setGid]             = useState(groups[0]?.id || "");
  const [openForBets, setOpenForBets] = useState(true);

  const canSubmit = title.trim() && dl;

  return (
    <Modal
      title="Set a Goal"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-amber"
            disabled={!canSubmit}
            onClick={() =>
              onAdd(title.trim(), desc.trim(), new Date(dl).getTime(), gid, openForBets)
            }
          >
            Set Goal
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Goal Title</label>
        <input
          className="input"
          placeholder="Deploy v2 by Friday"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">Description</label>
        <textarea
          className="textarea"
          placeholder="What does success look like?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="input-row">
        <div className="field">
          <label className="label">Deadline</label>
          <input
            className="input"
            type="date"
            value={dl}
            onChange={(e) => setDl(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">Group</label>
          <select
            className="select"
            value={gid}
            onChange={(e) => setGid(e.target.value)}
          >
            {groups.length === 0 && (
              <option value="">No groups yet</option>
            )}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="openForBets"
            checked={openForBets}
            onChange={(e) => setOpenForBets(e.target.checked)}
          />
          <label htmlFor="openForBets" className="checkbox-label">
            Allow friends to bet on this goal
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, account, friends, onMarkComplete, onVerify, onBet, onToggleBetting }) {
  const isOwner   = goal.owner === account;
  const canVerify =
    !isOwner &&
    goal.completedAt &&
    !goal.verified &&
    !goal.verifiedBy.includes(account);
  const betsOn    = goal.openForBets !== false;

  const accentColor =
    goal.completedAt && goal.verified
      ? "sage"
      : goal.completedAt
      ? "amber"
      : "muted";

  return (
    <div className="card">
      <div className={`card-accent ${accentColor}`} />
      <div style={{ paddingLeft: 8 }}>
        <div className="card-row">
          <div className="card-body">
            {/* Title + tags */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <div className="card-title">{goal.title}</div>
              {goal.verified && (
                <span className="tag tag-sage">✓ Verified</span>
              )}
              {goal.completedAt && !goal.verified && (
                <span className="tag tag-amber">Pending verification</span>
              )}
              <span className={`tag ${betsOn ? "tag-amber" : "tag-muted"}`}>
                Bets {betsOn ? "ON" : "OFF"}
              </span>
            </div>

            {/* Meta */}
            <div className="card-meta">
              {isOwner ? "You" : ensName(goal.owner, friends)} ·{" "}
              <DeadlineChip deadline={goal.deadline} />
            </div>

            {goal.description && (
              <div className="card-desc">{goal.description}</div>
            )}
          </div>

          {/* Actions */}
          <div className="card-actions">
            {isOwner && !goal.completedAt && (
              <button
                className="btn btn-sage btn-sm"
                onClick={() => onMarkComplete(goal.id)}
              >
                ✓ Done
              </button>
            )}
            {canVerify && (
              <button
                className="btn btn-amber btn-sm"
                onClick={() => onVerify(goal.id)}
              >
                Verify
              </button>
            )}
            {/* Bet toggle for owner */}
            {isOwner && (
              <button
                className={`btn btn-sm ${betsOn ? "btn-ghost" : "btn-amber"}`}
                onClick={() => onToggleBetting(goal.id)}
              >
                {betsOn ? "Disable Bets" : "Enable Bets"}
              </button>
            )}
            {/* Bet button for anyone when betting is enabled */}
            {betsOn && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onBet(goal.id)}
              >
                Bet
              </button>
            )}
          </div>
        </div>

        {/* Verified-by count */}
        {goal.verifiedBy.length > 0 && (
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            Verified by {goal.verifiedBy.length} member
            {goal.verifiedBy.length > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Goals Page ───────────────────────────────────────────────────────────────
export default function GoalsPage({
  state,
  addGoal,
  markComplete,
  verifyGoal,
  onBet,
  toggleGoalBetting,
}) {
  const [filter,    setFilter]    = useState("all"); // all | mine | verify
  const [showModal, setShowModal] = useState(false);

  const myGoals  = state.goals.filter((g) => g.owner === state.account);
  const toVerify = state.goals.filter(
    (g) =>
      g.owner !== state.account &&
      g.completedAt &&
      !g.verified &&
      !g.verifiedBy.includes(state.account)
  );

  const displayed =
    filter === "mine"   ? myGoals   :
    filter === "verify" ? toVerify  :
    state.goals;

  const doneCount = myGoals.filter((g) => g.completedAt).length;
  const pct = myGoals.length
    ? Math.round((doneCount / myGoals.length) * 100)
    : 0;

  return (
    <div className="page">
      <div className="page-eyebrow">Objectives</div>
      <div className="page-title">Goals</div>
      <div className="page-sub">Set them. Ship them. Get verified.</div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num amber">{myGoals.length}</div>
          <div className="stat-lbl">My Goals</div>
        </div>
        <div className="stat-box">
          <div className="stat-num sage">{doneCount}</div>
          <div className="stat-lbl">Completed</div>
        </div>
        <div className="stat-box">
          <div className="stat-num rose">{toVerify.length}</div>
          <div className="stat-lbl">Need Verify</div>
        </div>
      </div>

      {/* Completion bar (personal) */}
      {myGoals.length > 0 && (
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
              My completion rate
            </span>
            <span
              style={{ fontFamily: "var(--font-display)", fontSize: 20 }}
            >
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
        {[
          ["all",    "All",    null],
          ["mine",   "Mine",   null],
          ["verify", "Verify", toVerify.length || null],
        ].map(([v, l, badge]) => (
          <button
            key={v}
            className={`btn btn-sm ${filter === v ? "btn-ink" : "btn-ghost"}`}
            onClick={() => setFilter(v)}
          >
            {l}
            {badge ? ` (${badge})` : ""}
          </button>
        ))}
        <button
          className="btn btn-amber btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={() => setShowModal(true)}
        >
          + Set Goal
        </button>
      </div>

      {/* ── Goal cards ── */}
      {displayed.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◎</div>
          <div className="empty-text">
            {filter === "verify"
              ? "No goals awaiting your verification"
              : filter === "mine"
              ? "No personal goals yet — set one!"
              : "No goals on-chain yet"}
          </div>
        </div>
      ) : (
        <div className="card-list">
          {displayed.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              account={state.account}
              friends={state.friends}
              onMarkComplete={markComplete}
              onVerify={verifyGoal}
              onBet={onBet}
              onToggleBetting={toggleGoalBetting}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <AddGoalModal
          groups={state.groups}
          onClose={() => setShowModal(false)}
          onAdd={(title, desc, deadline, groupId, openForBets) => {
            addGoal(title, desc, deadline, groupId, openForBets);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
