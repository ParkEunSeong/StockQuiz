type Props = { correct: boolean }

/** A slightly uneven, two-pass mark that draws itself like a red pencil. */
export default function PencilFeedback({ correct }: Props) {
  return (
    <svg
      className={`pencil-feedback ${correct ? 'pencil-circle' : 'pencil-cross'}`}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      {correct ? (
        <>
          <path
            className="pencil-main"
            pathLength="1"
            d="M 67 13 C 42 9, 19 25, 13 49 C 4 78, 23 106, 53 110 C 82 115, 107 96, 111 68 C 115 40, 94 18, 67 13 C 62 12, 56 12, 51 14"
          />
          <path
            className="pencil-shadow"
            pathLength="1"
            d="M 59 16 C 32 15, 12 35, 11 61 C 10 88, 32 107, 58 109 C 87 111, 109 89, 109 60"
          />
        </>
      ) : (
        <>
          <path className="pencil-main pencil-cross-first" pathLength="1" d="M 22 20 C 43 43, 74 78, 99 102" />
          <path className="pencil-main pencil-cross-second" pathLength="1" d="M 100 19 C 78 42, 42 81, 20 101" />
          <path className="pencil-shadow pencil-cross-shadow" pathLength="1" d="M 25 22 C 48 48, 73 75, 96 99" />
        </>
      )}
    </svg>
  )
}

/** Large grading mark drawn over the question, answer, and explanation. */
export function PencilOverlay({ correct }: Props) {
  return (
    <svg
      className={`pencil-overlay ${correct ? 'pencil-overlay-circle' : 'pencil-overlay-cross'}`}
      viewBox="0 0 300 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {correct ? (
        <path
          pathLength="1"
          d="M 130 392 C 87 375, 22 283, 24 194 C 27 112, 113 27, 199 10 C 254 -1, 286 18, 290 69 C 297 153, 254 269, 191 381"
        />
      ) : (
        <>
          <path pathLength="1" d="M 24 13 C 76 110, 201 294, 281 391" />
          <path pathLength="1" d="M 278 13 C 222 114, 97 297, 27 389" />
        </>
      )}
    </svg>
  )
}
