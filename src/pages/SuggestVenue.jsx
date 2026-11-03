import { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SuggestVenue() {
  const [form, setForm] = useState({
    name: '',
    address: '',
    happy_hour_start: '',
    happy_hour_end: '',
    days: [],
    deals: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await base44.entities.Venue.create({
      name: form.name,
      address: form.address,
      happy_hour_start: form.happy_hour_start,
      happy_hour_end: form.happy_hour_end,
      days: form.days,
      deals: form.deals ? form.deals.split('\n').map(d => d.trim()).filter(Boolean) : [],
      description: form.notes,
      status: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold mb-2">Thanks for the suggestion!</h1>
        <p className="text-muted-foreground mb-6">We'll review your submission and add it to the app if it's a good fit.</p>
        <Link to="/">
          <Button>Back to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 px-5 pt-5 pb-6 text-white">
        <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-sm mb-3 hover:text-white">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-heading font-bold">Suggest a Happy Hour Spot 🌸</h1>
        <p className="text-white/80 text-sm mt-1">Know a great spot? Tell us about it and we'll review it.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
        {/* Venue Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Venue Name *</Label>
          <Input
            id="name"
            placeholder="e.g. The Tipsy Tulip"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            placeholder="e.g. 123 Main St, Greenville, SC"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            required
          />
        </div>

        {/* Happy Hour Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start">Happy Hour Start *</Label>
            <Input
              id="start"
              type="time"
              value={form.happy_hour_start}
              onChange={e => setForm(f => ({ ...f, happy_hour_start: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">Happy Hour End *</Label>
            <Input
              id="end"
              type="time"
              value={form.happy_hour_end}
              onChange={e => setForm(f => ({ ...f, happy_hour_end: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Days */}
        <div className="space-y-1.5">
          <Label>Days of the Week</Label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  form.days.includes(day)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background border-border hover:border-primary'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Deals */}
        <div className="space-y-1.5">
          <Label htmlFor="deals">Deals / Specials</Label>
          <Textarea
            id="deals"
            placeholder={"$5 house wine\nHalf-price appetizers\n2-for-1 cocktails"}
            value={form.deals}
            onChange={e => setForm(f => ({ ...f, deals: e.target.value }))}
            className="h-24 text-sm"
          />
          <p className="text-xs text-muted-foreground">One deal per line</p>
        </div>

        {/* Additional Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Anything else we should know?</Label>
          <Textarea
            id="notes"
            placeholder="Website, phone number, special instructions..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="h-20 text-sm"
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </Button>
      </form>
    </div>
  );
}