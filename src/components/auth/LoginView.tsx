"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import {
  Shield,
  User as UserIcon,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Building2,
  Zap,
  Activity,
  UserPlus,
  HelpCircle,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { DEMO_USERS } from "@/lib/auth";

export function LoginView() {
  const { login, theme, toggleTheme, toast } = useApp();
  const [activePortal, setActivePortal] = useState<"employee" | "admin">("employee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showRegister, setShowRegister] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regDepartment, setRegDepartment] = useState("Customer Support");
  const [regRole, setRegRole] = useState<"employee" | "admin">("employee");
  const [regDesignation, setRegDesignation] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Time ticker
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pre-fill demo credentials on tab change
  const handleTabChange = (portal: "employee" | "admin") => {
    setActivePortal(portal);
    setErrorMsg("");
    if (portal === "admin") {
      const adminAcc = DEMO_USERS.find((d) => d.user.role === "admin");
      if (adminAcc) {
        setEmail(adminAcc.user.email);
        setPassword(adminAcc.password);
      }
    } else {
      const empAcc = DEMO_USERS.find((d) => d.user.role === "employee");
      if (empAcc) {
        setEmail(empAcc.user.email);
        setPassword(empAcc.password);
      }
    }
  };

  // 1-Click Quick Select
  const handleQuickSelect = (demo: (typeof DEMO_USERS)[0]) => {
    setActivePortal(demo.user.role === "admin" ? "admin" : "employee");
    setEmail(demo.user.email);
    setPassword(demo.password);
    setErrorMsg("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const res = await login({
      email,
      password,
      role: activePortal,
    });

    if (!res.success) {
      setErrorMsg(res.error || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      toast({ title: "Missing fields", description: "Please complete all required fields.", variant: "error" });
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          department: regDepartment,
          role: regRole,
          designation: regDesignation,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({ title: "Registration failed", description: data.error || "Could not register.", variant: "error" });
        return;
      }

      toast({
        title: "Account Created!",
        description: `Welcome aboard, ${data.user.name}. Logging you in now...`,
        variant: "success",
      });

      setShowRegister(false);
      await login({ email: regEmail, password: regPassword, role: regRole });
    } catch (err: any) {
      toast({ title: "Registration error", description: err.message, variant: "error" });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/25 via-blue-500/20 to-purple-600/20 blur-[130px] rounded-full" />
        {activePortal === "admin" && (
          <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-rose-600/15 blur-[120px] rounded-full transition-all duration-700" />
        )}
        <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/25">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">WorkPulse</span>
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Performance & Workforce Operations Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400 backdrop-blur">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span className="tabular-nums font-mono text-zinc-300">{currentTime || "00:00:00"}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Core */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Portal Switcher Tabs */}
          <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-1 backdrop-blur-md shadow-xl flex gap-1">
            <button
              type="button"
              onClick={() => handleTabChange("employee")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                activePortal === "employee"
                  ? "bg-zinc-800 text-white shadow-md border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span>Employee Portal</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                activePortal === "admin"
                  ? "bg-gradient-to-r from-rose-950/80 to-indigo-950/80 text-white shadow-md border border-rose-500/40 text-rose-200"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              <span>Admin Sector</span>
            </button>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60 relative overflow-hidden">
            {/* Sector Banner Glow */}
            <div
              className={`absolute top-0 inset-x-0 h-1 ${
                activePortal === "admin"
                  ? "bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500"
                  : "bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400"
              }`}
            />

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {activePortal === "admin" ? "Administrative Clearance" : "Staff Authentication"}
                </h2>
                {activePortal === "admin" ? (
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
                    High Security
                  </span>
                ) : (
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-400 border border-indigo-500/20">
                    Staff Portal
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-zinc-400">
                {activePortal === "admin"
                  ? "Sign in to access leadership oversight, team telemetry & system control."
                  : "Sign in to access your daily tasks, performance metrics, and attendance check-in."}
              </p>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activePortal === "admin" ? "admin@workpulse.io" : "employee@workpulse.io"}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 pl-10 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">Access Key / Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Forgot key?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500/20"
                  />
                  <span className="text-xs text-zinc-400">Remember this workstation</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-lg transition-all ${
                  activePortal === "admin"
                    ? "bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-rose-600/20"
                    : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-indigo-600/20"
                } ${loading ? "opacity-75 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"}`}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter {activePortal === "admin" ? "Admin Sector" : "Workspace"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo 1-Click Access Selector */}
            <div className="mt-6 pt-5 border-t border-zinc-800/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Quick Demo Accounts
                </span>
                <span className="text-[10px] text-zinc-500">1-Click Auto-Fill</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map((demo) => {
                  const isSelected = email.toLowerCase() === demo.user.email.toLowerCase();
                  const isAdminRole = demo.user.role === "admin";
                  return (
                    <button
                      key={demo.user.id}
                      type="button"
                      onClick={() => handleQuickSelect(demo)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition ${
                        isSelected
                          ? isAdminRole
                            ? "border-rose-500/60 bg-rose-950/30 text-rose-100"
                            : "border-indigo-500/60 bg-indigo-950/30 text-indigo-100"
                          : "border-zinc-800/70 bg-zinc-950/40 hover:bg-zinc-800/50 hover:border-zinc-700 text-zinc-300"
                      }`}
                    >
                      <img
                        src={demo.employee.photo || demo.user.avatar || ""}
                        alt={demo.user.name}
                        className="h-7 w-7 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-xs font-semibold">{demo.user.name.split(" ")[0]}</p>
                          {isAdminRole && (
                            <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1 rounded font-bold">
                              ADM
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-zinc-500">{demo.employee.department}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Register Trigger */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
              >
                <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                <span>New Employee? </span>
                <span className="text-indigo-400 font-medium hover:underline">Register Profile</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer System Specs */}
      <footer className="relative z-10 px-6 py-4 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 border-t border-zinc-900 gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
          <span>WorkPulse Enterprise Suite v2.5</span>
          <span>·</span>
          <span className="text-emerald-500 font-medium">All Systems Operational</span>
        </div>
        <div>
          <span>Enterprise Role-Based Access Control Enabled</span>
        </div>
      </footer>

      {/* New Employee Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">New Employee Registration</h3>
                  <p className="text-xs text-zinc-400">Create a staff profile on WorkPulse</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegister(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="marcus.v@workpulse.io"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Department</label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
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
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Role Type</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as "employee" | "admin")}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
                  >
                    <option value="employee">Employee / Staff</option>
                    <option value="admin">Administrator / Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Designation / Title</label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="e.g. Senior Support Specialist"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRegister(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {regLoading ? "Registering..." : "Create Account & Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Reset Credentials</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              For security compliance, credentials can be reset by selecting your account from the <strong>Quick Demo Accounts</strong> bar, or with standard password <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">password123</code> (or <code className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">admin</code> for Admin).
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowForgot(false)}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
