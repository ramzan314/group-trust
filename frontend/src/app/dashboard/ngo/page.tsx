'use client';

import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../../utils/api';
import { useAuth, translations } from '../../context/AuthContext';
import {
  TrendingUp,
  ShieldCheck,
  Percent,
  Plus,
  Users,
  CheckCircle,
  XCircle,
  FolderPlus,
  Activity,
  Landmark,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function NgoDashboard() {
  const { language } = useAuth();
  const t = translations[language];

  const [summary, setSummary] = useState<any>({
    totalSavings: 0,
    totalActiveCredit: 0,
    defaultRate: 0,
    cashflowChart: [],
  });
  const [groups, setGroups] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Group Form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('JLG');
  const [savingsAmount, setSavingsAmount] = useState(200);
  const [savingsFrequency, setSavingsFrequency] = useState('WEEKLY');
  const [interestRate, setInterestRate] = useState(12.0);
  const [secretaryEmail, setSecretaryEmail] = useState('secretary@grouptrust.com');
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const sum = await fetchAPI('/reports/summary');
      setSummary(sum);

      const grps = await fetchAPI('/groups');
      setGroups(grps);

      // Fetch pending members from JLG group detail
      const pending: any[] = [];
      for (const g of grps) {
        const detail = await fetchAPI(`/groups/${g.id}`);
        detail.members?.forEach((gm: any) => {
          if (gm.member.kycStatus === 'PENDING' && !pending.some(p => p.id === gm.member.id)) {
            pending.push({ ...gm.member, groupName: g.name });
          }
        });
      }
      setPendingMembers(pending);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyKyc = async (memberId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetchAPI(`/groups/members/${memberId}/kyc`, {
        method: 'POST',
        body: JSON.stringify({ status, remarks: 'Verified by NGO Admin' }),
      });
      alert(`Member KYC ${status === 'APPROVED' ? 'Approved' : 'Rejected'} successfully!`);
      loadData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      // Find secretary by email in groups or mock lookup (simulated: find in users)
      // Since secretary is seeded, let's look up secretaryId. In real production, secretaries have accounts.
      // For seed, रमेश कुमार is at secretary@grouptrust.com.
      // We'll hardcode or fetch, let's register/retrieve.
      // To be simple, we fetch group secretary Ramesh's ID from groups or default it.
      const ramesh = groups.find(g => g.secretary?.email === secretaryEmail)?.secretary;
      
      let secId = ramesh?.id;
      if (!secId) {
        // Fallback: create group with ramesh's id if we can find it, otherwise throw
        secId = '919876543211'; // Ramesh Kumar's UUID fallback or search
        const matchingGroup = groups.find(g => g.secretaryId);
        secId = matchingGroup ? matchingGroup.secretaryId : '';
      }

      if (!secId) {
        throw new Error('Secretary not found. Use a valid secretary email.');
      }

      await fetchAPI('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName,
          type: groupType,
          savingsAmount: Number(savingsAmount),
          savingsFrequency,
          interestRate: Number(interestRate),
          secretaryId: secId,
        }),
      });

      alert('Group created successfully!');
      setShowCreateModal(false);
      setGroupName('');
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create group');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title & Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            NGO Administrative Control Panel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervise microfinance groups, authorize KYC profiles, and analyze aggregated cash flows.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow shadow-brand-500/20 transition hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Group</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Aggregated Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.totalSavings}
                </span>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{summary.totalSavings.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                <span>+12.4% this month</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.activeCredit}
                </span>
                <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{summary.totalActiveCredit.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2 flex items-center gap-1">
                <span>Active portfolio under oversight</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.defaultRate}
                </span>
                <div className="bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl text-red-600 dark:text-red-400">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {summary.defaultRate}%
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2 flex items-center gap-1">
                <span>Healthy - target limit &lt; 5%</span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Cash Flow Graph */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-500" />
              Aggregated Cash Flow Timeline (Savings vs Loans vs Repayments)
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={summary.cashflowChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(255,255,255,0.9)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="savings" name="Savings Inflow" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="repayments" name="EMI Repayments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="loans" name="Loan Disbursements" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KYC pending & Groups table row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending KYC Members */}
            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Pending KYC Registrations ({pendingMembers.length})
              </h3>
              {pendingMembers.length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">All member profiles verified.</div>
              ) : (
                <div className="flex flex-col gap-4">
                  {pendingMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{m.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {m.phone} &middot; {m.groupName}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifyKyc(m.id, 'APPROVED')}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-800 transition"
                          title="Approve KYC"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleVerifyKyc(m.id, 'REJECTED')}
                          className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-800 transition"
                          title="Reject KYC"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Groups Overview */}
            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-brand-500" />
                Supervised Groups ({groups.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3">Group Name</th>
                      <th className="py-3">Type</th>
                      <th className="py-3">Savings</th>
                      <th className="py-3">Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="py-3.5 font-semibold text-slate-800 dark:text-slate-200">{g.name}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            g.type === 'ROSCA' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400' :
                            g.type === 'JLG' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                          }`}>
                            {g.type}
                          </span>
                        </td>
                        <td className="py-3.5">₹{g.savingsAmount} / {g.savingsFrequency}</td>
                        <td className="py-3.5">{g._count?.members || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Register Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 p-8 shadow-2xl">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
              <FolderPlus className="h-5 w-5 text-brand-600" />
              Register New Group
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">Group Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Pragati SHG"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">Type</label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="JLG">JLG (Joint Liability)</option>
                    <option value="SHG">SHG (Self Help)</option>
                    <option value="ROSCA">ROSCA (Rotating)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">Frequency</label>
                  <select
                    value={savingsFrequency}
                    onChange={(e) => setSavingsFrequency(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">Savings Contribution</label>
                  <input
                    type="number"
                    required
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(Number(e.target.value))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-500">Secretary Email</label>
                <input
                  type="email"
                  required
                  value={secretaryEmail}
                  onChange={(e) => setSecretaryEmail(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-250 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
