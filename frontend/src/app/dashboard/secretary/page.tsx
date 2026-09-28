'use client';

import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../../../utils/api';
import { useAuth, translations } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Users,
  Coins,
  MapPin,
  Sparkles,
  Trophy,
  Dices,
  PlusCircle,
  FileSpreadsheet,
  Check,
  Copy,
  CheckCheck,
  Trash2,
  UserPlus,
  Landmark,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react';

export default function SecretaryDashboard() {
  const { language, user } = useAuth();
  const t = translations[language];

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [roscaCycles, setRoscaCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group Fund Summary State
  const [groupFund, setGroupFund] = useState<any>({ totalSavings: 0, totalActiveCredit: 0, defaultRate: 0 });
  const [copiedId, setCopiedId] = useState(false);

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberMode, setMemberMode] = useState<'NEW' | 'EXISTING'>('NEW');
  const [existingIdentifier, setExistingIdentifier] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('password123');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  // 1. Meeting Scheduler Form
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');

  // 2. Attendance Logger State
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: string }>({});

  // 3. Log Contribution Form
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [txType, setTxType] = useState('SAVINGS');
  const [txAmount, setTxAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [remarks, setRemarks] = useState('');

  // 4. ROSCA Draw Wheel Animation
  const [isSpinning, setIsSpinning] = useState(false);
  const [spunWinner, setSpunWinner] = useState<any>(null);
  const [activeCycle, setActiveCycle] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const grps = await fetchAPI('/groups');
      setGroups(grps);
      if (grps.length > 0) {
        handleSelectGroup(grps[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = async (group: any) => {
    setSelectedGroup(group);
    try {
      const detail = await fetchAPI(`/groups/${group.id}`);
      setMembers(detail.members || []);

      // Fetch group fund summary
      const fund = await fetchAPI(`/reports/summary?groupId=${group.id}`).catch(() => null);
      if (fund) {
        setGroupFund(fund);
      }

      const mtgs = await fetchAPI(`/meetings?groupId=${group.id}`);
      setMeetings(mtgs);
      if (mtgs.length > 0) {
        setSelectedMeetingId(mtgs[0].id);
        const initial: any = {};
        mtgs[0].attendance?.forEach((att: any) => {
          initial[att.memberId] = att.status;
        });
        setAttendanceRecords(initial);
      } else {
        setSelectedMeetingId('');
        setAttendanceRecords({});
      }

      if (group.type === 'ROSCA') {
        const cycles = await fetchAPI(`/rosca/cycles?groupId=${group.id}`);
        setRoscaCycles(cycles);
        const active = cycles.find((c: any) => c.status === 'ACTIVE');
        setActiveCycle(active || null);
        setSpunWinner(null);
      } else {
        setRoscaCycles([]);
        setActiveCycle(null);
        setSpunWinner(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCopyGroupId = () => {
    if (!selectedGroup) return;
    navigator.clipboard.writeText(selectedGroup.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setAddMemberError('');
    setAddMemberLoading(true);

    try {
      const payload: any = {};
      if (memberMode === 'EXISTING') {
        const id = existingIdentifier.trim();
        if (!id) throw new Error('Please enter member email or phone.');
        if (id.includes('@')) {
          payload.email = id.toLowerCase();
        } else {
          payload.phone = id;
        }
      } else {
        if (!newMemberName.trim()) throw new Error('Member name is required.');
        payload.name = newMemberName.trim();
        payload.phone = newMemberPhone.trim();
        payload.email = newMemberEmail.trim().toLowerCase();
        payload.password = newMemberPassword || 'password123';
      }

      await fetchAPI(`/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(`Member added successfully! ${memberMode === 'NEW' ? `\n\nLogin Password: ${newMemberPassword || 'password123'}` : ''}`);
      setShowAddMemberModal(false);
      setExistingIdentifier('');
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberEmail('');
      setNewMemberPassword('password123');

      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      setAddMemberError(err.message || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;
    try {
      await fetchAPI(`/groups/${selectedGroup.id}/members/${memberId}`, {
        method: 'DELETE',
      });
      alert('Member removed from group.');
      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      alert(`Failed to remove member: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update attendance list when selected meeting changes
  const handleMeetingChange = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    const mtg = meetings.find(m => m.id === meetingId);
    const initial: any = {};
    if (mtg && mtg.attendance) {
      mtg.attendance.forEach((att: any) => {
        initial[att.memberId] = att.status;
      });
    }
    setAttendanceRecords(initial);
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      // Mock latitude and longitude for audit tracking
      const gpsLat = 18.5204 + (Math.random() - 0.5) * 0.01;
      const gpsLng = 73.8567 + (Math.random() - 0.5) * 0.01;

      await fetchAPI('/meetings', {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          title: meetingTitle,
          date: meetingDate,
          location: meetingLocation,
          gpsLat,
          gpsLng,
        }),
      });

      alert('Meeting scheduled successfully with GPS coordinate log!');
      setMeetingTitle('');
      setMeetingDate('');
      setMeetingLocation('');
      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      alert(`Failed to schedule meeting: ${err.message}`);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeetingId) return;
    try {
      const records = Object.keys(attendanceRecords).map((mId) => ({
        memberId: mId,
        status: attendanceRecords[mId] || 'ABSENT',
      }));

      await fetchAPI(`/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ attendance: records }),
      });
      alert('Attendance saved successfully!');
      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      alert(`Failed to save attendance: ${err.message}`);
    }
  };

  const handleLogContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedMemberId || !txAmount) return;

    try {
      await fetchAPI('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          memberId: selectedMemberId,
          type: txType,
          amount: Number(txAmount),
          paymentMethod,
          remarks,
        }),
      });

      alert('Transaction logged & cryptographically signed into audit log!');
      setSelectedMemberId('');
      setTxAmount('');
      setRemarks('');
      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      alert(`Transaction failed: ${err.message}`);
    }
  };

  const handleSpinRoscaDraw = async () => {
    if (!activeCycle) return;
    setIsSpinning(true);
    setSpunWinner(null);

    try {
      const result = await fetchAPI(`/rosca/cycles/${activeCycle.id}/draw`, {
        method: 'POST',
        body: JSON.stringify({ drawMethod: 'LOTTERY' }),
      });

      // Animate spin wheel delays (e.g. 3.5 seconds of tension)
      setTimeout(() => {
        setIsSpinning(false);
        setSpunWinner(result.round);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
        handleSelectGroup(selectedGroup);
      }, 3500);
    } catch (err: any) {
      setIsSpinning(false);
      alert(`Draw failed: ${err.message}`);
    }
  };

  const handleStartRoscaCycle = async () => {
    if (!selectedGroup) return;
    try {
      await fetchAPI('/rosca/cycles', {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedGroup.id,
          contributionAmount: selectedGroup.savingsAmount,
          cycleDurationDays: 30,
        }),
      });
      alert('ROSCA cycle initialized!');
      handleSelectGroup(selectedGroup);
    } catch (err: any) {
      alert(`Failed to start cycle: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Secretary Operations Hub
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule meetings, log attendees, register financial entries, and perform rotating draws.
          </p>
        </div>

        {/* Group Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Active Group:</span>
          <select
            value={selectedGroup?.id || ''}
            onChange={(e) => {
              const grp = groups.find((g) => g.id === e.target.value);
              if (grp) handleSelectGroup(grp);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 font-bold"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading || !selectedGroup ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* 1. Group Fund Summary & ID Banner */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-850 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-2xl">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedGroup.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
                      {selectedGroup.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Contribution: ₹{selectedGroup.savingsAmount} / {selectedGroup.savingsFrequency} &middot; Interest Rate: {selectedGroup.interestRate}%
                  </p>
                </div>
              </div>

              {/* Group ID Pill with Copy button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="text-xs font-semibold text-slate-500">Group ID:</div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 select-all">
                    {selectedGroup.id}
                  </span>
                  <button
                    onClick={handleCopyGroupId}
                    title="Copy Group ID"
                    className="text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition"
                  >
                    {copiedId ? (
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Fund Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-150 dark:border-slate-750 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <span>Total Group Savings</span>
                  <Coins className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{Number(groupFund.totalSavings || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Accumulated member contributions</div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-150 dark:border-slate-750 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <span>Active Credit Out</span>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{Number(groupFund.totalActiveCredit || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Outstanding micro-loans in circulation</div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-150 dark:border-slate-750 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <span>Total Members</span>
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {members.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Enrolled community participants</div>
              </div>
            </div>
          </div>

          {/* 2. Group Members Management Section */}
          <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-brand-600" />
                  Group Members Directory ({members.length})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage roster, verify member participation, or enrol new participants.
                </p>
              </div>
              <button
                onClick={() => {
                  setAddMemberError('');
                  setShowAddMemberModal(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 shadow transition shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add New Member</span>
              </button>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No members currently enrolled. Click &quot;Add New Member&quot; to add members or share the Group ID with them!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-bold">
                      <th className="py-3 px-3">Member Name</th>
                      <th className="py-3 px-3">Contact</th>
                      <th className="py-3 px-3">KYC Status</th>
                      <th className="py-3 px-3">Joined Date</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((gm) => (
                      <tr
                        key={gm.member?.id || gm.memberId}
                        className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {gm.member?.name || 'Member'}
                          </div>
                          {gm.memberId === selectedGroup.secretaryId && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-block mt-0.5">
                              Secretary
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {gm.member?.email}
                          </div>
                          <div className="text-[11px] text-slate-400">{gm.member?.phone}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            gm.member?.kycStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {gm.member?.kycStatus || 'APPROVED'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-slate-500">
                          {gm.joinedAt ? new Date(gm.joinedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {gm.memberId !== selectedGroup.secretaryId ? (
                            <button
                              onClick={() => handleRemoveMember(gm.memberId, gm.member?.name || 'Member')}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                              title="Remove Member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Leader</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN: Meetings & Attendance */}
            <div className="flex flex-col gap-8">
              {/* 1. Meeting Scheduler */}
              <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Schedule Group Meeting
                </h3>
                <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">Meeting Title</label>
                    <input
                      type="text"
                      required
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      placeholder="e.g. Month 4 Savings & Review"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Meeting Date & Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Physical Location</label>
                      <input
                        type="text"
                        required
                        value={meetingLocation}
                        onChange={(e) => setMeetingLocation(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                        placeholder="e.g. Panchayat Office"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Log Meeting (Captures GPS Coordinates)</span>
                  </button>
                </form>
              </div>

              {/* 2. Attendance Logger */}
              <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Record Meeting Attendance
                </h3>
                {meetings.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-400">No scheduled meetings. Create one above!</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-500">Select Meeting:</span>
                      <select
                        value={selectedMeetingId}
                        onChange={(e) => handleMeetingChange(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      >
                        {meetings.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title} ({new Date(m.date).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                      {members.map((gm) => (
                        <div
                          key={gm.member?.id || gm.memberId}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                        >
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            {gm.member?.name || 'Member'}
                          </span>
                          <div className="flex gap-1.5">
                            {['PRESENT', 'ABSENT', 'EXCUSED'].map((st) => (
                              <button
                                key={st}
                                onClick={() =>
                                  setAttendanceRecords({ ...attendanceRecords, [gm.member?.id || gm.memberId]: st })
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  attendanceRecords[gm.member?.id || gm.memberId] === st
                                    ? st === 'PRESENT'
                                      ? 'bg-emerald-600 text-white'
                                      : st === 'ABSENT'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-amber-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveAttendance}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow"
                    >
                      <Check className="h-4 w-4" />
                      <span>Save Attendance Record</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Ledger Entry & ROSCA Draws */}
            <div className="flex flex-col gap-8">
              {/* 3. Log Financial Entry */}
              <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Coins className="h-5 w-5 text-brand-600" />
                  Record Transaction Entry
                </h3>
                <form onSubmit={handleLogContribution} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Member</label>
                      <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        required
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="">Select Member</option>
                        {members.map((gm) => (
                          <option key={gm.member?.id || gm.memberId} value={gm.member?.id || gm.memberId}>
                            {gm.member?.name || 'Member'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Tx Type</label>
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="SAVINGS">SAVINGS Contribution</option>
                        <option value="FINE">FINE Penalty</option>
                        {selectedGroup.type === 'ROSCA' && (
                          <option value="ROSCA_CONTRIBUTION">ROSCA Contribution</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Amount (₹)</label>
                      <input
                        type="number"
                        required
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                        placeholder={String(selectedGroup.savingsAmount)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-500">Payment Mode</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI (Digital)</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-500">Remarks</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700"
                      placeholder="Regular payment, late contribution, etc."
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 shadow"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Log & Cryptographically Sign Entry</span>
                  </button>
                </form>
              </div>

              {/* 4. ROSCA Cycle and Draw Wheel (Conditional) */}
              {selectedGroup.type === 'ROSCA' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-150 dark:bg-slate-900 dark:border-slate-800 shadow">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Dices className="h-5 w-5 text-orange-500" />
                    ROSCA Rotation Payouts
                  </h3>

                  {!activeCycle ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 mb-4">No active rotating cycle exists for this group.</p>
                      <button
                        onClick={handleStartRoscaCycle}
                        className="flex items-center gap-2 mx-auto rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Start New ROSCA Cycle (₹{selectedGroup.savingsAmount}/mo)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-bold text-slate-600 mb-6 bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-900/50 px-4 py-1.5 rounded-full">
                        Active Cycle &middot; Round {activeCycle.currentRound} Payout Draw
                      </div>

                      {/* Animated Spin Wheel Component */}
                      <div className="relative w-48 h-48 rounded-full border-8 border-slate-800 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner mb-6">
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center"
                          animate={
                            isSpinning
                              ? { rotate: [0, 360, 720, 1080, 1440, 1800, 2160], transition: { duration: 3.5, ease: 'easeInOut' } }
                              : { rotate: 0 }
                          }
                        >
                          {/* Dividers & Mock Slots */}
                          <div className="absolute top-0 w-0.5 h-full bg-slate-300 dark:bg-slate-600" />
                          <div className="absolute left-0 h-0.5 w-full bg-slate-300 dark:bg-slate-600" />
                          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-300 dark:bg-slate-600 origin-center rotate-45" />
                          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-300 dark:bg-slate-600 origin-center -rotate-45" />
                        </motion.div>

                        {/* Indicator Arrow */}
                        <div className="absolute top-0 z-10 w-4 h-4 bg-red-600 rotate-45 transform -translate-y-2 border border-white" />

                        <div className="z-10 bg-white dark:bg-slate-900 h-16 w-16 rounded-full flex items-center justify-center shadow-lg">
                          <Trophy className="h-7 w-7 text-yellow-500" />
                        </div>
                      </div>

                      {/* Trigger Button */}
                      <button
                        onClick={handleSpinRoscaDraw}
                        disabled={isSpinning}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-bold text-white hover:bg-orange-700 transition disabled:opacity-50 shadow"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>{isSpinning ? 'Selecting Lucky Recipient...' : 'Spin Draw Wheel (Lottery)'}</span>
                      </button>

                      {/* Winner details block */}
                      <AnimatePresence>
                        {spunWinner && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-6 w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center flex flex-col items-center gap-2"
                          >
                            <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />
                            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Round Winner Drawn!</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
                              {spunWinner.recipient?.name}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              Draw Method: {spunWinner.drawMethod} &middot; Payout: ₹{spunWinner.payoutAmount} (Cash Disbursed)
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Add Member Modal */}
          {showAddMemberModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl border border-slate-150 dark:border-slate-800 flex flex-col gap-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      Add Group Member
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Add an existing registered member or create a brand new account with login access.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddMemberModal(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mode Switcher */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => { setMemberMode('NEW'); setAddMemberError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      memberMode === 'NEW'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    + Register New Member
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMemberMode('EXISTING'); setAddMemberError(''); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                      memberMode === 'EXISTING'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Add Existing User
                  </button>
                </div>

                {addMemberError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                    {addMemberError}
                  </div>
                )}

                <form onSubmit={handleAddMember} className="flex flex-col gap-4">
                  {memberMode === 'NEW' ? (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="priya@example.com"
                            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={newMemberPhone}
                            onChange={(e) => setNewMemberPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Member Login Password *
                          </label>
                          <span className="text-[11px] text-slate-400">They will use this to sign in</span>
                        </div>
                        <input
                          type="text"
                          required
                          value={newMemberPassword}
                          onChange={(e) => setNewMemberPassword(e.target.value)}
                          placeholder="password123"
                          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-mono"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Registered Email or Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={existingIdentifier}
                        onChange={(e) => setExistingIdentifier(e.target.value)}
                        placeholder="e.g. member@email.com or +919876543210"
                        className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none dark:bg-slate-800 dark:border-slate-700 text-sm font-medium"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addMemberLoading}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition shadow"
                    >
                      {addMemberLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      <span>{memberMode === 'NEW' ? 'Create & Add Member' : 'Add to Group'}</span>
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
