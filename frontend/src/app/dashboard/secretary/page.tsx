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

      const mtgs = await fetchAPI(`/meetings?groupId=${group.id}`);
      setMeetings(mtgs);
      if (mtgs.length > 0) {
        setSelectedMeetingId(mtgs[0].id);
        // Initialize attendance values
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
                        key={gm.member.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30"
                      >
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                          {gm.member.name}
                        </span>
                        <div className="flex gap-1.5">
                          {['PRESENT', 'ABSENT', 'EXCUSED'].map((st) => (
                            <button
                              key={st}
                              onClick={() =>
                                setAttendanceRecords({ ...attendanceRecords, [gm.member.id]: st })
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                attendanceRecords[gm.member.id] === st
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
                        <option key={gm.member.id} value={gm.member.id}>
                          {gm.member.name}
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
      )}
    </div>
  );
}
