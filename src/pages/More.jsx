import { Link } from 'react-router-dom';
import { Newspaper, MessagesSquare, Settings, Lightbulb, PlusCircle, ChevronRight } from 'lucide-react';

const LINKS = [
  { to: '/news', label: 'News', desc: 'Local happy hour stories', icon: Newspaper },
  { to: '/ask-local', label: 'Ask a Local', desc: 'Questions and answers', icon: MessagesSquare },
  { to: '/suggest', label: 'Suggest a Venue', desc: 'Tell us about a spot', icon: PlusCircle },
  { to: '/best-practices', label: 'Tips', desc: 'Get the most from the app', icon: Lightbulb },
  { to: '/settings', label: 'Settings', desc: 'Account, privacy and deletion', icon: Settings },
];

export default function More() {
  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl font-bold mb-4 select-none">More</h1>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {LINKS.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors select-none">
            <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-foreground">{label}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}