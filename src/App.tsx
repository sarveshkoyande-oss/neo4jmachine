import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Database, ShieldCheck, Activity, Send, AlertCircle, CheckCircle2, ChevronRight, Terminal, Network } from 'lucide-react';

interface BridgeStatus {
  status: string;
  configured: boolean;
  timestamp: string;
}

export default function App() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError('Bridge server disconnected');
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher: 'RETURN 1 AS test' })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: 'Connection test failed' });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-10 py-10 flex flex-col">
        {/* Header Section from Theme */}
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 mb-8 gap-6 w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                Technical Advisory
              </span>
              <span className="text-slate-500 text-xs font-mono">REF: AURA-OPT-042</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight italic">
              Neo4j Aura <span className="text-cyan-400 font-normal not-italic">Connectivity Logic</span>
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm text-slate-400 font-medium">System Architecture v2.1</p>
            <p className="text-xs text-slate-600 font-mono">Status: {status?.configured ? 'OPTIMIZED' : 'CONFIG_PENDING'}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Reality & Pipeline (Inspired by Theme) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl"
            >
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Optimization Realities
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">Optimized For</p>
                  <div className="flex gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/20 uppercase font-bold">Bolt Protocol</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/20 uppercase font-bold">Official Drivers</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">The Conflict Zone</p>
                  <ul className="text-sm space-y-1 text-slate-400 list-disc list-inside font-medium italic">
                    <li>Arbitrary HTTP Calls</li>
                    <li>Power Automate / Logic Apps</li>
                    <li>Azure API Gateways</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Pipeline Visual */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl flex-1 hidden md:block"
            >
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-500" />
                Connectivity Pipeline
              </h2>
              <div className="relative flex flex-col items-center gap-4 py-4">
                <div className="w-full text-center p-3 border border-slate-700 bg-slate-800/50 rounded-lg text-xs font-mono uppercase tracking-widest text-slate-400">Power Automate</div>
                <div className="h-6 border-l-2 border-dashed border-slate-700"></div>
                <div className="w-full text-center p-3 border border-cyan-500/30 bg-cyan-500/5 rounded-lg text-xs font-mono text-cyan-300 ring-1 ring-cyan-500/20 font-bold">Tiny Node Middleware (Aura Bridge)</div>
                <div className="h-6 border-l-2 border-dashed border-slate-700"></div>
                <div className="w-full text-center p-3 border border-slate-700 bg-slate-800/50 rounded-lg text-xs font-mono uppercase tracking-widest text-slate-400">Neo4j Aura</div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Interactive Console & Testing */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Terminal-style Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50 shadow-sm shadow-rose-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/50 shadow-sm shadow-amber-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50 shadow-sm shadow-emerald-500/20"></div>
                  </div>
                  <span className="ml-4 text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">gateway-console</span>
                </div>
                <div 
                  className={`flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-mono border ${status?.configured ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-amber-500/5'}`}
                >
                  <Activity className="w-3 h-3 animate-pulse" />
                  {status?.configured ? 'SYSTEM_ONLINE' : 'CONFIG_REQUIRED'}
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    Interaction Matrix
                  </h3>
                  <button 
                    onClick={checkHealth}
                    className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-[0.2em]"
                  >
                    Rescan
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                  <StatusItem 
                    label="Uptime" 
                    value="100%" 
                    icon={<Activity className="w-3 h-3" />}
                    color="text-emerald-400"
                  />
                  <StatusItem 
                    label="Latency" 
                    value="&lt;15ms" 
                    icon={<ChevronRight className="w-3 h-3" />}
                    color="text-cyan-400"
                  />
                </div>

                <div className="space-y-6">
                  <p className="text-sm text-slate-400 leading-relaxed max-w-md italic font-medium">
                    Execute high-velocity transactional logic bypass against the Bolt-optimized Aura cluster via standard HTTP REST.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
                    <button 
                      onClick={runTest}
                      disabled={testLoading || !status?.configured}
                      className="group flex items-center gap-3 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800/80 disabled:text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest transition-all active:scale-95 text-white shadow-lg shadow-cyan-600/10"
                    >
                      <Send className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${testLoading ? 'animate-pulse' : ''}`} />
                      {testLoading ? 'Executing...' : 'Run Diagnostics'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {testResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 border-t border-slate-800 pt-8"
                    >
                      <div className={`flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {testResult.success ? 'Integrity Verified' : 'Handshake Failed'}
                      </div>
                      <pre className="p-4 bg-slate-950/80 rounded-lg font-mono text-[11px] text-slate-400 overflow-x-auto border border-slate-800 ring-1 ring-inset ring-white/[0.02]">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-auto p-6 bg-slate-950 border-t border-slate-800">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">Functional Benefits</h3>
                <div className="grid grid-cols-3 gap-6">
                  <Benefit label="Bolt Support" text="Persistent low-latency socket handshake." />
                  <Benefit label="Retry Logic" text="Auto-handles transactional bottlenecks." />
                  <Benefit label="Clean Auth" text="Bypass gateway mapping abstractions." />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Bar */}
        <footer className="mt-12 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] text-slate-600 font-bold gap-4 border-t border-slate-800/50 pt-8">
          <span>Solution Tier: <span className="text-slate-400">Enterprise Edge</span></span>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-cyan-500 rounded-full" /> Latency: &lt;15ms</span>
            <span className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Reliability: 99.99%</span>
            <span className="text-slate-400 text-right">Deployment: Cloud Run / Lambda / Edge</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatusItem({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold tracking-tighter ${color} italic font-mono`}>
        {value}
      </div>
    </div>
  );
}

function Benefit({ label, text }: { label: string, text: string }) {
  return (
    <div className="text-[11px] leading-relaxed">
      <span className="text-cyan-400 block font-bold mb-1 uppercase tracking-wider">{label}</span>
      <span className="text-slate-500 font-medium italic">{text}</span>
    </div>
  );
}

