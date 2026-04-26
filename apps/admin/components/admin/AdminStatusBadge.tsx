import { Badge } from '../Badge';

type Tone = 'green' | 'zinc' | 'yellow' | 'red' | 'blue';

type Props = {
  children: string;
  tone: Tone;
};

/**
 * Status pill for admin tables; same as {@link Badge}, kept for a single import
 * name across dashboard pages.
 */
export function AdminStatusBadge({ children, tone }: Props) {
  return <Badge tone={tone}>{children}</Badge>;
}
