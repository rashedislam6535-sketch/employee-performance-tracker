"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import {
  Shield,
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Radio,
  Send,
  Plus,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  Coffee,
  X,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AdminHubView() {
  const { currentUser, switchUser, setActiveTab, toast } = useApp();
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Broadcast Modal
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastDept, setBroadcastDept] = useState("All");
  const [broadcastType, setBroadcastType] = useState("system");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editRole, setEditRole] = useState("employee");
  const [editDept, setEditDept] = useState("");
  const [editDesig, setEditDesig] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployeesData(data.employees || []);
      }
    } catch (e: any) {
      toast({ title: "Failed to load team data", description: e.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered employees
  const filtered = employeesData.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "All" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // KPI Calculations
  const totalStaff = employeesData.length;
  const activeNow = employeesData.filter((e) => e.stats?.attendanceStatus === "working").length;
  const onBreakCount = employeesData.filter((e) => e.stats?.attendanceStatus === "on_break").length;
  const loggedTodayCount = employeesData.filter((e) => e.stats?.todayLogged).length;
  const totalTickets = employeesData.reduce((acc, curr) => acc + (curr.stats?.tickets || 0), 0);
  const totalKyc = employeesData.reduce((acc, curr) => acc + (curr.stats?.kyc || 0), 0);
  const totalChats = employeesData.reduce((acc, curr) => acc + (curr.stats?.chats || 0), 0);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      toast({ title: "Validation Error", description: "Title and message are required.", variant: "error" });
      return;
    }

    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          department: broadcastDept,
          type: broadcastType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Broadcast failed");

      toast({
        title: "Announcement Broadcasted!",
        description: data.message,
        variant: "success",
      });

      setShowBroadcast(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (err: any) {
      toast({ title: "Broadcast Failed", description: err.message, variant: "error" });
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
          department: editDept,
          designation: editDesig,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      toast({
        title: "Staff Updated",
        description: `${editingUser.name}'s profile and role have been updated.`,
        variant: "success",
      });

      setEditingUser(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "error" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleInspect = async (empId: number) => {
    await switchUser(empId);
    setActiveTab("dashboard");
  };

  const departments = Array.from(new Set(employeesData.map((e) => e.department).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30">
                <Shield className="h-3.5 w-3.5" />
                ADMIN COMMAND SECTOR
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Enterprise Operations & Staff Command
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Real-time workforce monitoring, cross-department productivity scoring, employee attendance tracking, and administrative governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-1.5 border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync Telemetry
            </Button>

            <Button
              onClick={() => setShowBroadcast(true)}
              className="gap-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-600/20"
            >
              <Radio className="h-3.5 w-3.5" />
              Broadcast Notice
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Staff</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {totalStaff}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">{departments.length} departments</p>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Working</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeNow}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Checked in on shift</p>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">On Break</span>
            <Coffee className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {onBreakCount}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Rest / Pause cycle</p>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Daily Updates</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
            {loggedTodayCount} <span className="text-sm font-normal text-zinc-400">/ {totalStaff}</span>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Logged work today</p>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Tickets</span>
            <TrendingUp className="h-4 w-4 text-cyan-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {totalTickets}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Processed across team</p>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">KYC Verifications</span>
            <Shield className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
            {totalKyc}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">Tier 1 & 2 verifications</p>
        </Card>
      </div>

      {/* Staff Telemetry & Control Roster */}
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>Workforce Roster & Telemetry</span>
              <Badge variant="outline" className="text-xs font-mono font-normal">
                {filtered.length} Staff
              </Badge>
            </CardTitle>
            <CardDescription>
              Click <strong>Inspect Workspace</strong> to view live metrics from any employee&apos;s perspective.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search staff, dept..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-44 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-y border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="px-5 py-3">Employee Name</th>
                <th className="px-3 py-3">Department & Role</th>
                <th className="px-3 py-3">Attendance Status</th>
                <th className="px-3 py-3 text-center">Score</th>
                <th className="px-3 py-3 text-right">Today Stats</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-zinc-500">
                    No employees found matching the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const isCurrent = currentUser?.id === emp.id;
                  const isAdm = emp.role === "admin" || emp.role === "manager";
                  const attStatus = emp.stats?.attendanceStatus;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        isCurrent ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatar || emp.employee?.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                            alt={emp.name}
                            className="h-8 w-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</p>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1">
                                  You
                                </Badge>
                              )}
                              {isAdm && (
                                <span className="rounded bg-rose-500/10 px-1 py-0.5 text-[9px] font-bold text-rose-500 border border-rose-500/20">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{emp.department}</p>
                        <p className="text-xs text-zinc-500 truncate">
                          {emp.employee?.designation || (isAdm ? "System Administrator" : "Support Specialist")}
                        </p>
                      </td>

                      <td className="px-3 py-3.5">
                        {attStatus === "working" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            On Duty ({emp.stats?.checkInTime || "Active"})
                          </span>
                        ) : attStatus === "on_break" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            On Break
                          </span>
                        ) : attStatus === "checked_out" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                            Shift Ended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                            Not Checked In
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                            (emp.stats?.performanceScore || 75) >= 90
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {emp.stats?.performanceScore || 85}%
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                        {emp.stats?.tickets > 0 && <span className="mr-2">{emp.stats.tickets} tix</span>}
                        {emp.stats?.kyc > 0 && <span className="mr-2">{emp.stats.kyc} kyc</span>}
                        {emp.stats?.chats > 0 && <span className="mr-2">{emp.stats.chats} chats</span>}
                        {emp.stats?.trainingHours > 0 && <span>{emp.stats.trainingHours}h train</span>}
                        {!emp.stats?.tickets && !emp.stats?.kyc && !emp.stats?.chats && (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInspect(emp.id)}
                            className="h-7 px-2.5 text-xs gap-1 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                            title="Switch view to this employee"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Inspect</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingUser(emp);
                              setEditRole(emp.role);
                              setEditDept(emp.department);
                              setEditDesig(emp.employee?.designation || "");
                            }}
                            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            title="Edit Role & Details"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Broadcast Announcement Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl relative text-zinc-100">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Broadcast System Announcement</h3>
                  <p className="text-xs text-zinc-400">Push notification to team notification feed</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcast(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Mandatory System Maintenance / Q3 Target Review"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Announcement Details *</label>
                <textarea
                  required
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter the full announcement content visible to all selected staff..."
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target Department</label>
                  <select
                    value={broadcastDept}
                    onChange={(e) => setBroadcastDept(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500"
                  >
                    <option value="All">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Priority Type</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500"
                  >
                    <option value="system">System Notice</option>
                    <option value="achievement">Achievement & Milestone</option>
                    <option value="reminder">Urgent Action Required</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowBroadcast(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  {broadcastSending ? "Broadcasting..." : "Send Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl relative text-zinc-100">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Staff Profile</h3>
                  <p className="text-xs text-zinc-400">{editingUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                >
                  <option value="employee">Standard Employee</option>
                  <option value="manager">Team Manager</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                >
                  <option value="Customer Support">Customer Support</option>
                  <option value="Compliance & KYC">Compliance & KYC</option>
                  <option value="Client Success">Client Success</option>
                  <option value="Technical Operations">Technical Operations</option>
                  <option value="Operations & Leadership">Operations & Leadership</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Designation Title</label>
                <input
                  type="text"
                  value={editDesig}
                  onChange={(e) => setEditDesig(e.target.value)}
                  placeholder="e.g. Senior Compliance Lead"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {editLoading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
