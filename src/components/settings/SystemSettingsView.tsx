'use client';

import React, { useState, useTransition } from 'react';
import { SystemSettingItem, updateSystemSettingAction } from '@/actions/settings';
import { BranchRecord, createBranchAction, updateBranchAction } from '@/actions/branches';

interface Props {
  initialSettings: SystemSettingItem[];
  initialBranches?: BranchRecord[];
}

export default function SystemSettingsView({ initialSettings, initialBranches = [] }: Props) {
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'BRANCHES'>('CONFIG');
  const [settings, setSettings] = useState<SystemSettingItem[]>(initialSettings);
  const [branches, setBranches] = useState<BranchRecord[]>(initialBranches);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Branch Form State
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchContact, setBranchContact] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleInputChange = (key: string, val: string) => {
    setEditingValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveSetting = (key: string) => {
    const val = editingValues[key];
    if (val === undefined) return;

    startTransition(async () => {
      const res = await updateSystemSettingAction({ key, value: val });
      if (res.success) {
        setSettings((prev) =>
          prev.map((s) => (s.key === key ? { ...s, value: val, updatedAt: new Date().toISOString() } : s))
        );
        showToast(`Setting "${key}" successfully updated.`);
      } else {
        alert(res.error || 'Failed to update setting.');
      }
    });
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) {
      alert('Please fill in both branch name and branch code.');
      return;
    }

    startTransition(async () => {
      const res = await createBranchAction({
        name: branchName.trim(),
        code: branchCode.trim(),
        address: branchAddress.trim() || null,
        contactNumber: branchContact.trim() || null,
        isActive: true,
      });

      if (res.success && res.branch) {
        setBranches((prev) => [...prev, res.branch!]);
        setBranchName('');
        setBranchCode('');
        setBranchAddress('');
        setBranchContact('');
        setIsAddingBranch(false);
        showToast(`Branch "${res.branch.name}" created successfully.`);
      } else {
        alert(res.error || 'Failed to create branch.');
      }
    });
  };

  const handleToggleBranchStatus = (branch: BranchRecord) => {
    startTransition(async () => {
      const res = await updateBranchAction({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        contactNumber: branch.contactNumber,
        isActive: !branch.isActive,
      });

      if (res.success) {
        setBranches((prev) =>
          prev.map((b) => (b.id === branch.id ? { ...b, isActive: !b.isActive } : b))
        );
        showToast(`Branch "${branch.name}" status updated.`);
      } else {
        alert(res.error || 'Failed to update branch status.');
      }
    });
  };

  const categories = Array.from(new Set(settings.map((s) => s.category)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--accent)',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            zIndex: 1000,
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 1.75rem',
          border: '1px solid var(--border-light)',
          borderLeft: '4px solid var(--ns-blue)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚙️</span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                System Configuration &amp; Policies Desk
              </h2>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--ns-blue-pale)',
                  color: 'var(--ns-blue)',
                  border: '1px solid var(--border-blue)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                System Administration
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage operational thresholds, grace periods, penalty schedules, and multi-branch infrastructure.
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setActiveTab('CONFIG')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'CONFIG' ? 'var(--ns-blue)' : 'transparent',
                color: activeTab === 'CONFIG' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              ⚙️ Policies &amp; General
            </button>
            <button
              onClick={() => setActiveTab('BRANCHES')}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: activeTab === 'BRANCHES' ? 'var(--ns-blue)' : 'transparent',
                color: activeTab === 'BRANCHES' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              🏢 Branch Management ({branches.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: System Policies & Configuration */}
      {activeTab === 'CONFIG' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {categories.map((cat) => {
            const catSettings = settings.filter((s) => s.category === cat);

            return (
              <div
                key={cat}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-heading)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>
                      {cat === 'ATTENDANCE' ? '⏰' : cat === 'PENALTY' ? '💰' : cat === 'OPERATIONS' ? '⚡' : '📌'}
                    </span>
                    {cat} Settings
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {catSettings.map((s) => {
                    const currentVal = editingValues[s.key] !== undefined ? editingValues[s.key] : s.value;
                    const isModified = editingValues[s.key] !== undefined && editingValues[s.key] !== s.value;

                    return (
                      <div
                        key={s.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: '1 1 300px' }}>
                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              marginBottom: '0.2rem',
                            }}
                          >
                            {s.key}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {s.description || 'System policy threshold'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleInputChange(s.key, e.target.value)}
                            style={{
                              background: 'var(--bg-input)',
                              border: `1px solid ${isModified ? 'var(--accent)' : 'var(--border-color)'}`,
                              color: 'var(--text-primary)',
                              padding: '0.45rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              minWidth: '180px',
                              fontWeight: 600,
                            }}
                          />

                          {isModified && (
                            <button
                              onClick={() => handleSaveSetting(s.key)}
                              disabled={isPending}
                              style={{
                                padding: '0.45rem 1rem',
                                background: 'var(--accent)',
                                border: 'none',
                                color: '#fff',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Multi-Branch Management */}
      {activeTab === 'BRANCHES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Branch Top Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Netspeak Centers &amp; Branches
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Add new expansion branches, manage existing operational centers, and view branch status.
              </p>
            </div>

            <button
              onClick={() => setIsAddingBranch(!isAddingBranch)}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              {isAddingBranch ? '✕ Cancel' : '+ Add New Branch'}
            </button>
          </div>

          {/* Add Branch Form */}
          {isAddingBranch && (
            <div
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--ns-blue)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🏢 Register New Branch
              </h4>
              <form onSubmit={handleCreateBranch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Branch Name * (e.g. Lucena)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Branch name"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Branch Code * (e.g. LCN)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="3-4 uppercase letters"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Center location / building"
                    value={branchAddress}
                    onChange={(e) => setBranchAddress(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Contact Number
                  </label>
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={branchContact}
                    onChange={(e) => setBranchContact(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingBranch(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {isPending ? 'Creating...' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Branches Table */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-light)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 16px' }}>Branch Name</th>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Address</th>
                  <th style={{ padding: '12px 16px' }}>Contact</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      📍 {b.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0,82,204,0.12)',
                          color: 'var(--ns-blue)',
                          border: '1px solid rgba(0,82,204,0.25)',
                        }}
                      >
                        {b.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {b.address || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {b.contactNumber || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: b.isActive ? 'rgba(63,210,143,0.12)' : 'rgba(229,62,62,0.12)',
                          color: b.isActive ? '#3FD28F' : '#E53E3E',
                          border: `1px solid ${b.isActive ? 'rgba(63,210,143,0.3)' : 'rgba(229,62,62,0.3)'}`,
                        }}
                      >
                        {b.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleBranchStatus(b)}
                        disabled={isPending}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
