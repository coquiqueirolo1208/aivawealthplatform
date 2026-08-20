/** Small "?" hint — pure CSS hover/focus tooltip, no client JS needed. */
export function HelpTooltip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      className="group relative ml-1 inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full align-middle text-[9.5px] font-bold outline-none"
      style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--muted)" }}
    >
      ?
      <span
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-max max-w-[220px] -translate-x-1/2 rounded-md px-2.5 py-1.5 text-[11px] leading-snug font-normal whitespace-normal opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        {text}
      </span>
    </span>
  );
}
