import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { ShopSetting } from '../types'

type PaymentOption = {
  code: string
  label: string
  type: string
  enabled: boolean
  is_cash: boolean
  sort_order: number
}

const defaultOptions: PaymentOption[] = [
  { code: 'cash', label: 'Cash (MMK)', type: 'cash', enabled: true, is_cash: true, sort_order: 1 },
  { code: 'kpay', label: 'KBZPay (MMK)', type: 'wallet', enabled: true, is_cash: false, sort_order: 2 },
  { code: 'wavepay', label: 'WavePay (MMK)', type: 'wallet', enabled: true, is_cash: false, sort_order: 3 },
  { code: 'ayapay', label: 'AYA Pay (MMK)', type: 'wallet', enabled: true, is_cash: false, sort_order: 4 },
]

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const [settings, setSettings] = useState<ShopSetting | null>(null)
  const [shopName, setShopName] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>(defaultOptions)
  const [logo, setLogo] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    const response = await api.get<ShopSetting>('/shop-settings')
    setSettings(response.data)
    setShopName(response.data.shop_name)
    setHeaderText(response.data.header_text ?? '')
    setPaymentOptions(
      response.data.payment_options?.length
        ? response.data.payment_options
        : defaultOptions,
    )
  }

  useEffect(() => {
    load()
  }, [])

  if (user?.role?.slug !== 'owner') {
    return (
      <section>
        <h2>Shop Settings</h2>
        <p className="error">Only owner can manage shop settings.</p>
      </section>
    )
  }

  const updateOption = (index: number, patch: Partial<PaymentOption>) => {
    setPaymentOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    )
  }

  const addOption = () => {
    setPaymentOptions((current) => [
      ...current,
      {
        code: `option_${current.length + 1}`,
        label: 'New Option (MMK)',
        type: 'wallet',
        enabled: true,
        is_cash: false,
        sort_order: current.length + 1,
      },
    ])
  }

  const removeOption = (index: number) => {
    setPaymentOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const formData = new FormData()
    formData.append('shop_name', shopName)
    formData.append('header_text', headerText)
    formData.append('payment_options', JSON.stringify(paymentOptions))
    if (logo) {
      formData.append('logo', logo)
    }

    await api.post('/shop-settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    setMessage('Shop settings updated successfully')
    setLogo(null)
    window.dispatchEvent(new Event('shop-settings-updated'))
    load()
  }

  const onLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setLogo(file)
  }

  return (
    <section>
      <h2>Shop Settings</h2>
      <form className="settings-form" onSubmit={onSubmit}>
        <label>
          Shop Name
          <input value={shopName} onChange={(event) => setShopName(event.target.value)} required />
        </label>
        <label>
          Header Text
          <input value={headerText} onChange={(event) => setHeaderText(event.target.value)} />
        </label>

        <fieldset className="settings-options">
          <legend>Payment Options</legend>
          <div className="payment-option-list">
            {paymentOptions.map((option, index) => (
              <div key={`${option.code}-${index}`} className="payment-option-item">
                <input value={option.code} onChange={(event) => updateOption(index, { code: event.target.value })} placeholder="code" />
                <input value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} placeholder="label" />
                <select value={option.type} onChange={(event) => updateOption(index, { type: event.target.value })}>
                  <option value="cash">cash</option>
                  <option value="wallet">wallet</option>
                  <option value="bank">bank</option>
                  <option value="card">card</option>
                  <option value="other">other</option>
                </select>
                <label className="settings-check-item"><input type="checkbox" checked={option.enabled} onChange={(event) => updateOption(index, { enabled: event.target.checked })} /><span>Enabled</span></label>
                <label className="settings-check-item"><input type="checkbox" checked={option.is_cash} onChange={(event) => updateOption(index, { is_cash: event.target.checked })} /><span>Cash</span></label>
                <button type="button" onClick={() => removeOption(index)}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption}>+ Add Payment Option</button>
        </fieldset>

        <label>
          Logo
          <input type="file" accept="image/*" onChange={onLogoChange} />
        </label>

        {settings?.logo_path ? (
          <div className="settings-logo-preview">
            <img src={`/storage/${settings.logo_path}`} alt="Shop logo" />
          </div>
        ) : null}

        <button type="submit">Save Settings</button>
      </form>
      {message ? <p className="pos-message">{message}</p> : null}
    </section>
  )
}
