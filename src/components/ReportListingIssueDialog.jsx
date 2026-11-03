import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Flag, CheckCircle2 } from 'lucide-react';

const ISSUE_TYPES = [
  { value: 'incorrect_hours', label: 'Incorrect happy hour times' },
  { value: 'wrong_deals', label: 'Wrong or outdated deals' },
  { value: 'closed_permanently', label: 'Venue is closed permanently' },
  { value: 'wrong_location', label: 'Wrong address / location' },
  { value: 'wrong_contact_info', label: 'Wrong phone, website, or social links' },
  { value: 'other', label: 'Something else' },
];

export default function ReportListingIssueDialog({ open, onClose, venue }) {
  const { toast } = useToast();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setIssueType('');
    setDescription('');
    setSubmitting(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!issueType) return;
    setSubmitting(true);
    const authed = await base44.auth.isAuthenticated();
    if (!authed) {
      base44.auth.redirectToLogin();
      return;
    }
    const user = await base44.auth.me();
    await base44.entities.ListingIssue.create({
      venue_id: venue.id,
      venue_name: venue.name,
      reporter_id: user.id,
      reporter_name: user.full_name || user.email,
      issue_type: issueType,
      description: description.trim(),
      status: 'open',
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {submitted ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-bold">Thanks for the heads up!</h2>
            <p className="text-sm text-muted-foreground">
              Our team will review this report and update the listing if needed.
            </p>
            <Button className="w-full" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-orange-500" /> Report an issue
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                See something wrong with <span className="font-semibold text-foreground">{venue?.name}</span>? Let us know and we'll fix it.
              </p>
              <div className="space-y-1.5">
                <Label>What's the problem?</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Details (optional)</Label>
                <Textarea
                  placeholder="Tell us more — e.g. the correct hours, what's outdated, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <Button className="w-full" disabled={!issueType || submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}