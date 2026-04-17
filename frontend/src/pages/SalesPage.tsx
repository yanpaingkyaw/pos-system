import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { Category, PaginatedResponse, Product, ShopSetting } from '../types'

type CartItem = {
  product: Product
  quantity: number
}

type DraftItem = {
  product_id: number
  quantity: number
}

type ReceiptItem = {
  id: number
  quantity: number
  price: string
  total: string
  product?: {
    id: number
    name: string
  }
}

type SaleReceipt = {
  id: number
  created_at: string
  subtotal: string
  tax: string
  discount: string
  total: string
  payment_method: string
  user?: {
    name: string
  }
  items: ReceiptItem[]
}

const DRAFT_KEY = 'pos_sale_draft'

export default function SalesPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.user)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSetting | null>(null)
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [walletProvider, setWalletProvider] = useState('KBZPay')
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [draftItems, setDraftItems] = useState<DraftItem[]>([])
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<PaginatedResponse<Product>>('/products'),
      api.get<PaginatedResponse<Category>>('/categories'),
      api.get<ShopSetting>('/shop-settings'),
    ]).then(([productRes, categoryRes, settingRes]) => {
      setProducts(productRes.data.data)
      setCategories(categoryRes.data.data)
      setSettings(settingRes.data)
    })

    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as {
          items: DraftItem[]
          tax: string
          discount: string
        }
        setTax(parsed.tax)
        setDiscount(parsed.discount)
        setDraftItems(parsed.items)
      } catch {
        localStorage.removeItem(DRAFT_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (!products.length || !draftItems.length || cart.length) {
      return
    }

    setCart(
      draftItems
        .map((item) => {
          const product = products.find((entry) => entry.id === item.product_id)
          return product ? { product, quantity: item.quantity } : null
        })
        .filter((item): item is CartItem => item !== null),
    )
    setDraftItems([])
  }, [products, draftItems, cart.length])

  useEffect(() => {
    if (!products.length) {
      return
    }

    setCart((previous) => {
      if (!previous.length) {
        return previous
      }

      return previous
        .map((item) => {
          const product = products.find((entry) => entry.id === item.product.id)
          return product ? { ...item, product } : null
        })
        .filter((item): item is CartItem => item !== null)
    })
  }, [products])

  useEffect(() => {
    if (!settings) {
      return
    }

    const availableMethods = settings.payment_methods?.length ? settings.payment_methods : ['cash', 'wallet']
    const availableWallets = settings.wallet_providers?.length
      ? settings.wallet_providers
      : ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay']

    if (!availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0])
    }

    if (!availableWallets.includes(walletProvider)) {
      setWalletProvider(availableWallets[0])
    }
  }, [settings, paymentMethod, walletProvider])

  useEffect(() => {
    if (!receipt) {
      return
    }

    const cashierName = receipt.user?.name ?? currentUser?.name ?? 'Cashier'
    const payload = [
      `receipt:${receipt.id}`,
      `date:${receipt.created_at}`,
      `total:${Number(receipt.total).toFixed(2)}`,
      `cashier:${cashierName}`,
      `payment:${receipt.payment_method}`,
    ].join('|')

    QRCode.toDataURL(payload, { margin: 1, width: 180 })
      .then((dataUrl: string) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(''))
  }, [receipt, currentUser])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const inCategory = activeCategory === 'all' || product.category_id === activeCategory
      const inSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase())

      return inCategory && inSearch
    })
  }, [products, activeCategory, search])

  const categoriesWithCount = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: products.filter((product) => product.category_id === category.id).length,
      })),
    [categories, products],
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cart],
  )

  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0))

  const availablePaymentMethods = settings?.payment_methods?.length
    ? settings.payment_methods
    : ['cash', 'wallet']

  const availableWalletProviders = settings?.wallet_providers?.length
    ? settings.wallet_providers
    : ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay']

  const paymentMethodLabel = (method: string) => {
    if (method === 'cash') {
      return 'Cash'
    }

    if (method === 'wallet') {
      return 'Wallet'
    }

    if (method === 'bank_transfer') {
      return 'Bank Transfer'
    }

    if (method === 'card') {
      return 'Card'
    }

    return method
  }

  const formatReceiptPaymentMethod = (method: string) => {
    if (method.startsWith('wallet:')) {
      return method.replace('wallet:', 'Wallet - ')
    }

    return paymentMethodLabel(method)
  }

  const addToCart = (product: Product) => {
    if (!product.is_active || product.quantity <= 0) {
      return
    }

    setMessage('')
    setCart((current) => {
      const found = current.find((item) => item.product.id === product.id)
      if (!found) {
        return [...current, { product, quantity: 1 }]
      }

      return current.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, item.product.quantity) }
          : item,
      )
    })
  }

  const updateQty = (productId: number, change: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) {
            return item
          }

          const nextQty = Math.min(item.product.quantity, Math.max(0, item.quantity + change))
          return { ...item, quantity: nextQty }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        tax,
        discount,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      }),
    )
    setMessage('Draft saved')
  }

  const imageUrl = (product: Product) => {
    if (!product.image) {
      return ''
    }

    if (product.image.startsWith('http')) {
      return product.image
    }

    return `/storage/${product.image}`
  }

  const printReceipt = () => {
    if (!receipt) {
      return
    }

    const lines = receipt.items
      .map(
        (item) =>
          `<tr><td>${item.product?.name ?? 'Item'}<br><small>${item.quantity} x ${Number(item.price).toFixed(2)}</small></td><td>${Number(item.total).toFixed(2)}</td></tr>`,
      )
      .join('')

    const cashierName = receipt.user?.name ?? currentUser?.name ?? 'Cashier'
    const logo = settings?.logo_path ? `<img src="/storage/${settings.logo_path}" alt="logo" />` : ''
    const headerText = settings?.header_text ? `<p class="meta">${settings.header_text}</p>` : ''
    const qrImage = qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR code" />` : ''

    const popup = window.open('', '_blank', 'width=420,height=760')
    if (!popup) {
      return
    }

    popup.document.write(`
      <html>
        <head>
          <title>Receipt #${receipt.id}</title>
          <style>
            @page { size: 80mm auto; margin: 4mm; }
            * { box-sizing: border-box; }
            body {
              width: 72mm;
              font-family: 'Noto Sans Myanmar', 'Segoe UI', Arial, sans-serif;
              margin: 0 auto;
              color: #111827;
            }
            h1 { font-size: 14px; margin: 0; text-align: center; }
            .logo { text-align: center; margin-bottom: 4px; }
            .logo img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; }
            .meta { text-align: center; font-size: 11px; margin-top: 2px; }
            .line { border-top: 1px dashed #9ca3af; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            td, th { font-size: 11px; padding: 4px 0; text-align: left; vertical-align: top; }
            td:last-child, th:last-child { text-align: right; }
            small { color: #6b7280; font-size: 10px; }
            .summary p {
              margin: 2px 0;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .summary p.grand {
              font-size: 13px;
              font-weight: 700;
              margin-top: 6px;
            }
            .foot { text-align: center; margin-top: 8px; font-size: 10px; color: #4b5563; }
            .qr-wrap { text-align: center; margin-top: 8px; }
            .qr { width: 96px; height: 96px; }
          </style>
        </head>
        <body>
          <div class="logo">${logo}</div>
          <h1>${settings?.shop_name ?? 'POS System'}</h1>
          ${headerText}
          <p class="meta">Receipt #${receipt.id}</p>
          <p class="meta">${new Date(receipt.created_at).toLocaleString()}</p>
          <p class="meta">Cashier: ${cashierName}</p>
          <p class="meta">Payment: ${formatReceiptPaymentMethod(receipt.payment_method)}</p>
          <div class="line"></div>
          <table>
            <thead><tr><th>Item</th><th>Total</th></tr></thead>
            <tbody>${lines}</tbody>
          </table>
          <div class="line"></div>
          <div class="summary">
            <p><span>Subtotal</span><span>${Number(receipt.subtotal).toFixed(2)}</span></p>
            <p><span>Discount</span><span>${Number(receipt.discount).toFixed(2)}</span></p>
            <p><span>Tax</span><span>${Number(receipt.tax).toFixed(2)}</span></p>
            <p class="grand"><span>TOTAL</span><span>${Number(receipt.total).toFixed(2)}</span></p>
          </div>
          <div class="line"></div>
          <div class="qr-wrap">${qrImage}</div>
          <p class="foot">Thank you. ကျေးဇူးတင်ပါတယ်။</p>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }

  const chargeSale = async () => {
    if (!cart.length) {
      setMessage('Please add products to ticket')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const payloadMethod = paymentMethod === 'wallet' ? `wallet:${walletProvider}` : paymentMethod

      const response = await api.post<SaleReceipt>('/sales', {
        payment_method: payloadMethod,
        discount: Number(discount),
        tax: Number(tax),
        items: cart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      })

      localStorage.removeItem(DRAFT_KEY)
      setCart([])
      setTax('0')
      setDiscount('0')
      setReceipt(response.data)
      setShowReceipt(true)
      setMessage('Sale created successfully')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="pos-section">
      <h2>{t('newSale')}</h2>
      <div className="pos-terminal">
        <div className="pos-catalog">
          <div className="pos-toolbar">
            <input
              type="search"
              placeholder="Search product or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="pos-category-tabs">
            <button
              type="button"
              className={activeCategory === 'all' ? 'active' : ''}
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'active' : ''}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name_en}
              </button>
            ))}
          </div>

          <div className="pos-product-grid">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className="pos-product-tile"
                disabled={!product.is_active || product.quantity <= 0}
                onClick={() => addToCart(product)}
              >
                <div className="pos-product-image">
                  {product.image ? (
                    <img src={imageUrl(product)} alt={product.name} loading="lazy" />
                  ) : (
                    <span>{product.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <strong>{product.name}</strong>
                <span>{Number(product.price).toFixed(2)}</span>
                <small>Stock {product.quantity}</small>
              </button>
            ))}
          </div>

          <div className="pos-quick-strip">
            <button
              type="button"
              className={activeCategory === 'all' ? 'active' : ''}
              onClick={() => setActiveCategory('all')}
            >
              All ({products.length})
            </button>
            {categoriesWithCount.map((category) => (
              <button
                key={`quick-${category.id}`}
                type="button"
                className={activeCategory === category.id ? 'active' : ''}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name_en} ({category.count})
              </button>
            ))}
          </div>
        </div>

        <aside className="pos-ticket">
          <header>
            <h3>Ticket</h3>
            <span>{cart.length} items</span>
          </header>

          <div className="pos-ticket-items">
            {cart.length === 0 ? <p className="muted">No items selected</p> : null}
            {cart.map((item) => (
              <div key={item.product.id} className="pos-ticket-item">
                <div>
                  <p>{item.product.name}</p>
                  <small>{Number(item.product.price).toFixed(2)} each</small>
                </div>
                <div className="qty-control">
                  <button type="button" onClick={() => updateQty(item.product.id, -1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.product.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pos-adjustments">
            <label>
              Discount
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </label>
            <label>
              Tax
              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
              />
            </label>
          </div>

          <div className="pos-payment-methods">
            <p>Payment Method</p>
            <div className="method-chips">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={paymentMethod === method ? 'active' : ''}
                  onClick={() => setPaymentMethod(method)}
                >
                  {paymentMethodLabel(method)}
                </button>
              ))}
            </div>

            {paymentMethod === 'wallet' ? (
              <label>
                Wallet Provider
                <select value={walletProvider} onChange={(event) => setWalletProvider(event.target.value)}>
                  {availableWalletProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="pos-summary">
            <p><span>Subtotal</span><strong>{subtotal.toFixed(2)}</strong></p>
            <p><span>Discount</span><strong>- {Number(discount).toFixed(2)}</strong></p>
            <p><span>Tax</span><strong>+ {Number(tax).toFixed(2)}</strong></p>
            <p className="grand"><span>Total</span><strong>{total.toFixed(2)}</strong></p>
          </div>

          <div className="pos-actions">
            <button type="button" className="ghost" onClick={saveDraft}>
              Save
            </button>
            <button type="button" className="charge" onClick={chargeSale} disabled={submitting}>
              {submitting ? 'Charging...' : 'Charge'}
            </button>
          </div>

          {message ? <p className="pos-message">{message}</p> : null}
        </aside>
      </div>

      {showReceipt && receipt ? (
        <div className="receipt-modal" role="dialog" aria-modal="true">
          <div className="receipt-card thermal">
            <header>
              <div>
                <h3>Receipt #{receipt.id}</h3>
                <small>{new Date(receipt.created_at).toLocaleString()}</small>
              </div>
              <button type="button" onClick={() => setShowReceipt(false)}>
                Close
              </button>
            </header>

            <div className="receipt-brand">
              {settings?.logo_path ? <img src={`/storage/${settings.logo_path}`} alt="Shop logo" /> : null}
              <h4>{settings?.shop_name ?? 'POS System'}</h4>
              {settings?.header_text ? <small>{settings.header_text}</small> : null}
              <small>Cashier: {receipt.user?.name ?? currentUser?.name ?? 'Cashier'}</small>
              <small>Payment: {formatReceiptPaymentMethod(receipt.payment_method)}</small>
            </div>

            <div className="receipt-items">
              {receipt.items.map((item) => (
                <p key={item.id}>
                  <span>{item.product?.name ?? 'Item'}<br /><small>{item.quantity} x {Number(item.price).toFixed(2)}</small></span>
                  <strong>{Number(item.total).toFixed(2)}</strong>
                </p>
              ))}
            </div>

            <div className="receipt-totals">
              <p><span>Subtotal</span><strong>{Number(receipt.subtotal).toFixed(2)}</strong></p>
              <p><span>Discount</span><strong>{Number(receipt.discount).toFixed(2)}</strong></p>
              <p><span>Tax</span><strong>{Number(receipt.tax).toFixed(2)}</strong></p>
              <p className="grand"><span>Total</span><strong>{Number(receipt.total).toFixed(2)}</strong></p>
            </div>

            <div className="receipt-actions">
              <button type="button" className="ghost" onClick={() => setShowReceipt(false)}>
                Continue Sale
              </button>
              <button type="button" className="charge" onClick={printReceipt}>
                Print Receipt (80mm)
              </button>
            </div>

            {qrDataUrl ? (
              <div className="receipt-qr">
                <img src={qrDataUrl} alt="Receipt QR" />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
