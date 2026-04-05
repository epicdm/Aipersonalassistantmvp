/**
 * /order-success — Stripe payment success landing page.
 * Stripe redirects here after a successful checkout session.
 * Session ID is available in query string for downstream processing.
 */

export default function OrderSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment received!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for your order. A confirmation will be sent to you shortly.
        </p>
        <p className="text-sm text-gray-400">
          You can close this window and return to WhatsApp.
        </p>
      </div>
    </main>
  )
}
