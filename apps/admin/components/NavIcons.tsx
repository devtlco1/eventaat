import type { SVGProps } from 'react';

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export function IconLayoutDashboard(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
export function IconStore(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M3 9L5 3h14l2 6v2a2 2 0 0 1-2 2h-2l-1 7H8l-1-7H5a2 2 0 0 1-2-2V9z" /><path d="M8 19v2" /><path d="M16 19v2" /></svg>;
}
export function IconCalendarEvent(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>;
}
export function IconClipboardList(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M9 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>;
}
export function IconBell(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M6 8a6 6 0 0 1 12 0c0 4 2 4 2 6H4c0-2 2-2 2-6" /><path d="M10 20h4" /></svg>;
}
export function IconUsers(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3" /><path d="M23 20v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
export function IconUserCircle(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="9" /><path d="M8 16s1.5-1.5 4-1.5 4 1.5 4 1.5" /><circle cx="12" cy="9" r="2.5" /></svg>;
}
export function IconPanelLeftClose(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6" /><path d="M9 12h2" /><path d="M9 3v18" /></svg>;
}
export function IconPanelLeftOpen(props: SVGProps<SVGSVGElement>) {
  return <svg {...base} {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 9h2" /><path d="M15 12h4" /><path d="M9 3v18" /></svg>;
}
export function IconLogOut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/** 16px inside buttons — same stroke as `base` */
const ac = (props: SVGProps<SVGSVGElement>) =>
  [base, 'h-4 w-4 shrink-0', props.className].filter(Boolean).join(' ');

export function IconEye(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconPencil(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
export function IconCog(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
export function IconRefreshCw(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
export function IconCopy(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
export function IconXMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
export function IconUserSlash(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <circle cx="9" cy="7" r="3" />
      <path d="M17 20v-2a4 4 0 0 0-4-4H8" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
export function IconListChevron(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} className={ac(props)} aria-hidden>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}
