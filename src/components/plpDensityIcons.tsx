/** Mini grid motifs for PLP column density (2 / 3 / 4 columns). */

export function PlpDensityIcon({ cols }: { cols: 2 | 3 | 4 }) {
  if (cols === 2) {
    return (
      <span className="ella-plp-density-icon ella-plp-density-icon--c2" aria-hidden>
        <span className="ella-plp-density-icon__cell" />
        <span className="ella-plp-density-icon__cell" />
      </span>
    )
  }
  if (cols === 3) {
    return (
      <span className="ella-plp-density-icon ella-plp-density-icon--c3" aria-hidden>
        <span className="ella-plp-density-icon__cell" />
        <span className="ella-plp-density-icon__cell" />
        <span className="ella-plp-density-icon__cell" />
      </span>
    )
  }
  return (
    <span className="ella-plp-density-icon ella-plp-density-icon--c4" aria-hidden>
      <span className="ella-plp-density-icon__cell" />
      <span className="ella-plp-density-icon__cell" />
      <span className="ella-plp-density-icon__cell" />
      <span className="ella-plp-density-icon__cell" />
    </span>
  )
}
