import './Logo.css'

/**
 * Finora's logo, used in the sidebar, the mobile top bar and the sign-in card. A
 * wordmark for now; an SVG mark can go in front of the name here later.
 */
export default function Logo({ className }) {
  return <span className={['logo', className].filter(Boolean).join(' ')}>Finora</span>
}
