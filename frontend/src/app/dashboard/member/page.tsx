'use client';

import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../../utils/api';
import { useAuth, translations } from '../../context/AuthContext';
import PassbookPDF from '../../../components/PassbookPDF';
import {
  Wallet,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Receipt,
  FileSpreadsheet,
  Vote,
  PlusCircle,
  Users,
  Copy,
  Check,
  X,
  Landmark,
} from 'lucide-react';

export default function MemberDashboard() {
  const { language, user } = useAuth();
  const t = translations[language];

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [groupLoans, setGroupLoans] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Join Group Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  // Stats calculation
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [guarantorAlerts, setGuarantorAlerts] = useState<any[]>([]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Load user transactions
      const txs = await fetchAPI(`/transactions?memberId=${user.id}`);
      setTransactions(txs);

      // Calculate Savings Balance (sum of SAVINGS minus reversed)
      const balance = txs
        .filter((tx: any) => tx.type === 'SAVINGS' && !tx.isReversed)
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);
      setSavingsBalance(balance);

      // Load borrower loans
      const lnList = await fetchAPI(`/loans?borrowerId=${user.id}`);
      setLoans(lnList);

      const activeLns = lnList.filter((l: any) => l.status === 'ACTIVE' || l.status === 'DEFAULTED');
      setActiveLoansCount(activeLns.length);

      // Find user groups
      const grps = await fetchAPI('/groups');
      setGroups(grps);

      if (grps.length > 0) {
        const firstGroupId = grps[0].id;
        // Fetch all loans in group to support peer voting
        const allGroupLoans = await fetchAPI(`/loans?groupId=${firstGroupId}`);
        setGroupLoans(allGroupLoans);

        // Find guarantor alerts (if user is guarantor on any active/defaulted loan not belonging to user)
        const alerts: any[] = [];
        allGroupLoans.forEach((l: any) => {
          if (l.borrowerId !== user.id && (l.status === 'ACTIVE' || l.status === 'DEFAULTED')) {
            const isGuarantor = l.guarantors?.some((g: any) => g.guarantorId === user.id);
            if (isGuarantor && l.status === 'DEFAULTED') {
              alerts.push(l);
            }
          }
        });
        setGuarantorAlerts(alerts);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleVote = async (loanId: string, vote: 'APPROVE' | 'REJECT') => {
    try {
      await fetchAPI(`/loans/${loanId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vote }),
      });
      alert(`Vote logged successfully!`);
      loadData();
    } catch (err: any) {
      alert(`Voting failed: ${err.message}`);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = joinGroupId.trim();
    if (!cleanId) return;

    setJoinError('');
    setJoinLoading(true);
    try {
      const res = await fetchAPI('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ groupId: cleanId }),
      });

      alert(res.message || 'Successfully joined group!');
      setJoinGroupId('');
      setShowJoinModal(false);
      loadData();
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join group. Please check the Group ID.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedGroupId(id);
    setTimeout(() => setCopiedGroupId(null), 2500);
  };

  // Build spoken message for Voice Assistant widget
  const getSpeechReadoutText = () => {
    if (language === 'hi') {
      return `आपका बचत शेष ₹${savingsBalance} है। आपके पास ${
        activeLoansCount > 0 ? `${activeLoansCount} सक्रिय ऋण है।` : 'कोई सक्रिय ऋण नहीं है।'
      } ${guarantorAlerts.length > 0 ? 'चेतावनी: आप एक डिफॉल्ट ऋण के जामिनदार हैं।' : ''}`;
    }
    return `Your savings balance is ₹${savingsBalance}. You have ${
      activeLoansCount > 0
        ? `${activeLoansCount} active loan${activeLoansCount > 1 ? 's' : ''}.`
        : 'no active loans.'
    } ${guarantorAlerts.length > 0 ? 'Warning: You are a guarantor on a defaulted loan.' : ''}`;
  };

  const pendingPeerLoans = groupLoans.filter(
    (l: any) => l.status === 'PENDING_APPROVAL' && l.borrowerId !== user?.id
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Title Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Digital Passbook Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track individual savings progress, manage credit obligations, and vote on community applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setJoinError('');
              setShowJoinModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Join Group with ID</span>
          </button>
          {!loading && transactions.length > 0 && (
            <PassbookPDF
              elementId="passbook-print-section"
              filename={`${user?.name.replace(/\s+/g, '_')}_passbook.pdf`}
              label="Export Passbook Statement"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Joint Liability Group Guarantor Alerts */}
          {guarantorAlerts.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <span className="font-bold">Joint Liability Alert:</span> You are registered as a guarantor on a defaulted loan of ₹
                {guarantorAlerts[0].principal.toLocaleString('en-IN')} for member{' '}
                <span className="font-bold">{guarantorAlerts[0].borrower?.name}</span>. Please coordinate with your group secretary.
              </div>
            </div>
          )}

          {/* Member Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.savings}
                </span>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{savingsBalance.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Required contribution: ₹{groups[0]?.savingsAmount || 200} / {groups[0]?.savingsFrequency || 'WEEKLY'}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.loans}
                </span>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-600 dark:text-purple-400">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {activeLoansCount} Active
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {loans.some((l) => l.status === 'ACTIVE')
                  ? `EMI Due: ₹${loans.find((l) => l.status === 'ACTIVE')?.emiAmount.toLocaleString('en-IN')}/mo`
                  : 'No repayments pending'}
              </div>
            </div>
          </div>

          {/* My Enrolled Community Groups */}
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Landmark className="h-5 w-5 text-brand-600" />
                  My Enrolled Community Groups ({groups.length})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Groups you are currently participating in with your savings & credit circles.
                </p>
              </div>
              <button
                onClick={() => {
                  setJoinError('');
                  setShowJoinModal(true);
                }}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 shrink-0"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Join Another Group</span>
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center flex flex-col items-center gap-3">
                <Landmark className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                <div className="text-base font-bold text-slate-800 dark:text-slate-100">
                  You have not joined any community group yet
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Obtain the Group ID from your community Secretary or NGO leader and enter it to join a SHG, JLG, or ROSCA savings circle.
                </p>
                <button
                  onClick={() => {
                    setJoinError('');
                    setShowJoinModal(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 shadow transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Enter Group ID to Join</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {g.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
                          {g.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5">
                        Secretary: <span className="font-semibold text-slate-700 dark:text-slate-300">{g.secretary?.name || 'Assigned Leader'}</span>
                        {g.secretary?.phone && ` &middot; ${g.secretary.phone}`}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-slate-800 text-xs">
                      <div className="text-slate-600 dark:text-slate-400">
                        Rule: <span className="font-bold text-slate-900 dark:text-white">₹{g.savingsAmount}</span> / {g.savingsFrequency}
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[130px]" title={g.id}>
                          {g.id}
                        </span>
                        <button
                          onClick={() => handleCopyId(g.id)}
                          title="Copy Group ID"
                          className="text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition"
                        >
                          {copiedGroupId === g.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Voting Portal for Peer Loans */}
          {pendingPeerLoans.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Vote className="h-5 w-5 text-indigo-500" />
                Community Loan Approval Voting
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                As a member of a Joint Liability Group (JLG) or SHG, you have democratic voting rights to approve or reject peer loan requests.
              </p>

              <div className="flex flex-col gap-4">
                {pendingPeerLoans.map((l) => {
                  const hasVoted = l.votes?.find((v: any) => v.memberId === user.id);
                  return (
                    <div
                      key={l.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-4"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {l.borrower?.name} &middot; ₹{l.principal.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Purpose: {l.purpose} &middot; Duration: {l.durationMonths} months
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasVoted ? (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            hasVoted.vote === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            Voted: {hasVoted.vote}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleVote(l.id, 'APPROVE')}
                              className="flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 text-xs font-bold transition"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleVote(l.id, 'REJECT')}
                              className="flex items-center gap-1 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 text-xs font-bold transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Printable Digital Passbook Logs */}
          <div
            id="passbook-print-section"
            className="p-8 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-6 mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Receipt className="h-5 w-5 text-brand-600" />
                  Digital Passbook Ledger
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Immutable record of contributions, loan payments, and distributions.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">ID: {user.id.slice(0, 8)}</div>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-400">No transaction logs recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3">Receipt No</th>
                      <th className="py-3">Date</th>
                      <th className="py-3">Details</th>
                      <th className="py-3">Payment Mode</th>
                      <th className="py-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="py-3.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {tx.receiptNumber}
                        </td>
                        <td className="py-3.5 text-xs">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{tx.type}</span>
                            {tx.isReversed && (
                              <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">
                                REVERSED
                              </span>
                            )}
                          </div>
                          {tx.remarks && <div className="text-xs text-slate-400 mt-0.5">{tx.remarks}</div>}
                        </td>
                        <td className="py-3.5 text-xs font-semibold">{tx.paymentMethod}</td>
                        <td className={`py-3.5 text-right font-extrabold ${
                          tx.amount < 0 || tx.type === 'LOAN_DISBURSEMENT' || tx.type === 'ROSCA_PAYOUT'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-[10px] text-slate-400">
              <div>Cryptographic Verification Hash Chain: Enabled</div>
              <div>Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Join Group Modal */}
          {showJoinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Join a Community Group
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter the unique Group ID given to you by your Group Secretary.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {joinError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                    {joinError}
                  </div>
                )}

                <form onSubmit={handleJoinGroup} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Group ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={joinGroupId}
                      onChange={(e) => setJoinGroupId(e.target.value)}
                      placeholder="e.g. a90cb93d-3f04-4248-837e-3d0cda59ca60"
                      className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={joinLoading || !joinGroupId.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow"
                    >
                      {joinLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                      <span>Join Group</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
