import { Button } from '../Button';

type Props = {
  children: React.ReactNode;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function AdminErrorState({
  children,
  className = '',
  onRetry,
  retryLabel = 'Retry',
}: Props) {
  return (
    <div
      className={[
        'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200/95',
        className,
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            className="!shrink-0"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
