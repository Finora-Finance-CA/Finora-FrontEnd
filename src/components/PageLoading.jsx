/** Shown while a page's code loads, or while the saved session is read. */
export default function PageLoading({ children = 'Loading page…' }) {
  return (
    <p className="page-loading" role="status">
      {children}
    </p>
  )
}
