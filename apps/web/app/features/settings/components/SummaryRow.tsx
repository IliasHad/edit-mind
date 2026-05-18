export function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/50 shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
