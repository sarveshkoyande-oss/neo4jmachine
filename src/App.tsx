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
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    checkHealth();
    fetchLogs();
    const interval = setInterval(() => {
      checkHealth();
      fetchLogs();
    }, 5000);
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

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs');
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
      fetchLogs();
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
          <div className="lg:col-span-4 flex flex-col gap-6">
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
                  <div className="flex gap-2 text-[10px]">
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase font-bold tracking-wider">Bolt Protocol</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase font-bold tracking-wider">Official Drivers</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500 font-bold mb-2 tracking-wider">The Conflict Zone</p>
                  <ul className="text-sm space-y-1 text-slate-400 list-disc list-inside font-medium border-t border-slate-800 pt-4">
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
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl hidden md:block"
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
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Console and Testing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Testing Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Diagnostics</h3>
                   <div 
                    className={`flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-mono border ${status?.configured ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-amber-500/5'}`}
                  >
                    {status?.configured ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
                <div className="p-6 flex-1">
                  <p className="text-xs text-slate-500 mb-6 italic">Execute standard connectivity handshake.</p>
                  <button 
                    onClick={runTest}
                    disabled={testLoading || !status?.configured}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800/80 disabled:text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest transition-all text-white"
                  >
                    <Send className={`w-3.5 h-3.5 ${testLoading ? 'animate-pulse' : ''}`} />
                    {testLoading ? 'PROBING...' : 'RUN TEST'}
                  </button>

                  <AnimatePresence>
                  {testResult && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 border-t border-slate-800 pt-6"
                    >
                      <pre className="p-4 bg-slate-950 rounded-lg font-mono text-[10px] text-slate-400 overflow-x-auto border border-slate-800">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </motion.div>

              {/* Logs Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col"
              >
                 <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Execution Logs</h3>
                  <span className="text-[10px] font-mono text-slate-500">Last 10</span>
                </div>
                <div className="p-4 flex-1 max-h-[400px] overflow-y-auto">
                  <div className="space-y-3">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-600 font-mono uppercase tracking-widest italic font-bold opacity-30">
                        No activity recorded
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-950/50 border border-white/[0.03] rounded-lg group hover:border-slate-700 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-400/5' : 'text-rose-400 bg-rose-400/5'}`}>
                              {log.status}
                            </span>
                             <span className="text-[9px] font-mono text-slate-600">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-2 uppercase tracking-wide">
                            <Terminal className="w-3 h-3 text-cyan-500" />
                            {log.type}
                          </div>
                          {log.details.error && (
                            <div className="text-[10px] text-rose-500/80 bg-rose-500/5 p-2 rounded mt-2 border border-rose-500/10 font-mono break-all">
                              ERR: {log.details.error}
                            </div>
                          )}
                          {log.details.email_id && (
                            <div className="text-[10px] text-cyan-400/80 mt-1 font-mono">
                              ID: {log.details.email_id}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Documentation / Why it works */}
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-8"
              >
                 <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-6">Automation Blueprint</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Benefit label="Bolt Support" text="Persistent low-latency socket handshake." />
                  <Benefit label="Retry Logic" text="Auto-handles transactional bottlenecks." />
                  <Benefit label="Clean Auth" text="Bypass gateway mapping abstractions." />
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

