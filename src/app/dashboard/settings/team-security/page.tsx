"use client";

import { useEffect, useState } from "react";

type TeamUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

type SessionRow = {
  id: string;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
};

type AuditRow = {
  id: string | number;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  actorUserId: number | null;
};

type AuthPolicy = {
  googleLoginRequired: boolean;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export default function TeamSecurityPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<AuthPolicy>({ googleLoginRequired: false });
  const [canEditPolicy, setCanEditPolicy] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const permissionDenied = (error || "").toLowerCase().includes("forbidden");

  const loadPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const [teamRes, sessionsRes, auditRes, policyRes] = await Promise.all([
        fetch("/api/tenant/team", { credentials: "include", cache: "no-store" }),
        fetch("/api/tenant/security/sessions", {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/tenant/audit", { credentials: "include", cache: "no-store" }),
        fetch("/api/tenant/security/auth-policy", { credentials: "include", cache: "no-store" }),
      ]);

      const [teamData, sessionsData, auditData, policyData] = await Promise.all([
        readJsonSafe(teamRes),
        readJsonSafe(sessionsRes),
        readJsonSafe(auditRes),
        readJsonSafe(policyRes),
      ]);

      if (!teamRes.ok || !teamData.success) {
        throw new Error(teamData.error || "Failed to load team");
      }
      if (!sessionsRes.ok || !sessionsData.success) {
        throw new Error(sessionsData.error || "Failed to load sessions");
      }

      setUsers(teamData.users || []);
      setInvitations(teamData.invitations || []);
      setSessions(sessionsData.sessions || []);
      setAudit(auditData.success ? auditData.logs || [] : []);
      if (policyRes.ok && policyData.success) {
        setPolicy({
          googleLoginRequired: Boolean(policyData.policy?.googleLoginRequired),
        });
        setCanEditPolicy(Boolean(policyData.canEdit));
      } else {
        setPolicy({ googleLoginRequired: false });
        setCanEditPolicy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthPolicySave = async () => {
    try {
      setPolicyLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/security/auth-policy", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleLoginRequired: policy.googleLoginRequired,
        }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update authentication policy");
      }

      setPolicy({
        googleLoginRequired: Boolean(data.policy?.googleLoginRequired),
      });
      setMessage("Authentication policy updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy");
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const handleInvite = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/team/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create invitation");
      }

      setMessage(
        data.emailSent === false
          ? `Invite created for ${data.invitation.email}, but email delivery failed.`
          : `Invite created for ${data.invitation.email}`
      );
      if (data.emailSent === false && data.warning) {
        setError(String(data.warning));
      }
      setInviteEmail("");
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: number, role: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/team/role", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Role update failed");
      }

      setMessage("Role updated successfully.");
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (userId: number, status: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/team/status", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Status update failed");
      }

	      setMessage("User status updated.");
	      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/security/sessions/revoke", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Session revoke failed");
      }

      setMessage("Session revoked.");
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session revoke failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/tenant/security/sessions/revoke-all", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeCurrent: false }),
      });
      const data = await readJsonSafe(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Revoke all failed");
      }

      setMessage(`${data.count} sessions revoked.`);
      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke all failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading team and security settings...</p>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Team and Security</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure tenant-level user access and workspace protection settings.
          </p>
        </div>

        {(message || error) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {message && <p className="text-sm text-green-700">{message}</p>}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        )}

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-amber-900">Access Restricted</h2>
          <p className="mt-2 text-sm text-amber-800">
            Only <b>owner</b> and <b>admin</b> users can open Team and Security settings.
            Please login with an admin account.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Team and Security</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure tenant-level user access and workspace protection settings.
        </p>
      </div>

      {(message || error) && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Authentication Policy</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enable Google-only login for this tenant. When enabled, password login is blocked for all users in this workspace.
        </p>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={policy.googleLoginRequired}
            onChange={(e) =>
              setPolicy((prev) => ({
                ...prev,
                googleLoginRequired: e.target.checked,
              }))
            }
            disabled={!canEditPolicy || policyLoading}
          />
          Require Google Sign-In (disable password login)
        </label>
        <div className="mt-3">
          <button
            onClick={handleAuthPolicySave}
            disabled={!canEditPolicy || policyLoading}
            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {policyLoading ? "Saving..." : "Save Auth Policy"}
          </button>
        </div>
        {!canEditPolicy && (
          <p className="mt-2 text-xs text-gray-500">Only owner can update authentication policy.</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_150px]">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="member@company.com"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="admin">admin</option>
            <option value="member">member</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={actionLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Send Invite
          </button>
        </div>
      </section>

	      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
	        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Last Login</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-gray-900">{user.name || "Unnamed user"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                      disabled={actionLoading || user.role === "owner"}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-xs text-gray-600">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                  </td>
	                  <td className="py-3 pr-3">
	                    <button
	                      onClick={() =>
	                        handleStatusUpdate(
	                          user.id,
	                          user.status === "active" ? "suspended" : "active"
	                        )
	                      }
	                      disabled={actionLoading}
	                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
	                    >
	                      {user.status === "active" ? "Revoke Access" : "Restore Access"}
	                    </button>
	                  </td>
	                </tr>
	              ))}
	            </tbody>
	          </table>
	        </div>
	      </section>

	      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
	        <h2 className="text-lg font-semibold text-gray-900">Invitation Activity</h2>
	        <div className="mt-4 overflow-x-auto">
	          <table className="w-full min-w-[620px] text-sm">
	            <thead>
	              <tr className="border-b text-left text-gray-600">
	                <th className="py-2 pr-3">Email</th>
	                <th className="py-2 pr-3">Role</th>
	                <th className="py-2 pr-3">Status</th>
	                <th className="py-2 pr-3">Activity</th>
	                <th className="py-2 pr-3">Created</th>
	              </tr>
	            </thead>
	            <tbody>
	              {invitations.map((invite) => (
	                <tr key={invite.id} className="border-b">
	                  <td className="py-3 pr-3">{invite.email}</td>
	                  <td className="py-3 pr-3">{invite.role}</td>
	                  <td className="py-3 pr-3">
	                    <span
	                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
	                        invite.status === "accepted"
	                          ? "bg-emerald-100 text-emerald-700"
	                          : "bg-yellow-100 text-yellow-700"
	                      }`}
	                    >
	                      {invite.status === "accepted" ? "joined" : "pending"}
	                    </span>
	                  </td>
	                  <td className="py-3 pr-3">
	                    {invite.status === "accepted" && invite.acceptedAt
	                      ? `Joined: ${new Date(invite.acceptedAt).toLocaleString()}`
	                      : `Expires: ${new Date(invite.expiresAt).toLocaleString()}`}
	                  </td>
	                  <td className="py-3 pr-3">
	                    {new Date(invite.createdAt).toLocaleString()}
	                  </td>
	                </tr>
	              ))}
	              {invitations.length === 0 && (
	                <tr>
	                  <td colSpan={5} className="py-3 text-sm text-gray-500">
	                    No invitations yet.
	                  </td>
	                </tr>
	              )}
	            </tbody>
	          </table>
	        </div>
	      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
          <button
            onClick={handleRevokeAll}
            disabled={actionLoading}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Revoke Others
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Agent</th>
                <th className="py-2 pr-3">Last Seen</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-gray-900">
                      {session.userName || `User #${session.userId}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.userEmail || "No email"}
                      {session.current ? " (current)" : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3 text-xs">{session.ip || "-"}</td>
                  <td className="py-3 pr-3 text-xs text-gray-600">
                    {session.userAgent?.slice(0, 55) || "-"}
                  </td>
                  <td className="py-3 pr-3 text-xs text-gray-600">
                    {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : "-"}
                  </td>
                  <td className="py-3 pr-3 text-xs text-gray-600">
                    {new Date(session.expiresAt).toLocaleString()}
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={actionLoading || session.current}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      {session.current ? "Current" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Audit Activity</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {audit.slice(0, 10).map((row) => (
            <li key={String(row.id)} className="rounded-lg bg-gray-50 px-3 py-2">
              <span className="font-medium text-gray-900">{row.action}</span>
              <span className="text-gray-600"> on {row.entity}</span>
              <span className="text-gray-500">
                {" "}
                ({new Date(row.createdAt).toLocaleString()})
              </span>
            </li>
          ))}
          {audit.length === 0 && (
            <li className="rounded-lg bg-gray-50 px-3 py-2 text-gray-500">
              No audit activity yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
