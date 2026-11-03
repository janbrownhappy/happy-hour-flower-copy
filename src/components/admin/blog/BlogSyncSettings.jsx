import WordPressSyncButton from '@/components/admin/blog/WordPressSyncButton';

export default function BlogSyncSettings({ onSynced, lastSyncedAt, flaggedCount }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold mb-1">WordPress sync</h3>
          <p className="text-sm text-muted-foreground">
            Pulls published posts from blog.happyhourflower.com every 15 minutes. Read-only — nothing is ever sent back to WordPress.
            {lastSyncedAt ? ` Last synced ${new Date(lastSyncedAt).toLocaleString()}.` : ''}
          </p>
          {flaggedCount > 0 && (
            <p className="text-sm text-amber-700 mt-2">
              {flaggedCount} article{flaggedCount === 1 ? '' : 's'} no longer published on WordPress — review them in the Articles tab.
            </p>
          )}
        </div>
        <WordPressSyncButton onSynced={onSynced} />
      </div>

      <div className="bg-muted/50 border border-border rounded-xl p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How it works</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Write and publish posts on WordPress as usual.</li>
          <li>New and updated posts land here automatically, matched by their WordPress post ID.</li>
          <li>WordPress is authoritative: a newer WordPress version overwrites local edits to synced articles.</li>
          <li>Posts that are unpublished or deleted on WordPress are flagged for review, never deleted here.</li>
        </ol>
      </div>
    </div>
  );
}