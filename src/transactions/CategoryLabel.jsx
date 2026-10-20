import { CATEGORY_COLORS } from './constants'
import './CategoryLabel.css'

/**
 * A transaction's category as a coloured label. The name is always shown, so the
 * colour only helps people scan; it never carries meaning on its own. Colours come
 * from CATEGORY_COLORS, for light and dark mode.
 *
 * @param {object} props
 * @param {string} props.category
 */
export default function CategoryLabel({ category }) {
  const colors = CATEGORY_COLORS[category]
  const style = colors
    ? {
        '--category-text': colors.light.text,
        '--category-bg': colors.light.background,
        '--category-text-dark': colors.dark.text,
        '--category-bg-dark': colors.dark.background,
      }
    : undefined

  return (
    <span className="category-label" style={style}>
      {category}
    </span>
  )
}
