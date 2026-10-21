import Checkbox from '../components/ui/Checkbox'
import { CATEGORIES, CATEGORY_COLORS } from './constants'
import './FilterOptions.css'

/**
 * The category checkboxes, in the Category popover on wide screens and the Filters sheet
 * on phones. Any number can be chosen; they're always kept in CATEGORIES order.
 *
 * @param {object} props
 * @param {string[]} props.selected
 * @param {(categories: string[]) => void} props.onChange
 */
export default function CategoryOptions({ selected, onChange }) {
  function toggle(category, checked) {
    const chosen = checked ? [...selected, category] : selected.filter((item) => item !== category)
    onChange(CATEGORIES.filter((item) => chosen.includes(item)))
  }

  return (
    <fieldset className="filter-options">
      <legend className="filter-options__legend">
        Categories <span className="filter-options__hint">(choose any)</span>
      </legend>
      {CATEGORIES.map((category) => (
        <Checkbox
          key={category}
          name="category"
          value={category}
          label={category}
          swatch={{ light: CATEGORY_COLORS[category].light.text, dark: CATEGORY_COLORS[category].dark.text }}
          checked={selected.includes(category)}
          onChange={(event) => toggle(category, event.target.checked)}
        />
      ))}
    </fieldset>
  )
}
