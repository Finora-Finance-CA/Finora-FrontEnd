import Pill from '../components/ui/Pill'
import { CATEGORY_COLORS } from './constants'

/**
 * A transaction's category as a coloured pill. The name is always shown, so the colour
 * only helps people scan; it never carries meaning on its own. Colours come from
 * CATEGORY_COLORS, for light and dark mode; an unknown category gets the neutral pill.
 *
 * @param {object} props
 * @param {string} props.category
 */
export default function CategoryLabel({ category }) {
  return (
    <Pill className="category-label" colors={CATEGORY_COLORS[category]}>
      {category}
    </Pill>
  )
}
