import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import MailerLiteIntegration from '@/components/admin/MailerLiteIntegration';
import AdminLeads from '@/components/admin/AdminLeads';
import AdminWaitlist from '@/components/admin/AdminWaitlist';
import { Mail, Users, ClipboardList, ArrowLeft } from 'lucide-react';

const TABS = [
  { value: 'mailerlite', label: 'MailerLite', icon: <Mail className="w-4 h-4" /> },
  { value: 'leads', label: 'Leads', icon: <Users className="w-4 h-4" /> },
  { value: 'waitlist', label: 'Waitlist', icon: <ClipboardList className="w-4 h-4" /> },
];

export default function AdminMarketing() {
  const [activeTab, setActiveTab] = useState('mailerlite');

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 shrink-0 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <RouterLink to="/admin" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Admin
          </RouterLink>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-heading font-bold leading-tight">Marketing</h1>
              <p className="text-xs text-muted-foreground leading-tight">& Email</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${activeTab === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              {tab.icon}
              <span className="flex-1 truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'mailerlite' && <MailerLiteIntegration />}
        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'waitlist' && <AdminWaitlist />}
      </div>
    </div>
  );
}