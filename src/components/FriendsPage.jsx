// ─── FriendsPage.jsx ──────────────────────────────────────────────────────────
import { useState } from "react";
import { short, initial, Modal } from "../contract/Constants.jsx";

const isAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value || "");

// ─── Send Request Modal ───────────────────────────────────────────────────────
function SendRequestModal({ onClose, onSend }) {
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const canSend = isAddress(addr);

  return (
    <Modal
      title="Send Friend Request"
      onClose={onClose}
      footer={
        <>
          <button
            className="btn btn-ink"
            disabled={!canSend}
            onClick={() => canSend && onSend(addr, name)}
          >
            Send Request
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">Wallet Address</label>
        <input
          className="input"
          placeholder="0x1234..."
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
        />
        {addr && !canSend && (
          <div className="field-hint error">
            Use a full 0x wallet address so bet transactions can go to this person.
          </div>
        )}
      </div>
      <div className="field">
        <label className="label">Display Name (optional)</label>
        <input
          className="input"
          placeholder="alice.eth"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ─── Friends Page ─────────────────────────────────────────────────────────────
export default function FriendsPage({
  state,
  acceptFriendRequest,
  declineRequest,
  sendFriendRequest,
  outgoingRequests,
}) {
  const [showModal, setShowModal] = useState(false);
  const sent = outgoingRequests || [];

  return (
    <div className="page">
      <div className="page-eyebrow">Social</div>
      <div className="page-title">Friends</div>
      <div className="page-sub">Accountability partners on-chain.</div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-num amber">{state.friends.length}</div>
          <div className="stat-lbl">Friends</div>
        </div>
        <div className="stat-box">
          <div className="stat-num rose">{state.pendingRequests.length}</div>
          <div className="stat-lbl">Incoming</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{sent.length}</div>
          <div className="stat-lbl">Sent</div>
        </div>
      </div>

      {/* ── Incoming requests ── */}
      {state.pendingRequests.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-label" style={{ color: "var(--rose)" }}>
              Friend Requests
            </div>
            <span className="tag tag-rose">
              {state.pendingRequests.length} pending
            </span>
          </div>

          <div className="card-list" style={{ marginBottom: 32 }}>
            {state.pendingRequests.map((r) => (
              <div className="card" key={r.address}>
                <div className="card-accent rose" />
                <div className="card-row" style={{ paddingLeft: 8 }}>
                  <div className="card-body">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar">{initial(r.address)}</div>
                      <div>
                        <div className="card-title">{r.ens}</div>
                        <div className="card-meta">{r.address}</div>
                      </div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn btn-sage btn-sm"
                      onClick={() => acceptFriendRequest(r.address, r.ens)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => declineRequest(r.address)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Sent requests ── */}
      {sent.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-label" style={{ color: "var(--amber)" }}>
              Sent Requests
            </div>
            <span className="tag tag-amber">{sent.length} waiting</span>
          </div>

          <div className="card-list" style={{ marginBottom: 32 }}>
            {sent.map((r) => (
              <div className="card" key={r.address}>
                <div className="card-accent amber" />
                <div className="card-row" style={{ paddingLeft: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar">{initial(r.address)}</div>
                    <div>
                      <div className="card-title">{r.ens}</div>
                      <div className="card-meta">{r.address}</div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <span className="tag tag-muted">Pending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Friends list ── */}
      <div className="section-head">
        <div className="section-label">My Friends</div>
        <button
          className="btn btn-ink btn-sm"
          onClick={() => setShowModal(true)}
        >
          + Add
        </button>
      </div>

      {state.friends.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">◈</div>
          <div className="empty-text">No friends yet — send a request</div>
        </div>
      ) : (
        <div className="card-list">
          {state.friends.map((f) => (
            <div className="card" key={f.address}>
              <div className="card-accent muted" />
              <div className="card-row" style={{ paddingLeft: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar">{initial(f.address)}</div>
                  <div>
                    <div className="card-title">{f.ens}</div>
                    <div className="card-meta">{f.address}</div>
                  </div>
                </div>
                <div className="card-actions">
                  <span className="tag tag-muted">
                    Since {new Date(f.since).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <SendRequestModal
          onClose={() => setShowModal(false)}
          onSend={(addr, name) => {
            sendFriendRequest(addr, name);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
