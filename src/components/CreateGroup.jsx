// ─── GroupsPage.jsx ───────────────────────────────────────────────────────────
import { useState } from "react";
import { initial, short, ensName, Modal } from "../Constants.jsx";

// ─── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [priv, setPriv] = useState(true);

  return (
    <Modal
      title="Create Group"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-ink"
            onClick={() => name && onCreate(name, desc, priv)}
          >
            Create Group
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Group Name</label>
        <input
          className="input"
          placeholder="Builders Sprint"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label">Description</label>
        <textarea
          className="textarea"
          placeholder="What's this group about?"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <div className="field">
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="priv"
            checked={priv}
            onChange={(e) => setPriv(e.target.checked)}
          />
          <label htmlFor="priv" className="checkbox-label">
            🔒 Private group (invite only)
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ─── Invite Member Modal ──────────────────────────────────────────────────────
function InviteMemberModal({ onClose, onInvite, friends, existingMembers }) {
  const available = friends.filter((f) => !existingMembers.includes(f.address));
  const [selected, setSelected] = useState(available[0]?.address || "");

  if (available.length === 0) {
    return (
      <Modal
        title="Invite Member"
        onClose={onClose}
        footer={
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        }
      >
        <div className="empty">
          <div className="empty-icon">◈</div>
          <div className="empty-text">All your friends are already in this group</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Invite Member"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-ink"
            disabled={!selected}
            onClick={() => selected && onInvite(selected)}
          >
            Invite
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Select Friend</label>
        <select
          className="select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {available.map((f) => (
            <option key={f.address} value={f.address}>
              {f.ens}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

// ─── Groups Page ──────────────────────────────────────────────────────────────
export default function GroupsPage({ state, createGroup, inviteToGroup }) {
  const [showModal, setShowModal]   = useState(false);
  const [inviteGroup, setInviteGroup] = useState(null); // group id being invited to

  return (
    <div className="page">
      <div className="page-eyebrow">Community</div>
      <div className="page-title">Groups</div>
      <div className="page-sub">Private circles for shared accountability.</div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num amber">{state.groups.length}</div>
          <div className="stat-lbl">Groups</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">
            {state.groups.reduce((s, g) => s + g.members.length, 0)}
          </div>
          <div className="stat-lbl">Total Members</div>
        </div>
        <div className="stat-box">
          <div className="stat-num sage">
            {state.groups.filter((g) => g.isPrivate).length}
          </div>
          <div className="stat-lbl">Private</div>
        </div>
      </div>

      {/* ── Groups list ── */}
      <div className="section-head">
        <div className="section-label">My Groups</div>
        <button
          className="btn btn-ink btn-sm"
          onClick={() => setShowModal(true)}
        >
          + Create
        </button>
      </div>

      {state.groups.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◉</div>
          <div className="empty-text">No groups yet — create one to get started</div>
        </div>
      ) : (
        <div className="card-list">
          {state.groups.map((g) => {
            const groupGoals = state.goals.filter((gl) => gl.groupId === g.id);
            const done = groupGoals.filter((gl) => gl.completedAt).length;
            const pct = groupGoals.length
              ? Math.round((done / groupGoals.length) * 100)
              : 0;
            const isCreator = g.creator === state.account;

            return (
              <div className="card" key={g.id}>
                <div className="card-accent amber" />
                <div style={{ paddingLeft: 8 }}>
                  {/* Header row */}
                  <div className="card-row">
                    <div className="card-body">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 4,
                        }}
                      >
                        <div className="card-title">{g.name}</div>
                        {g.isPrivate && (
                          <span className="tag tag-muted">🔒 Private</span>
                        )}
                      </div>
                      {g.description && (
                        <div className="card-desc">{g.description}</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="card-actions">
                      {isCreator && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setInviteGroup(g.id)}
                        >
                          + Invite
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members list */}
                  <div
                    style={{
                      margin: "12px 0",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 10,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                        marginBottom: 8,
                      }}
                    >
                      Members ({g.members.length})
                    </div>
                    {g.members.map((m) => {
                      const isMe = m === state.account;
                      const name = isMe
                        ? "You"
                        : ensName(m, state.friends);
                      return (
                        <div
                          key={m}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <div className="avatar avatar-sm">{initial(m)}</div>
                          <span style={{ fontSize: 13, flex: 1 }}>{name}</span>
                          {m === g.creator && (
                            <span className="tag tag-muted" style={{ fontSize: 10 }}>
                              creator
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--muted)",
                        }}
                      >
                        Group goals
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {done}/{groupGoals.length} · {pct}%
                      </span>
                    </div>
                    <div className="progress-wrap">
                      <div
                        className={`progress-fill ${
                          done === groupGoals.length && groupGoals.length > 0
                            ? "done"
                            : ""
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer meta */}
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    Created {new Date(g.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {showModal && (
        <CreateGroupModal
          onClose={() => setShowModal(false)}
          onCreate={(name, desc, priv) => {
            createGroup(name, desc, priv);
            setShowModal(false);
          }}
        />
      )}
      {inviteGroup && (
        <InviteMemberModal
          friends={state.friends}
          existingMembers={
            state.groups.find((g) => g.id === inviteGroup)?.members || []
          }
          onClose={() => setInviteGroup(null)}
          onInvite={(friendAddress) => {
            inviteToGroup(inviteGroup, friendAddress);
            setInviteGroup(null);
          }}
        />
      )}
    </div>
  );
}
