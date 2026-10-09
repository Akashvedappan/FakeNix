const LOGO_ALT = 'FAKENIX – AI-Powered Deepfake Detection and Digital Forensics'

// Official FAKENIX logo. Sizes (sm | md | lg | xl) are defined in index.css.
export default function Logo({ size = 'md', className = '' }) {
  return (
    <picture className={`brand-logo brand-logo-${size}${className ? ` ${className}` : ''}`}>
      <source srcSet="/fakenix-logo.webp" type="image/webp" />
      <img src="/fakenix-logo.jpeg" alt={LOGO_ALT} width="1422" height="1106" decoding="async" />
    </picture>
  )
}
