import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { Category, PaginatedResponse, Product, ShopSetting } from '../types'

type CartItem = {
  product_id: number
  quantity: number
}

type PaymentDraft = {
  id: string
  payment_code: string
  payment_label: string
  payment_type: string
  is_cash: boolean
  amount: string
}

type ReceiptPayment = {
  id: number
  payment_code: string
  payment_label: string
  payment_type: string
  is_cash: boolean
  amount: string
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
  change_amount: string
  payment_method: string
  user?: {
    name: string
  }
  items: ReceiptItem[]
  payments: ReceiptPayment[]
}

type PaymentOption = {
  code: string
  label: string
  type: string
  enabled: boolean
  is_cash: boolean
  sort_order: number
}

type SaleTab = {
  id: string
  label: number
  step: 1 | 2 | 3
  cart: CartItem[]
  discount: string
  tax: string
  search: string
  activeCategory: number | 'all'
  selectedPaymentCode: string
  paymentEntry: string
  payments: PaymentDraft[]
  receipt: SaleReceipt | null
}

const TAB_SESSION_KEY = 'pos_sale_tabs_v2'

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 100000)}`

const createEmptyTab = (label: number): SaleTab => ({
  id: createId(),
  label,
  step: 1,
  cart: [],
  discount: '0',
  tax: '0',
  search: '',
  activeCategory: 'all',
  selectedPaymentCode: 'cash',
  paymentEntry: '',
  payments: [],
  receipt: null,
})

const toNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export default function SalesPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.user)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<ShopSetting | null>(null)
  const [tabs, setTabs] = useState<SaleTab[]>([createEmptyTab(1)])
  const [activeTabId, setActiveTabId] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const paymentEntryRef = useRef<HTMLInputElement | null>(null)

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? createEmptyTab(1),
    [tabs, activeTabId],
  )

  const paymentOptions = useMemo(() => {
    const options = settings?.payment_options
    if (!Array.isArray(options) || options.length === 0) {
      return [
        { code: 'cash', label: 'Cash (MMK)', type: 'cash', enabled: true, is_cash: true, sort_order: 1 },
        { code: 'kpay', label: 'KBZPay (MMK)', type: 'wallet', enabled: true, is_cash: false, sort_order: 2 },
      ] as PaymentOption[]
    }

    return [...options]
      .filter((option): option is PaymentOption => !!option && option.enabled)
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [settings])

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

    const stored = localStorage.getItem(TAB_SESSION_KEY)
    if (!stored) {
      const firstTab = createEmptyTab(1)
      setTabs([firstTab])
      setActiveTabId(firstTab.id)
      return
    }

    try {
      const parsed = JSON.parse(stored) as { activeTabId: string; tabs: SaleTab[] }
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        setTabs(parsed.tabs)
        setActiveTabId(parsed.activeTabId || parsed.tabs[0].id)
      }
    } catch {
      localStorage.removeItem(TAB_SESSION_KEY)
    }
  }, [])

  useEffect(() => {
    if (!tabs.length) {
      return
    }

    localStorage.setItem(TAB_SESSION_KEY, JSON.stringify({ activeTabId, tabs }))
  }, [tabs, activeTabId])

  useEffect(() => {
    if (!tabs.length) {
      return
    }

    if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id)
    }
  }, [tabs, activeTabId])

  useEffect(() => {
    if (!activeTab || paymentOptions.length === 0) {
      return
    }

    const exists = paymentOptions.some((option) => option.code === activeTab.selectedPaymentCode)
    if (!exists) {
      setTabs((previous) =>
        previous.map((tab) =>
          tab.id === activeTab.id ? { ...tab, selectedPaymentCode: paymentOptions[0].code } : tab,
        ),
      )
    }
  }, [activeTab, paymentOptions])

  useEffect(() => {
    if (!activeTab.receipt) {
      setQrDataUrl('')
      return
    }

    const payload = [
      `receipt:${activeTab.receipt.id}`,
      `date:${activeTab.receipt.created_at}`,
      `total:${Number(activeTab.receipt.total).toFixed(2)}`,
      `change:${Number(activeTab.receipt.change_amount).toFixed(2)}`,
    ].join('|')

    QRCode.toDataURL(payload, { margin: 1, width: 180 })
      .then((dataUrl: string) => setQrDataUrl(dataUrl))
      .catch(() => setQrDataUrl(''))
  }, [activeTab.receipt])

  useEffect(() => {
    if (activeTab.step !== 2) {
      return
    }

    const timer = window.setTimeout(() => {
      paymentEntryRef.current?.focus()
      paymentEntryRef.current?.select()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [activeTab.step, activeTab.id])

  const updateActiveTab = (updater: (tab: SaleTab) => SaleTab) => {
    setTabs((previous) => previous.map((tab) => (tab.id === activeTab.id ? updater(tab) : tab)))
  }

  const resolvedCart = useMemo(
    () =>
      activeTab.cart
        .map((item) => {
          const product = products.find((entry) => entry.id === item.product_id)
          return product ? { ...item, product } : null
        })
        .filter((item): item is CartItem & { product: Product } => item !== null),
    [activeTab.cart, products],
  )

  const filteredProducts = useMemo(() => {
    const search = activeTab.search.toLowerCase()
    return products.filter((product) => {
      const inCategory =
        activeTab.activeCategory === 'all' || product.category_id === activeTab.activeCategory
      const inSearch =
        product.name.toLowerCase().includes(search) || product.sku.toLowerCase().includes(search)
      return inCategory && inSearch
    })
  }, [products, activeTab.activeCategory, activeTab.search])

  const categoriesWithCount = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: products.filter((product) => product.category_id === category.id).length,
      })),
    [categories, products],
  )

  const subtotal = useMemo(
    () => resolvedCart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [resolvedCart],
  )

  const totalDue = Math.max(0, subtotal + toNumber(activeTab.tax) - toNumber(activeTab.discount))
  const tendered = useMemo(
    () => activeTab.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    [activeTab.payments],
  )
  const hasCashPayment = useMemo(
    () => activeTab.payments.some((payment) => payment.is_cash),
    [activeTab.payments],
  )
  const changeAmount = Math.max(0, tendered - totalDue)

  const addToCart = (product: Product) => {
    if (!product.is_active || product.quantity <= 0) {
      return
    }

    setMessage('')
    updateActiveTab((tab) => {
      const found = tab.cart.find((item) => item.product_id === product.id)
      if (!found) {
        return { ...tab, cart: [...tab.cart, { product_id: product.id, quantity: 1 }] }
      }

      return {
        ...tab,
        cart: tab.cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) }
            : item,
        ),
      }
    })
  }

  const updateQty = (productId: number, change: number) => {
    updateActiveTab((tab) => ({
      ...tab,
      cart: tab.cart
        .map((item) => {
          if (item.product_id !== productId) {
            return item
          }

          const product = products.find((entry) => entry.id === item.product_id)
          const maxQty = product?.quantity ?? item.quantity
          const nextQty = Math.min(maxQty, Math.max(0, item.quantity + change))
          return { ...item, quantity: nextQty }
        })
        .filter((item) => item.quantity > 0),
    }))
  }

  const addTab = () => {
    const nextLabel = Math.max(...tabs.map((tab) => tab.label), 0) + 1
    const newTab = createEmptyTab(nextLabel)
    setTabs((previous) => [...previous, newTab])
    setActiveTabId(newTab.id)
    setMessage('')
  }

  const closeTab = (tabId: string) => {
    const tab = tabs.find((entry) => entry.id === tabId)
    if (!tab) {
      return
    }

    if (tab.cart.length > 0) {
      const confirmed = window.confirm('This tab has items. Close it?')
      if (!confirmed) {
        return
      }
    }

    if (tabs.length === 1) {
      setTabs((previous) => previous.map((entry) => (entry.id === tabId ? createEmptyTab(entry.label) : entry)))
      return
    }

    const index = tabs.findIndex((entry) => entry.id === tabId)
    const nextTabs = tabs.filter((entry) => entry.id !== tabId)
    setTabs(nextTabs)
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[Math.max(0, index - 1)].id)
    }
  }

  const gotoPayment = () => {
    if (activeTab.cart.length === 0) {
      setMessage('Please add products first')
      return
    }
    updateActiveTab((tab) => ({ ...tab, step: 2 }))
    setMessage('')
  }

  const gotoStep = (step: 1 | 2 | 3) => {
    if (step === 1) {
      updateActiveTab((tab) => ({ ...tab, step: 1 }))
      setMessage('')
      return
    }

    if (step === 2) {
      if (activeTab.cart.length === 0) {
        setMessage('Please add products first')
        return
      }
      updateActiveTab((tab) => ({ ...tab, step: 2 }))
      setMessage('')
      return
    }

    if (!activeTab.receipt) {
      setMessage('Validate payment first to view receipt')
      return
    }

    updateActiveTab((tab) => ({ ...tab, step: 3 }))
    setMessage('')
  }

  const keypadInput = (value: string) => {
    updateActiveTab((tab) => ({ ...tab, paymentEntry: `${tab.paymentEntry}${value}` }))
  }

  const keypadBackspace = () => {
    updateActiveTab((tab) => ({ ...tab, paymentEntry: tab.paymentEntry.slice(0, -1) }))
  }

  const keypadClear = () => {
    updateActiveTab((tab) => ({ ...tab, paymentEntry: '' }))
  }

  const addPaymentLine = () => {
    const option = paymentOptions.find((entry) => entry.code === activeTab.selectedPaymentCode)
    if (!option) {
      return
    }

    const amount = toNumber(activeTab.paymentEntry)
    if (amount <= 0) {
      return
    }

    updateActiveTab((tab) => ({
      ...tab,
      paymentEntry: '',
      payments: [
        ...tab.payments,
        {
          id: createId(),
          payment_code: option.code,
          payment_label: option.label,
          payment_type: option.type,
          is_cash: !!option.is_cash,
          amount: amount.toFixed(2),
        },
      ],
    }))

    window.setTimeout(() => {
      paymentEntryRef.current?.focus()
    }, 0)
  }

  const handlePaymentEntryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    addPaymentLine()
  }

  const removePaymentLine = (lineId: string) => {
    updateActiveTab((tab) => ({ ...tab, payments: tab.payments.filter((line) => line.id !== lineId) }))
  }

  const paymentRuleError = useMemo(() => {
    if (tendered + 0.00001 < totalDue) {
      return 'Tendered amount is less than due amount.'
    }

    if (!hasCashPayment && tendered - totalDue > 0.00001) {
      return 'Overpay is allowed only when cash is included.'
    }

    return ''
  }, [tendered, totalDue, hasCashPayment])

  const canValidate = activeTab.payments.length > 0 && paymentRuleError === ''

  const validateSale = async () => {
    if (!canValidate) {
      setMessage(paymentRuleError || 'Please complete payment first')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const response = await api.post<SaleReceipt>('/sales', {
        discount: toNumber(activeTab.discount),
        tax: toNumber(activeTab.tax),
        items: activeTab.cart,
        payments: activeTab.payments.map((line) => ({
          payment_code: line.payment_code,
          amount: toNumber(line.amount),
        })),
      })

      updateActiveTab((tab) => ({ ...tab, step: 3, receipt: response.data }))
      setMessage('Sale validated successfully')
    } finally {
      setSubmitting(false)
    }
  }

  const nextOrder = () => {
    updateActiveTab((tab) => ({
      ...tab,
      step: 1,
      cart: [],
      discount: '0',
      tax: '0',
      search: '',
      activeCategory: 'all',
      selectedPaymentCode: paymentOptions[0]?.code ?? 'cash',
      paymentEntry: '',
      payments: [],
      receipt: null,
    }))
    setMessage('')
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
    const receipt = activeTab.receipt
    if (!receipt) {
      return
    }

    const itemsHtml = receipt.items
      .map(
        (item) =>
          `<tr><td>${item.product?.name ?? 'Item'}<br><small>${item.quantity} x ${Number(item.price).toFixed(2)}</small></td><td>${Number(item.total).toFixed(2)}</td></tr>`,
      )
      .join('')

    const paymentsHtml = receipt.payments
      .map(
        (payment) =>
          `<p><span>${payment.payment_label}</span><span>${Number(payment.amount).toFixed(2)}</span></p>`,
      )
      .join('')

    const logo = settings?.logo_path ? `<img src="/storage/${settings.logo_path}" alt="logo" />` : ''
    const headerText = settings?.header_text ? `<p class="meta">${settings.header_text}</p>` : ''
    const qrImage = qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR code" />` : ''
    const cashierName = receipt.user?.name ?? currentUser?.name ?? 'Cashier'

    const popup = window.open('', '_blank', 'width=420,height=760')
    if (!popup) {
      return
    }

    popup.document.write(`
      <html><head><title>Receipt #${receipt.id}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        * { box-sizing: border-box; }
        body { width: 72mm; font-family: 'Noto Sans Myanmar', 'Segoe UI', Arial, sans-serif; margin: 0 auto; color: #111827; }
        h1 { font-size: 14px; margin: 0; text-align: center; }
        .logo { text-align: center; margin-bottom: 4px; }
        .logo img { width: 56px; height: 56px; object-fit: cover; border-radius: 6px; }
        .meta { text-align: center; font-size: 11px; margin-top: 2px; }
        .line { border-top: 1px dashed #9ca3af; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        td, th { font-size: 11px; padding: 4px 0; text-align: left; vertical-align: top; }
        td:last-child, th:last-child { text-align: right; }
        small { color: #6b7280; font-size: 10px; }
        .summary p { margin: 2px 0; display: flex; justify-content: space-between; font-size: 11px; }
        .summary p.grand { font-size: 13px; font-weight: 700; margin-top: 6px; }
        .foot { text-align: center; margin-top: 8px; font-size: 10px; color: #4b5563; }
        .qr-wrap { text-align: center; margin-top: 8px; }
        .qr { width: 96px; height: 96px; }
      </style></head>
      <body>
        <div class="logo">${logo}</div>
        <h1>${settings?.shop_name ?? 'POS System'}</h1>
        ${headerText}
        <p class="meta">Receipt #${receipt.id}</p>
        <p class="meta">${new Date(receipt.created_at).toLocaleString()}</p>
        <p class="meta">Cashier: ${cashierName}</p>
        <div class="line"></div>
        <table><thead><tr><th>Item</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <div class="line"></div>
        <div class="summary">
          <p><span>Subtotal</span><span>${Number(receipt.subtotal).toFixed(2)}</span></p>
          <p><span>Discount</span><span>${Number(receipt.discount).toFixed(2)}</span></p>
          <p><span>Tax</span><span>${Number(receipt.tax).toFixed(2)}</span></p>
          <p class="grand"><span>Total</span><span>${Number(receipt.total).toFixed(2)}</span></p>
          ${paymentsHtml}
          <p><span>Change</span><span>${Number(receipt.change_amount).toFixed(2)}</span></p>
        </div>
        <div class="line"></div>
        <div class="qr-wrap">${qrImage}</div>
        <p class="foot">Thank you. ကျေးဇူးတင်ပါတယ်။</p>
      </body></html>
    `)

    popup.document.close()
    popup.focus()
    popup.print()
  }

  return (
    <section className="pos-section">
      <h2>{t('newSale')}</h2>

      <div className="pos-sale-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`pos-sale-tab ${activeTab.id === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.label}</span>
            <small>{tab.cart.length}</small>
            <i onClick={(event) => { event.stopPropagation(); closeTab(tab.id) }}>x</i>
          </button>
        ))}
        <button type="button" className="pos-tab-add" onClick={addTab}>+</button>
      </div>

      <div className="pos-stepper">
        <button type="button" className={activeTab.step === 1 ? 'active' : ''} onClick={() => gotoStep(1)}>
          1. Order
        </button>
        <button type="button" className={activeTab.step === 2 ? 'active' : ''} onClick={() => gotoStep(2)}>
          2. Payment
        </button>
        <button type="button" className={activeTab.step === 3 ? 'active' : ''} onClick={() => gotoStep(3)}>
          3. Receipt
        </button>
      </div>

      {activeTab.step === 1 ? (
        <div className="pos-terminal">
          <div className="pos-catalog">
            <div className="pos-toolbar">
              <input
                type="search"
                placeholder="Search product or SKU"
                value={activeTab.search}
                onChange={(event) => updateActiveTab((tab) => ({ ...tab, search: event.target.value }))}
              />
            </div>

            <div className="pos-category-tabs">
              <button
                type="button"
                className={activeTab.activeCategory === 'all' ? 'active' : ''}
                onClick={() => updateActiveTab((tab) => ({ ...tab, activeCategory: 'all' }))}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={activeTab.activeCategory === category.id ? 'active' : ''}
                  onClick={() => updateActiveTab((tab) => ({ ...tab, activeCategory: category.id }))}
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
                className={activeTab.activeCategory === 'all' ? 'active' : ''}
                onClick={() => updateActiveTab((tab) => ({ ...tab, activeCategory: 'all' }))}
              >
                All ({products.length})
              </button>
              {categoriesWithCount.map((category) => (
                <button
                  key={`quick-${category.id}`}
                  type="button"
                  className={activeTab.activeCategory === category.id ? 'active' : ''}
                  onClick={() => updateActiveTab((tab) => ({ ...tab, activeCategory: category.id }))}
                >
                  {category.name_en} ({category.count})
                </button>
              ))}
            </div>
          </div>

          <aside className="pos-ticket">
            <header>
              <h3>Ticket #{activeTab.label}</h3>
              <span>{resolvedCart.length} items</span>
            </header>

            <div className="pos-ticket-items">
              {resolvedCart.length === 0 ? <p className="muted">No items selected</p> : null}
              {resolvedCart.map((item) => (
                <div key={item.product.id} className="pos-ticket-item">
                  <div>
                    <p>{item.product.name}</p>
                    <small>{Number(item.product.price).toFixed(2)} each</small>
                  </div>
                  <div className="qty-control">
                    <button type="button" onClick={() => updateQty(item.product.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQty(item.product.id, 1)}>+</button>
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
                  value={activeTab.discount}
                  onChange={(event) => updateActiveTab((tab) => ({ ...tab, discount: event.target.value }))}
                />
              </label>
              <label>
                Tax
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={activeTab.tax}
                  onChange={(event) => updateActiveTab((tab) => ({ ...tab, tax: event.target.value }))}
                />
              </label>
            </div>

            <div className="pos-summary">
              <p><span>Subtotal</span><strong>{subtotal.toFixed(2)}</strong></p>
              <p><span>Discount</span><strong>- {toNumber(activeTab.discount).toFixed(2)}</strong></p>
              <p><span>Tax</span><strong>+ {toNumber(activeTab.tax).toFixed(2)}</strong></p>
              <p className="grand"><span>Total</span><strong>{totalDue.toFixed(2)}</strong></p>
            </div>

            <div className="pos-actions">
              <button type="button" className="ghost" onClick={() => setMessage('Session auto-saved')}>Save</button>
              <button type="button" className="charge" onClick={gotoPayment}>Payment</button>
            </div>
          </aside>
        </div>
      ) : null}

      {activeTab.step === 2 ? (
        <div className="pos-payment-layout">
          <aside className="payment-method-panel">
            <button type="button" className="ghost" onClick={() => updateActiveTab((tab) => ({ ...tab, step: 1 }))}>
              &lt; Back
            </button>
            {paymentOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                className={activeTab.selectedPaymentCode === option.code ? 'active' : ''}
                onClick={() => {
                  updateActiveTab((tab) => ({ ...tab, selectedPaymentCode: option.code }))
                  window.setTimeout(() => {
                    paymentEntryRef.current?.focus()
                  }, 0)
                }}
              >
                {option.label}
              </button>
            ))}
          </aside>

          <section className="payment-center-panel">
            <div className="payment-summary-grid">
              <article><span>Due</span><strong>{totalDue.toFixed(2)}</strong></article>
              <article><span>Tendered</span><strong>{tendered.toFixed(2)}</strong></article>
              <article><span>Change</span><strong>{changeAmount.toFixed(2)}</strong></article>
            </div>

            <div className="payment-lines">
              {activeTab.payments.map((line) => (
                <div key={line.id} className="payment-line-item">
                  <span>{line.payment_label}</span>
                  <strong>{toNumber(line.amount).toFixed(2)}</strong>
                  <button type="button" onClick={() => removePaymentLine(line.id)}>x</button>
                </div>
              ))}
            </div>

            <div className="payment-entry">
              <input
                ref={paymentEntryRef}
                value={activeTab.paymentEntry}
                onChange={(event) => updateActiveTab((tab) => ({ ...tab, paymentEntry: event.target.value }))}
                onKeyDown={handlePaymentEntryKeyDown}
                placeholder="Enter amount"
              />
              <button type="button" onClick={addPaymentLine}>Add Payment</button>
            </div>

            <div className="payment-keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '.'].map((key) => (
                <button key={key} type="button" onClick={() => keypadInput(key)}>{key}</button>
              ))}
              <button type="button" onClick={keypadBackspace}>⌫</button>
              <button type="button" onClick={keypadClear}>C</button>
            </div>

            {paymentRuleError ? <p className="error">{paymentRuleError}</p> : null}

            <div className="payment-actions">
              <button type="button" className="charge" disabled={!canValidate || submitting} onClick={validateSale}>
                {submitting ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab.step === 3 && activeTab.receipt ? (
        <div className="receipt-final-screen">
          <h3>Change: {Number(activeTab.receipt.change_amount).toFixed(2)} MMK</h3>
          <div className="receipt-card thermal">
            <div className="receipt-brand">
              {settings?.logo_path ? <img src={`/storage/${settings.logo_path}`} alt="Shop logo" /> : null}
              <h4>{settings?.shop_name ?? 'POS System'}</h4>
              {settings?.header_text ? <small>{settings.header_text}</small> : null}
              <small>Cashier: {activeTab.receipt.user?.name ?? currentUser?.name ?? 'Cashier'}</small>
            </div>

            <div className="receipt-items">
              {activeTab.receipt.items.map((item) => (
                <p key={item.id}>
                  <span>{item.product?.name ?? 'Item'}<br /><small>{item.quantity} x {Number(item.price).toFixed(2)}</small></span>
                  <strong>{Number(item.total).toFixed(2)}</strong>
                </p>
              ))}
            </div>

            <div className="receipt-totals">
              <p><span>Subtotal</span><strong>{Number(activeTab.receipt.subtotal).toFixed(2)}</strong></p>
              <p><span>Discount</span><strong>{Number(activeTab.receipt.discount).toFixed(2)}</strong></p>
              <p><span>Tax</span><strong>{Number(activeTab.receipt.tax).toFixed(2)}</strong></p>
              <p className="grand"><span>Total</span><strong>{Number(activeTab.receipt.total).toFixed(2)}</strong></p>
              {activeTab.receipt.payments.map((payment) => (
                <p key={payment.id}><span>{payment.payment_label}</span><strong>{Number(payment.amount).toFixed(2)}</strong></p>
              ))}
              <p><span>Change</span><strong>{Number(activeTab.receipt.change_amount).toFixed(2)}</strong></p>
            </div>

            {qrDataUrl ? (
              <div className="receipt-qr">
                <img src={qrDataUrl} alt="Receipt QR" />
              </div>
            ) : null}

            <div className="receipt-actions">
              <button type="button" className="ghost" onClick={printReceipt}>Print Receipt</button>
              <button type="button" className="charge" onClick={nextOrder}>Next Order</button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="pos-message">{message}</p> : null}
    </section>
  )
}
