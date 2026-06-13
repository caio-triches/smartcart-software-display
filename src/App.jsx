import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Apple,
  Banana,
  Beef,
  Clock3,
  Carrot,
  Copy,
  Coffee,
  CreditCard,
  Croissant,
  CupSoda,
  Fish,
  Grape,
  Milk,
  PackagePlus,
  Popcorn,
  QrCode,
  ReceiptText,
  RefreshCcw,
  Scale,
  ScanLine,
  ShoppingCart,
  Trash2,
  Wheat,
  Wifi,
  X,
} from 'lucide-react'
import { QRCode } from 'react-qr-code'
import './App.css'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const DEVICE_ID = import.meta.env.VITE_DEVICE_ID || 'SC-DISPLAY-01'
const CART_PAGE_SIZE = 4

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

const ICONS = {
  Apple,
  Banana,
  Beef,
  Carrot,
  Coffee,
  Croissant,
  CupSoda,
  Fish,
  Grape,
  Milk,
  PackagePlus,
  Popcorn,
  Wheat,
}

function withIcon(item) {
  return {
    ...item,
    icon: ICONS[item.icon] || PackagePlus,
  }
}

function normalizeCart(cart) {
  return (cart?.items ?? []).map((item) => withIcon({
    ...item,
    id: item.id,
    productId: item.productId,
  }))
}

function apiErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.message || fallback
}

function createTransactionId() {
  return `SC-${Date.now().toString(36).toUpperCase()}`
}

function crc16(payload) {
  let crc = 0xffff

  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

function tlv(id, value) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

function removeAccents(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function generatePixPayload(value, transactionId) {
  const pixKey = '11955238901'
  const merchantName = removeAccents('Smartcart').slice(0, 25).toUpperCase()
  const merchantCity = removeAccents('Joinville').slice(0, 15).toUpperCase()
  const txid = transactionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'SMARTCART'
  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey)
  const additionalData = tlv('05', txid)

  const payload =
    tlv('00', '01') +
    tlv('26', merchantAccount) +
    tlv('52', '0000') +
    tlv('53', '986') +
    tlv('54', Number(value).toFixed(2)) +
    tlv('58', 'BR') +
    tlv('59', merchantName) +
    tlv('60', merchantCity) +
    tlv('62', additionalData) +
    '6304'

  return payload + crc16(payload)
}

function luhn(value) {
  const digits = value.replace(/\D/g, '')
  let sum = 0
  let odd = true

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i])
    if (!odd) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    odd = !odd
  }

  return digits.length >= 13 && sum % 10 === 0
}

function maskCard(value) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function maskExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

function formatQuantity(product) {
  if (product.soldByWeight) {
    return `${product.quantity.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`
  }

  return `${product.quantity}x`
}

function formatHistoryQuantity(item) {
  const quantity = Number(item.quantity)
  if (item.unit === 'kg') {
    return `${quantity.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`
  }

  return `${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}x`
}

function statusLabel(status) {
  const labels = {
    active: 'Ativo',
    paid: 'Pago',
    cancelled: 'Cancelado',
  }

  return labels[status] || status
}

