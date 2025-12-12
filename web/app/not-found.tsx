/**
 * Global 404 Page
 * 
 * This catches all 404 errors at the root level.
 * Must include html/body tags since it doesn't go through layouts.
 * 
 * IMPORTANT: Keep this IDENTICAL to the RequireEditor 404 display
 * so admin routes appear truly "hidden" to unauthorized users.
 * 
 * Tailwind class equivalents used:
 * - text-9xl = 8rem, font-bold = 700, text-gray-200 = #e5e7eb
 * - text-2xl = 1.5rem, font-semibold = 600, text-gray-900 = #111827
 * - mt-4 = 1rem, mt-2 = 0.5rem, mt-6 = 1.5rem
 * - px-6 = 1.5rem, py-3 = 0.75rem
 * - bg-blue-600 = #2563eb, rounded-lg = 0.5rem
 */

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body style={{ 
        margin: 0, 
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{ textAlign: 'center', padding: '0 1rem' }}>
            <h1 style={{ 
              fontSize: '8rem',
              lineHeight: 1,
              fontWeight: 700,
              color: '#e5e7eb',
              margin: 0,
            }}>
              404
            </h1>
            <h2 style={{ 
              fontSize: '1.5rem',
              lineHeight: '2rem',
              fontWeight: 600,
              color: '#111827',
              marginTop: '1rem',
              marginBottom: 0,
            }}>
              Page Not Found
            </h2>
            <p style={{ 
              color: '#4b5563',
              marginTop: '0.5rem',
              maxWidth: '28rem',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              The page you are looking for does not exist or you do not have permission to access it.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                marginTop: '1.5rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '1rem',
                lineHeight: '1.5rem',
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
