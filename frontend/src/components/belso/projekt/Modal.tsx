import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  wide,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className={[
          'w-full rounded-card border border-border bg-card p-5 shadow-lg',
          wide ? 'max-w-4xl' : 'max-w-lg',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-text-muted hover:text-navy"
            aria-label="Bezárás"
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase text-text-muted">
      {children}
      {required && <span className="text-danger"> *</span>}
    </span>
  );
}

export function BtnPrimary({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BtnGhost({
  children,
  onClick,
  sm,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  sm?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-lg border border-border bg-card font-semibold text-navy hover:bg-cream-muted disabled:opacity-50',
        sm ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
