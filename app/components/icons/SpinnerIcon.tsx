export function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647v.731l2.819 2.819A9.97 9.97 0 0012 20a9.97 9.97 0 003.182-1.569l2.819-2.819V14.73L16 12.088A7.962 7.962 0 0120 12c0-3.95-3.538-7.291-7-7.291z"
        className="opacity-75"
      />
    </svg>
  );
}
