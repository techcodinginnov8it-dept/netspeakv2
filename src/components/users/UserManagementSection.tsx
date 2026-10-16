'use client';

import React, { useActionState, useRef, useState, useTransition } from 'react';
import { createUserAction, toggleUserStatusAction, updateUserBranchAction, UserActionState } from '@/actions/users';
import { BRANCH_NAMES } from '@/lib/branches';

const initialState: UserActionState = {};

const STAFF_ROLES = ['ADMIN', 'IT'];

interface RoleOption {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  userRoles: { role: { name: string } }[];
  staffProfile: { branch: string; roleType: string } | null;
}

function BranchEditor({
  userId,
  currentBranch,
  hasBadBranch,
  canUpdate,
  onBranchUpdated,
}: {
  userId: string;
  currentBranch: string | undefined;
  hasBadBranch: boolean;
  canUpdate: boolean;
  onBranchUpdated?: (newBranch: string) => void;
}) {
  const [branch, setBranch] = useState(
    currentBranch && BRANCH_NAMES.includes(currentBranch) ? currentBranch : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  async function saveBranch() {
    if (!branch || branch === currentBranch) return;
    setIsSaving(true);
    setError(null);
    setSavedSuccess(false);
    const result = await updateUserBranchAction(userId, branch);
    setIsSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSavedSuccess(true);
      onBranchUpdated?.(branch);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  }

  if (!canUpdate) {
    return <span>{hasBadBranch ? 'Unassigned' : currentBranch || '—'}</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <select
        aria-label="Branch assignment"
        value={branch}
        onChange={(e) => {
          setBranch(e.target.value);
          setError(null);
        }}
        className="input"
        style={{
          padding: '0.35rem 0.6rem',
          fontSize: '0.8rem',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="" disabled>Assign branch...</option>
        {BRANCH_NAMES.map((branchName) => (
          <option key={branchName} value={branchName}>
            {branchName}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={saveBranch}
        disabled={isSaving || !branch || branch === currentBranch}
        className="btn btn-secondary"
        style={{
          padding: '0.35rem 0.65rem',
          fontSize: '0.75rem',
          opacity: isSaving || !branch || branch === currentBranch ? 0.6 : 1,
          cursor: isSaving || !branch || branch === currentBranch ? 'not-allowed' : 'pointer',
        }}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>
      {savedSuccess && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>✓ Saved</span>
      )}
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }} title={error}>
          Error: {error}
        </span>
      )}
    </div>
  );
}

export default function UserManagementSection({
  users,
  roles,
  canCreate,
  canToggle,
  currentUserId,
}: {
  users: UserItem[];
  roles: RoleOption[];
  canCreate: boolean;
  canToggle: boolean;
  currentUserId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [userList, setUserList] = useState<UserItem[]>(users);
  const [selectedRole, setSelectedRole] = useState(roles[0]?.name || '');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const showBranchField = STAFF_ROLES.includes(selectedRole);

  const [state, formAction, isPending] = useActionState(async (prev: UserActionState | null, formData: FormData) => {
    const res = await createUserAction(prev, formData);
    if (res.success) {
      if (formRef.current) {
        formRef.current.reset();
        setSelectedRole(roles[0]?.name || '');
      }
      // Re-fetch / reload or optimistically add user
      window.location.reload();
    }
    return res;
  }, initialState);

  async function handleToggleStatus(user: UserItem) {
    setTogglingId(user.id);
    const res = await toggleUserStatusAction(user.id);
    setTogglingId(null);
    if (!res.error) {
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    }
  }

  function handleBranchUpdated(userId: string, newBranch: string) {
    setUserList((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              staffProfile: u.staffProfile ? { ...u.staffProfile, branch: newBranch } : { branch: newBranch, roleType: 'ADMIN' },
            }
          : u
      )
    );
  }

  return (
    <section id="user-management" style={{ marginTop: '2.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          User & Access Management
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Manage system user accounts, activation status, and role assignments.
        </p>
      </div>

      {canCreate && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Create New Account
          </h3>

          {state?.error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {state.error}
            </div>
          )}

          {state?.success && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-success-bg)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-success)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            >
              {state.success}
            </div>
          )}

          <form ref={formRef} action={formAction}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Username
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="e.g. janedoe"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. jane@netspeak.com"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Initial Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Role Assignment
                </label>
                <select
                  name="roleName"
                  required
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {showBranchField && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Branch Assignment <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <select
                    name="branch"
                    required
                    defaultValue=""
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.8rem',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  >
                    <option value="" disabled>Select branch…</option>
                    {BRANCH_NAMES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    This admin will only see data from the selected branch.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '0.6rem 1.25rem',
                background: isPending ? 'var(--text-dim)' : 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              {isPending ? 'Creating User...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>User</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Username</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Branch</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((u) => {
              const roleNames = u.userRoles.map((ur) => ur.role.name).join(', ') || 'NONE';
              const isSelf = u.id === currentUserId;
              const isStaff = u.userRoles.some((ur) => STAFF_ROLES.includes(ur.role.name));
              const currentBranch = u.staffProfile?.branch;
              const hasBadBranch = isStaff && (!currentBranch || currentBranch === 'Main Branch');
              const isToggling = togglingId === u.id;

              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--color-primary)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        fontWeight: 600,
                      }}
                    >
                      {roleNames}
                    </span>
                  </td>
                  {/* Branch column */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {isStaff ? (
                      <BranchEditor
                        userId={u.id}
                        currentBranch={currentBranch}
                        hasBadBranch={hasBadBranch}
                        canUpdate={canToggle}
                        onBranchUpdated={(newBranch) => handleBranchUpdated(u.id, newBranch)}
                      />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: u.isActive ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                        color: u.isActive ? 'var(--color-success)' : 'var(--color-danger)',
                        border: `1px solid ${u.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {canToggle && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isToggling}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: u.isActive ? 'var(--color-danger)' : 'var(--color-success)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: isToggling ? 'not-allowed' : 'pointer',
                          opacity: isToggling ? 0.6 : 1,
                        }}
                      >
                        {isToggling ? 'Updating...' : u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {isSelf && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Current User
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
