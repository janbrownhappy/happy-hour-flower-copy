import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, Compass } from 'lucide-react';

export default function QrInvalid() {
  return (
    <div className="force-light min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="text-5xl">🌸</div>
        <h1 className="text-2xl font-heading font-bold text-foreground">This Happy Hour Flower link is no longer active.</h1>
        <p className="text-muted-foreground">The good news: there's still plenty of happy hour nearby.</p>
        <div className="space-y-3">
          <Link to="/explore?near=1" className="block"><Button className="w-full"><MapPin className="w-4 h-4" /> Find Happy Hour Near Me</Button></Link>
          <Link to="/" className="block"><Button variant="outline" className="w-full"><Compass className="w-4 h-4" /> Explore Happy Hour Flower</Button></Link>
        </div>
      </div>
    </div>
  );
}