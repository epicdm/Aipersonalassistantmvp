import React from "react";
import { 
  MessageSquare, 
  Clock, 
  Zap, 
  TrendingUp, 
  Calendar, 
  Mail, 
  BookOpen, 
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { motion } from "motion/react";

const MOCK_CHART_DATA = [
  { name: 'Mon', messages: 40, active: 24, latency: 1.2 },
  { name: 'Tue', messages: 30, active: 13, latency: 1.5 },
  { name: 'Wed', messages: 65, active: 98, latency: 1.1 },
  { name: 'Thu', messages: 27, active: 39, latency: 1.8 },
  { name: 'Fri', messages: 48, active: 48, latency: 1.3 },
  { name: 'Sat', messages: 23, active: 38, latency: 1.4 },
  { name: 'Sun', messages: 34, active: 43, latency: 1.2 },
];

const SOURCE_DATA = [
  { name: 'WhatsApp', value: 45, color: '#25D366' },
  { name: 'Web Chat', value: 30, color: '#4f46e5' },
  { name: 'API', value: 15, color: '#10b981' },
  { name: 'Email', value: 10, color: '#f59e0b' },
];

export function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Messages Processed", value: "2,482", change: "+14.2%", positive: true, icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Avg Latency", value: "1.24s", change: "-0.12s", positive: true, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Active Integrations", value: "6", change: "+2", positive: true, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Goal Completion", value: "94.8%", change: "-2.1%", positive: false, icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${stat.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
            <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Activity Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="font-bold text-xl text-gray-900">Performance Analytics</h3>
              <p className="text-sm text-gray-500">Real-time engagement and system response tracking</p>
            </div>
            <div className="flex bg-gray-50 p-1 rounded-xl">
              {['7d', '30d', '90d'].map(t => (
                <button key={t} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${t === '7d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_CHART_DATA}>
                <defs>
                  <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  cursor={{ stroke: '#4f46e5', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorMsg)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg">Source Distribution</h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[200px] w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SOURCE_DATA} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none' }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                  {SOURCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            {SOURCE_DATA.map((source, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: source.color }} />
                  <span className="text-sm font-bold text-gray-700">{source.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-500">{source.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity Feed */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-xl">Operational Activity</h3>
            <button className="text-sm font-bold text-indigo-600 hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {[
              { icon: Calendar, text: "Meeting scheduled with Sarah Miller", time: "2m ago", type: "success", detail: "Added to Google Calendar • 10:00 AM" },
              { icon: MessageSquare, text: "Inbound WhatsApp from James Chen", time: "15m ago", type: "info", detail: "Handled by AI: General Inquiry" },
              { icon: Mail, text: "Client proposal draft sent", time: "1h ago", type: "info", detail: "Pending user approval in Drafts" },
              { icon: BookOpen, text: "Knowledge Indexing Completed", time: "3h ago", type: "update", detail: "Added 12 new internal documentation files" },
            ].map((activity, i) => (
              <div key={i} className="flex gap-5 group relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white group-hover:scale-110 transition-transform ${
                  activity.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  activity.type === 'update' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div className="flex-grow pt-1 pb-4 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{activity.text}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{activity.time}</p>
                  </div>
                  <p className="text-xs text-gray-500">{activity.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health / Connectivity */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-xl">Service Status</h3>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Operational
            </div>
          </div>
          
          <div className="space-y-6 flex-grow">
            {[
              { name: "WhatsApp Gateway", status: "Active", latency: "42ms", uptime: "99.9%" },
              { name: "Vector Database", status: "Indexing", latency: "124ms", uptime: "98.2%" },
              { name: "Auth Service", status: "Active", latency: "12ms", uptime: "100%" },
              { name: "Mail Integration", status: "Active", latency: "235ms", uptime: "99.4%" },
            ].map((service, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-white hover:border-indigo-100 transition-all cursor-default">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${service.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{service.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{service.uptime} Uptime</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900">{service.latency}</p>
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Response Time</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-50">
             <button 
              onClick={() => onNavigate("tools")}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Configure Integrations
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
