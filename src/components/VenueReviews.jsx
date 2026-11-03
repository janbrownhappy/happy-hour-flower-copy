import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import useReviewsEnabled from '@/hooks/useReviewsEnabled';
import BlockUserButton from '@/components/BlockUserButton';
import useBlockedUsers from '@/hooks/useBlockedUsers';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              n <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function VenueReviews({ venueId }) {
  const { enabled: reviewsEnabled, loading: settingLoading } = useReviewsEnabled();
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const blocked = useBlockedUsers();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);

  useEffect(() => {
    const init = async () => {
      const [allReviews, me] = await Promise.all([
        base44.entities.Review.filter({ venue_id: venueId, status: 'approved' }),
        base44.auth.me().catch(() => null),
      ]);
      setReviews(allReviews.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')));
      setUser(me);
      if (me) {
        // Check all statuses so already-reviewed users can't re-submit
        const myReviews = await base44.entities.Review.filter({ venue_id: venueId, user_id: me.id });
        if (myReviews.length > 0) setUserReview(myReviews[0]);
      }
      setLoading(false);
    };
    init();
  }, [venueId]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    const payload = {
      venue_id: venueId,
      user_id: user.id,
      user_name: user.full_name || user.email?.split('@')[0] || 'Anonymous',
      rating,
      comment: comment.trim(),
    };
    const created = await base44.entities.Review.create({ ...payload, status: 'pending' });
    setUserReview(created);
    setRating(0);
    setComment('');
    setSubmitting(false);
  };

  if (loading || settingLoading) return null;
  if (!reviewsEnabled) return null;

  return (
    <div>
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Star className="w-4 h-4" /> Reviews
        {avgRating && (
          <span className="text-sm font-normal text-muted-foreground">
            · {avgRating} avg ({reviews.length})
          </span>
        )}
      </h2>

      {/* Review form — only for logged-in users who haven't reviewed yet */}
      {user && userReview && userReview.status !== 'approved' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
          ✅ Your review has been submitted and is pending approval.
        </div>
      )}

      {user && !userReview && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <p className="text-sm font-medium">Share your experience</p>
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            placeholder="What did you love about happy hour here? (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="text-sm resize-none"
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            size="sm"
            className="w-full"
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </Button>
        </div>
      )}

      {!user && (
        <p className="text-sm text-muted-foreground mb-4">
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="text-primary underline underline-offset-2"
          >
            Sign in
          </button>{' '}
          to leave a review.
        </p>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No reviews yet — be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.filter(r => !blocked.has(r.user_id || r.created_by_id)).map(r => (
            <div key={r.id} className="p-3 bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold flex items-center gap-2">
                  {r.user_name || 'Anonymous'}
                  <BlockUserButton authorId={r.user_id || r.created_by_id} authorName={r.user_name} currentUser={user} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.created_date ? format(parseISO(r.created_date), 'MMM d, yyyy') : ''}
                </span>
              </div>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}