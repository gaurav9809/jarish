
import React from 'react';
import { CallLog } from '../types';
import { PhoneIncoming, PhoneOutgoing, Clock, X, Trash2 } from 'lucide-react';

interface CallLogsProps {
  logs: CallLog[];
  onClose: () => void;
  onClear: () => void;
}

const CallLogs: React.FC<CallLogsProps> = ({ logs, onClose, onClear }) => {
  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-900/50 border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h3 className="text-white font-bold text-lg">Call Logs</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Neural Uplink History</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClear} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
                <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
          {logs.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-white/20">
              <Clock size={32} className="mb-2 opacity-10" />
              <p className="text-sm">No pichli baatein found.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'incoming' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {log.type === 'incoming' ? <PhoneIncoming size={18} /> : <PhoneOutgoing size={18} />}
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold">{log.type === 'incoming' ? 'Incoming' : 'Outgoing'}</p>
                    <p className="text-white/40 text-[11px]">{formatDate(log.startTime)}</p>
                  </div>
                </div>
                <div className="text-right">
                    <p className="text-white/60 text-[11px] font-mono">{formatDuration(log.duration)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CallLogs;
