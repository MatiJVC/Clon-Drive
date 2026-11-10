export function DriveLogo({ className = 'size-9' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#0F9D58" d="M17.4 6h13.2l12 20.8-6.6 11.4L23.4 16.4 17.4 6Z" />
    <path fill="#F4B400" d="M17.4 6 5.4 26.8 12 38.2l12-20.8L17.4 6Z" />
    <path fill="#4285F4" d="M12 38.2h24l6.6-11.4h-24L12 38.2Z" />
  </svg>
}
