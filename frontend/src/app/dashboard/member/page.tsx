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
} from 'lucide-react';

export default function MemberDashboard() {
  const { language, user } = useAuth();
  const t = translations[language];

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [groupLoans, setGroupLoans] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        </>
      )}
    </div>
  );
}