function ProductMark({ product }) {
  const Icon = product.icon

  return (
    <span
      className="product-mark"
      style={{ background: product.color, color: product.accent }}
      aria-hidden="true"
    >
      <Icon size={26} strokeWidth={2.35} />
    </span>
  )
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'error' || toast.type === 'confirm' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          {toast.actions?.length > 0 && (
            <div className="toast-actions">
              {toast.actions.map((action) => (
                <button key={action.label} type="button" className={action.variant || ''} onClick={action.onClick}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fechar notificacao">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}

function CartItem({ product, onRemove }) {
  const subtotal = product.price * product.quantity

  return (
    <li className="cart-item">
      <ProductMark product={product} />
      <div className="item-copy">
        <span>{product.category}</span>
        <strong>{product.name}</strong>
        <p>{product.soldByWeight ? `${BRL.format(product.price)}/kg` : `${BRL.format(product.price)} un.`}</p>
      </div>
      <div className="item-actions">
        <strong>{BRL.format(subtotal)}</strong>
        <span>{formatQuantity(product)}</span>
        <button type="button" onClick={() => onRemove(product.id)} aria-label={`Remover ${product.name}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  )
}

function DisplayTab({ active, icon, label, onClick }) {
  return (
    <button type="button" className={`tab ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}

function SensorModal({ products, cartProducts, onConfirm, onClose, saving }) {
  const [selectedQuantities, setSelectedQuantities] = useState({})
  const selectedProducts = products.flatMap((product) => (
    selectedQuantities[product.id]
      ? [{ ...product, selectedQuantity: selectedQuantities[product.id] }]
      : []
  ))
  const selectedTotal = selectedProducts.reduce((total, product) => total + product.selectedQuantity, 0)

  function increaseProduct(productId) {
    setSelectedQuantities((items) => ({
      ...items,
      [productId]: (items[productId] ?? 0) + 1,
    }))
  }

  function handleConfirm() {
    if (selectedTotal === 0) return
    onConfirm(selectedProducts)
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="sensor-title">
      <div className="modal">
        <header className="modal-header">
          <div>
            <span>Sensor automatico</span>
            <h2 id="sensor-title">Produtos detectaveis</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar sensor">
            <X size={18} />
          </button>
        </header>
        <div className="sensor-grid">
          {products.map((product) => {
            const added = cartProducts
              .filter((item) => item.productId === product.id)
              .reduce((total, item) => total + item.quantity, 0)
            const selectedQuantity = selectedQuantities[product.id] ?? 0

            return (
              <button
                key={product.id}
                type="button"
                className={`sensor-product ${selectedQuantity ? 'selected' : ''}`}
                onClick={() => increaseProduct(product.id)}
                aria-pressed={selectedQuantity > 0}
              >
                <ProductMark product={product} />
                <span>
                  <strong>{product.name}</strong>
                  <small>{selectedQuantity ? `${selectedQuantity}x selecionado` : added ? `${added} no carrinho` : product.category}</small>
                </span>
                <b>{BRL.format(product.price)}</b>
              </button>
            )
          })}
        </div>
        <footer className="modal-actions">
          <span>{selectedTotal} selecionado{selectedTotal === 1 ? '' : 's'}</span>
          <button type="button" onClick={handleConfirm} disabled={saving || selectedTotal === 0}>
            Confirmar
          </button>
        </footer>
      </div>
    </div>
  )
}

function WeightModal({ products, onSubmit, onClose }) {
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [weight, setWeight] = useState('0,65')
  const selected = products.find((product) => product.id === Number(productId))
  const parsedWeight = Number(weight.replace(',', '.'))
  const validWeight = selected && parsedWeight > 0
  const subtotal = validWeight ? selected.price * parsedWeight : 0

  function handleSubmit(event) {
    event.preventDefault()
    if (!validWeight) return
    onSubmit({ ...selected, quantity: Number(parsedWeight.toFixed(3)) })
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="weight-title">
      <form className="modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <div>
            <span>Hortifruti na balanca</span>
            <h2 id="weight-title">Adicionar por peso</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar pesagem">
            <X size={18} />
          </button>
        </header>

        <div className="weight-products">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className={`weight-product ${product.id === Number(productId) ? 'selected' : ''}`}
              onClick={() => setProductId(product.id)}
            >
              <ProductMark product={product} />
              <span>
                <strong>{product.name}</strong>
                <small>{BRL.format(product.price)}/kg</small>
              </span>
            </button>
          ))}
        </div>

        <label className="weight-input">
          <span>Peso detectado</span>
          <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" />
          <b>kg</b>
        </label>

        <div className="weight-summary">
          <span>Subtotal estimado</span>
          <strong>{BRL.format(subtotal)}</strong>
        </div>

        <button type="submit" className="primary-action" disabled={!validWeight}>
          <Scale size={16} />
          Confirmar pesagem
        </button>
      </form>
    </div>
  )
}

function HistoryPanel({ sessions, orders, selectedHistory, loadingHistory, onRefresh, onOpenSession, onOpenOrder }) {
  const PAGE_SIZE = 5
  const recentOrders = orders.slice(0, 3)
  const [sessionPage, setSessionPage] = useState(1)
  const totalSessionPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const currentSessionPage = Math.min(sessionPage, totalSessionPages)
  const visibleSessions = sessions.slice((currentSessionPage - 1) * PAGE_SIZE, currentSessionPage * PAGE_SIZE)

  return (
    <div className="history-grid">
      <section className="history-panel">
        <div className="panel-title">
          <div>
            <span>Historico do sistema</span>
            <h2>Sessoes do carrinho</h2>
          </div>
          <button type="button" className="panel-icon-action" onClick={onRefresh} disabled={loadingHistory} aria-label="Atualizar historico">
            <RefreshCcw size={18} className={loadingHistory ? 'spin-icon' : ''} />
          </button>
        </div>

        {sessions.length ? (
          <>
            <div className="history-list">
              {visibleSessions.map((session) => (
                <button key={session.id} type="button" className="history-row" onClick={() => onOpenSession(session.id)}>
                  <span className={`status-dot ${session.status}`} />
                  <span>
                    <strong>{session.deviceId}</strong>
                    <small>Sessao #{session.id} - {statusLabel(session.status)}</small>
                  </span>
                  <b>{BRL.format(session.total)}</b>
                </button>
              ))}
            </div>
            <Pagination
              page={currentSessionPage}
              totalPages={totalSessionPages}
              totalItems={sessions.length}
              onPrev={() => setSessionPage((page) => Math.max(1, page - 1))}
              onNext={() => setSessionPage((page) => Math.min(totalSessionPages, page + 1))}
            />
          </>
        ) : (
          <div className="empty-state compact">
            <Clock3 size={40} />
            <strong>Nenhuma sessao encontrada</strong>
            <span>Use o carrinho para gerar historico.</span>
          </div>
        )}
      </section>

      <aside className="history-side">
        <div className="summary-card">
          <div className="summary-heading">
            <ReceiptText size={18} />
            <strong>Pedidos</strong>
          </div>
          <div className="order-list">
            {recentOrders.length ? recentOrders.map((order) => (
                <button key={order.id} type="button" className="order-row" onClick={() => onOpenOrder(order.id)}>
                  <span>
                    <strong>Pedido #{order.id}</strong>
                    <small>{order.paymentMethod.toUpperCase()} - {statusLabel(order.status)}</small>
                  </span>
                  <b>{BRL.format(order.total)}</b>
                </button>
              )) : (
              <p className="muted-copy">Nenhum pedido finalizado.</p>
            )}
          </div>
          {orders.length > 3 && <p className="recent-note">Mostrando os 3 pedidos mais recentes.</p>}
        </div>

        <div className="summary-card history-detail">
          <div className="summary-heading">
            <ShoppingCart size={18} />
            <strong>Detalhes</strong>
          </div>
          {selectedHistory ? (
            <>
              <p className="detail-kicker">{selectedHistory.type === 'order' ? `Pedido #${selectedHistory.id}` : `Sessao #${selectedHistory.session?.id}`}</p>
              <div className="detail-items">
                {(selectedHistory.items ?? []).map((item) => (
                  <div key={`${item.id}-${item.productId}`} className="detail-item">
                    <span>{item.name}</span>
                    <strong>{formatHistoryQuantity(item)} - {BRL.format(item.subtotal)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-copy">Selecione uma sessao ou pedido para ver os itens.</p>
          )}
        </div>
      </aside>
    </div>
  )
}

function Pagination({ page, totalPages, totalItems, onPrev, onNext, label = 'registros', className = '' }) {
  return (
    <div className={`pagination ${className}`}>
      <span>{totalItems} {label}</span>
      <div>
        <button type="button" onClick={onPrev} disabled={page <= 1}>Anterior</button>
        <strong>{page}/{totalPages}</strong>
        <button type="button" onClick={onNext} disabled={page >= totalPages}>Proxima</button>
      </div>
    </div>
  )
}

function App() {
  const [cartProducts, setCartProducts] = useState([])
  const [products, setProducts] = useState([])
  const [sessions, setSessions] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState(null)
  const [toasts, setToasts] = useState([])
  const [screen, setScreen] = useState('cart')
  const [cartPage, setCartPage] = useState(1)
  const [reading, setReading] = useState(false)
  const [generatingPix, setGeneratingPix] = useState(false)
  const [sensorOpen, setSensorOpen] = useState(false)
  const [weightOpen, setWeightOpen] = useState(false)
  const [payment, setPayment] = useState({
    method: 'pix',
    pixReady: false,
    copied: false,
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    transactionId: '',
  })

  const totals = useMemo(() => {
    return cartProducts.reduce(
      (acc, product) => ({
        items: acc.items + (product.soldByWeight ? 1 : product.quantity),
        total: acc.total + product.price * product.quantity,
      }),
      { items: 0, total: 0 },
    )
  }, [cartProducts])

  const pixPayload = useMemo(() => {
    const txid = payment.transactionId || 'SMARTCARTDISPLAY'
    return generatePixPayload(totals.total, txid)
  }, [payment.transactionId, totals.total])
  const finalTotal = order?.total ?? totals.total

  const cardIsValid = payment.cardName.trim().length >= 3
    && luhn(payment.cardNumber)
    && /^\d{2}\/\d{2}$/.test(payment.cardExpiry)
    && payment.cardCvv.length >= 3

  const sensorProducts = products.filter((product) => !product.soldByWeight)
  const weightedProducts = products.filter((product) => product.soldByWeight)
  const totalCartPages = Math.max(1, Math.ceil(cartProducts.length / CART_PAGE_SIZE))
  const currentCartPage = Math.min(cartPage, totalCartPages)
  const visibleCartProducts = cartProducts.slice((currentCartPage - 1) * CART_PAGE_SIZE, currentCartPage * CART_PAGE_SIZE)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const [sessionsResponse, ordersResponse] = await Promise.all([
        api.get('/sessions'),
        api.get('/order'),
      ])
      setSessions(sessionsResponse.data.sessions ?? [])
      setOrders(ordersResponse.data.orders ?? [])
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel carregar o historico.'))
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    async function loadDisplay() {
      try {
        const [productsResponse, cartResponse] = await Promise.all([
          api.get('/product'),
          api.get(`/cart/${DEVICE_ID}`),
        ])

        setProducts((productsResponse.data.products ?? []).map(withIcon))
        setCartProducts(normalizeCart(cartResponse.data.cart))
        loadHistory()
      } catch (error) {
        notify('error', apiErrorMessage(error, 'Nao foi possivel carregar o backend.'))
      } finally {
        setLoading(false)
      }
    }

    loadDisplay()
  }, [loadHistory])

  async function openSession(sessionId) {
    try {
      const response = await api.get(`/sessions/${sessionId}`)
      setSelectedHistory({ type: 'session', ...response.data.cart })
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel abrir a sessao.'))
    }
  }

  async function openOrder(orderId) {
    try {
      const response = await api.get(`/order/${orderId}`)
      setSelectedHistory({ type: 'order', ...response.data.order })
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel abrir o pedido.'))
    }
  }

  function notify(type, message, options = {}) {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((items) => [...items, { id, type, message, actions: options.actions }].slice(-4))
    if (!options.persist) {
      window.setTimeout(() => {
        setToasts((items) => items.filter((toast) => toast.id !== id))
      }, 3400)
    }
  }

  function dismissToast(id) {
    setToasts((items) => items.filter((toast) => toast.id !== id))
  }

  function closeSensorModal() {
    setSensorOpen(false)
    setToasts((items) => items.filter((toast) => toast.context !== 'sensor'))
  }

  function confirmSensorProducts(productsToAdd) {
    if (productsToAdd.length === 0) {
      notify('error', 'Selecione pelo menos um produto.')
      return
    }

    const id = `${Date.now()}-${Math.random()}`
    const productCount = productsToAdd.reduce((total, product) => total + product.selectedQuantity, 0)
    const message = `Deseja adicionar ${productCount} ${productCount === 1 ? 'item selecionado' : 'itens selecionados'} ao carrinho?`

    setToasts((items) => [
      ...items,
      {
        id,
        type: 'confirm',
        context: 'sensor',
        message,
        actions: [
          {
            label: 'Cancelar',
            variant: 'ghost',
            onClick: () => dismissToast(id),
          },
          {
            label: 'Adicionar',
            onClick: () => {
              dismissToast(id)
              addSensorProducts(productsToAdd)
            },
          },
        ],
      },
    ].slice(-4))
  }

  async function addSensorProducts(productsToAdd) {
    if (saving) return
    setSaving(true)

    try {
      let latestCart = null

      for (const product of productsToAdd) {
        const response = await api.post(`/cart/${DEVICE_ID}/item`, {
          product_id: product.id,
          quantity: product.selectedQuantity,
          source: 'sensor',
        })
        latestCart = response.data.cart
      }

      if (latestCart) setCartProducts(normalizeCart(latestCart))
      closeSensorModal()
      const productCount = productsToAdd.reduce((total, product) => total + product.selectedQuantity, 0)
      notify('success', `${productCount} ${productCount === 1 ? 'produto adicionado' : 'produtos adicionados'} ao carrinho.`)
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel adicionar os produtos selecionados.'))
    } finally {
      setSaving(false)
    }
  }

  async function addWeightedProduct(product, options = {}) {
    if (saving) return
    setSaving(true)

    try {
      const response = await api.post(`/cart/${DEVICE_ID}/item`, {
        product_id: product.id,
        weight: product.quantity,
        source: 'scale',
      })
      setCartProducts(normalizeCart(response.data.cart))
      setWeightOpen(false)
      if (!options.silent) notify('success', `${product.name} adicionado com ${formatQuantity(product)}.`)
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel adicionar o item pesado.'))
    } finally {
      setSaving(false)
    }
  }

  async function removeProduct(itemId) {
    const product = cartProducts.find((item) => item.id === itemId)

    try {
      const response = await api.delete(`/cart/${DEVICE_ID}/item/${itemId}`)
      setCartProducts(normalizeCart(response.data.cart))
      if (product) notify('success', `${product.name} removido.`)
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel remover o item.'))
    }
  }

  async function resetDemo() {
    try {
      const response = await api.delete(`/cart/${DEVICE_ID}`)
      setCartProducts(normalizeCart(response.data.cart))
      notify('success', response.data.message || 'Carrinho reiniciado.')
      loadHistory()
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel reiniciar o carrinho.'))
    }

    setScreen('cart')
    setOrder(null)
    setPayment({
      method: 'pix',
      pixReady: false,
      copied: false,
      cardName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
      transactionId: '',
    })
    setGeneratingPix(false)
  }

  function goToPayment() {
    if (!cartProducts.length) {
      notify('error', 'Adicione pelo menos um produto antes do pagamento.')
      return
    }
    setScreen('payment')
  }

  function simulateRead() {
    if (reading) {
      notify('error', 'A leitura automatica ja esta em andamento.')
      return
    }

    setReading(true)
    notify('success', 'Leitura automatica iniciada.')

    window.setTimeout(async () => {
      try {
        const response = await api.post(`/cart/${DEVICE_ID}/scan`)
        const added = response.data.added ? withIcon(response.data.added) : null
        setCartProducts(normalizeCart(response.data.cart))

        if (added?.soldByWeight) {
          notify('success', `Leitura simulada: ${added.name} com ${added.quantity.toLocaleString('pt-BR')} kg.`)
        } else if (added) {
          notify('success', `Leitura simulada: ${added.name} detectado.`)
        } else {
          notify('success', response.data.message || 'Leitura simulada salva.')
        }
      } catch (error) {
        notify('error', apiErrorMessage(error, 'Nao foi possivel simular a leitura.'))
      } finally {
        setReading(false)
      }
    }, 1000)
  }

  function confirmPayment(event) {
    event.preventDefault()

    if (!cartProducts.length) {
      notify('error', 'Carrinho vazio. Simule uma leitura antes de pagar.')
      return
    }

    if (payment.method === 'pix' && !payment.pixReady) {
      if (generatingPix) {
        notify('error', 'O QR Code PIX ja esta sendo gerado.')
        return
      }

      setGeneratingPix(true)
      notify('success', 'Gerando QR Code PIX.')
      window.setTimeout(() => {
        setPayment((current) => ({ ...current, pixReady: true, transactionId: createTransactionId() }))
        setGeneratingPix(false)
        notify('success', 'QR Code PIX gerado com sucesso.')
      }, 1000)
      return
    }

    if (payment.method === 'card' && !cardIsValid) {
      notify('error', 'Preencha um cartao valido para finalizar.')
      return
    }
    finalizeCheckout('card', payment.transactionId || createTransactionId())
  }

  function copyPix() {
    navigator.clipboard?.writeText(pixPayload)
    setPayment((current) => ({ ...current, copied: true }))
    notify('success', 'Codigo PIX copiado.')
  }

  async function finishPixPayment() {
    if (!payment.pixReady) {
      notify('error', 'Gere o QR Code PIX antes de confirmar o pagamento.')
      return
    }

    await finalizeCheckout('pix', payment.transactionId || createTransactionId())
  }

  async function finalizeCheckout(method, transactionId) {
    if (saving) return
    setSaving(true)

    try {
      const response = await api.post(`/cart/${DEVICE_ID}/checkout`, {
        method,
        transaction_id: transactionId,
      })
      setOrder(response.data.order)
      setCartProducts(normalizeCart(response.data.order ? { items: response.data.order.items } : null))
      setScreen('confirmation')
      notify('success', response.data.message || 'Compra finalizada e salva.')
      loadHistory()
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Nao foi possivel finalizar a compra.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="display-page">
      <section className="device-frame" aria-label="SmartCart display">
        <div className="display-shell">
          <header className="display-header">
            <div className="brand-lockup">
              <div className="brand-mark">
                <ShoppingCart size={21} />
              </div>
              <div>
                <span>SmartCart</span>
                <h1>Display interativo</h1>
              </div>
            </div>
            <div className="connection-pill">
              <Wifi size={15} />
              Carrinho {DEVICE_ID} online
            </div>
          </header>

          {screen !== 'confirmation' && (
            <nav className="tabs" aria-label="Paginas do display">
              <DisplayTab active={screen === 'cart'} icon={<ShoppingCart size={16} />} label="Carrinho" onClick={() => setScreen('cart')} />
              <DisplayTab active={screen === 'payment'} icon={<CreditCard size={16} />} label="Pagamento" onClick={goToPayment} />
              <DisplayTab active={screen === 'history'} icon={<Clock3 size={16} />} label="Historico" onClick={() => { setScreen('history'); loadHistory() }} />
            </nav>
          )}

          {screen === 'cart' && (
            <div className="screen-grid">
              <section className="cart-panel">
                <div className="panel-title">
                  <div>
                    <span>Compra em andamento</span>
                    <h2>Produtos no carrinho</h2>
                  </div>
                  <ScanLine size={22} />
                </div>

                {loading ? (
                  <div className="empty-state">
                    <RefreshCcw size={44} className="spin-icon" />
                    <strong>Conectando ao backend</strong>
                    <span>Carregando produtos e sessao do carrinho.</span>
                  </div>
                ) : cartProducts.length ? (
                  <>
                    <ul className="cart-list">
                      {visibleCartProducts.map((product) => (
                        <CartItem key={product.id} product={product} onRemove={removeProduct} />
                      ))}
                    </ul>
                    {cartProducts.length > CART_PAGE_SIZE && (
                      <Pagination
                        page={currentCartPage}
                        totalPages={totalCartPages}
                        totalItems={cartProducts.length}
                        label="itens"
                        className="cart-pagination"
                        onPrev={() => setCartPage((page) => Math.max(1, page - 1))}
                        onNext={() => setCartPage((page) => Math.min(totalCartPages, page + 1))}
                      />
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <ShoppingCart size={44} />
                    <strong>Carrinho vazio</strong>
                    <span>Aproxime um produto do sensor para iniciar.</span>
                  </div>
                )}
              </section>

              <aside className="side-panel">
                <div className="sensor-card">
                  <span>Entrada de produtos</span>
                  <button type="button" className="simulation-action" onClick={simulateRead} disabled={reading || loading || saving}>
                    {reading ? <RefreshCcw size={17} className="spin-icon" /> : <ScanLine size={17} />}
                    {reading ? 'Lendo sensor...' : 'Simular leitura'}
                  </button>
                  <button type="button" onClick={() => setSensorOpen(true)} disabled={loading || saving || sensorProducts.length === 0}>
                    <PackagePlus size={17} />
                    Adicionar por sensor
                  </button>
                  <button type="button" onClick={() => setWeightOpen(true)} disabled={loading || saving || weightedProducts.length === 0}>
                    <Scale size={17} />
                    Adicionar por peso
                  </button>
                </div>

                <div className="summary-card">
                  <div className="summary-heading">
                    <ReceiptText size={18} />
                    <strong>Resumo</strong>
                  </div>
                  <div className="summary-row">
                    <span>Itens</span>
                    <strong>{totals.items.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="summary-total">
                    <span>Total</span>
                    <strong>{BRL.format(totals.total)}</strong>
                  </div>
                  <button type="button" className="primary-action" onClick={goToPayment} aria-disabled={!cartProducts.length}>
                    <CreditCard size={17} />
                    Ir para pagamento
                  </button>
                  <button type="button" className="ghost-action" onClick={resetDemo}>
                    <RefreshCcw size={16} />
                    Reiniciar
                  </button>
                </div>
              </aside>
            </div>
          )}

          {screen === 'payment' && (
            <form className="payment-grid" onSubmit={confirmPayment}>
              <section className="payment-panel">
                <div className="panel-title">
                  <div>
                    <span>Pagamento integrado</span>
                    <h2>Finalizar compra</h2>
                  </div>
                  <CreditCard size={22} />
                </div>

                <div className="payment-methods">
                  <button
                    type="button"
                    className={payment.method === 'pix' ? 'selected' : ''}
                    onClick={() => setPayment((current) => ({ ...current, method: 'pix', pixReady: false }))}
                  >
                    <QrCode size={18} />
                    PIX
                  </button>
                  <button
                    type="button"
                    className={payment.method === 'card' ? 'selected' : ''}
                    onClick={() => setPayment((current) => ({ ...current, method: 'card', pixReady: false }))}
                  >
                    <CreditCard size={18} />
                    Cartao
                  </button>
                </div>

                {payment.method === 'pix' ? (
                  payment.pixReady ? (
                    <div className="pix-box">
                      <div className="qr-box">
                        <QRCode value={pixPayload} size={168} />
                      </div>
                      <div className="pix-copy">
                        <strong>Pague com PIX</strong>
                        <span>Escaneie o QR Code ou copie o codigo para simular a aprovacao.</span>
                        <code>{pixPayload}</code>
                        <button type="button" className="ghost-action" onClick={copyPix}>
                          {payment.copied ? <Check size={15} /> : <Copy size={15} />}
                          {payment.copied ? 'Copiado' : 'Copiar PIX'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="payment-hint">
                      <QrCode size={42} />
                      <strong>PIX direto no display</strong>
                      <span>Ao confirmar, o carrinho gera um QR Code para pagar {BRL.format(totals.total)}.</span>
                    </div>
                  )
                ) : (
                  <div className="card-form">
                    <label>
                      Nome no cartao
                      <input value={payment.cardName} onChange={(event) => setPayment((current) => ({ ...current, cardName: event.target.value.toUpperCase() }))} placeholder="NOME SOBRENOME" />
                    </label>
                    <label>
                      Numero
                      <input value={payment.cardNumber} onChange={(event) => setPayment((current) => ({ ...current, cardNumber: maskCard(event.target.value) }))} placeholder="0000 0000 0000 0000" />
                    </label>
                    <label>
                      Validade
                      <input value={payment.cardExpiry} onChange={(event) => setPayment((current) => ({ ...current, cardExpiry: maskExpiry(event.target.value) }))} placeholder="MM/AA" />
                    </label>
                    <label>
                      CVV
                      <input value={payment.cardCvv} onChange={(event) => setPayment((current) => ({ ...current, cardCvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="000" />
                    </label>
                  </div>
                )}
              </section>

              <aside className="summary-card payment-summary">
                <div className="summary-heading">
                  <ReceiptText size={18} />
                  <strong>Resumo</strong>
                </div>
                <div className="summary-row">
                  <span>Itens</span>
                  <strong>{totals.items.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</strong>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <strong>{BRL.format(totals.total)}</strong>
                </div>
                {payment.method === 'pix' && payment.pixReady ? (
                  <button type="button" className="primary-action" onClick={finishPixPayment}>
                    <CheckCircle2 size={17} />
                    Ja paguei
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="primary-action"
                    aria-disabled={(payment.method === 'card' && !cardIsValid) || generatingPix}
                    disabled={generatingPix}
                  >
                    {generatingPix ? <RefreshCcw size={17} className="spin-icon" /> : <CheckCircle2 size={17} />}
                    {payment.method === 'pix'
                      ? (generatingPix ? 'Gerando PIX...' : 'Gerar QR Code')
                      : 'Finalizar pedido'}
                  </button>
                )}
              </aside>
            </form>
          )}

          {screen === 'history' && (
            <HistoryPanel
              sessions={sessions}
              orders={orders}
              selectedHistory={selectedHistory}
              loadingHistory={loadingHistory}
              onRefresh={loadHistory}
              onOpenSession={openSession}
              onOpenOrder={openOrder}
            />
          )}

          {screen === 'confirmation' && (
            <section className="confirmation-panel">
              <CheckCircle2 size={62} />
              <span>Pagamento aprovado</span>
              <h2>Compra concluida</h2>
              <p>{BRL.format(finalTotal)} registrado no carrinho {DEVICE_ID}.</p>
              <button type="button" className="primary-action" onClick={resetDemo}>
                <RefreshCcw size={17} />
                Nova compra
              </button>
            </section>
          )}

          {sensorOpen && (
            <SensorModal
              products={sensorProducts}
              cartProducts={cartProducts}
              onConfirm={confirmSensorProducts}
              onClose={closeSensorModal}
              saving={saving}
            />
          )}

          {weightOpen && (
            <WeightModal
              products={weightedProducts}
              onSubmit={addWeightedProduct}
              onClose={() => setWeightOpen(false)}
            />
          )}

          <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
      </section>
    </main>
  )
}

export default App
