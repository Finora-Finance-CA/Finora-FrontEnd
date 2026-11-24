/**
 * A transaction's category, as plain text. Categories aren't colour coded: the name is
 * all there is to say, and colour is kept for money and status.
 *
 * @param {object} props
 * @param {string} props.category
 */
export default function CategoryLabel({ category }) {
  return <span className="category-label">{category}</span>
}
