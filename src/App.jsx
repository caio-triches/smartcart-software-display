import { useMemo, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  PackagePlus,
  QrCode,
  ReceiptText,
  RefreshCcw,
  Scale,
  ScanLine,
  ShoppingCart,
  Trash2,
  Wifi,
  X,
} from 'lucide-react'
import { QRCode } from 'react-qr-code'
import './App.css'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const PRODUCTS = [
  { id: 1, name: 'Leite Integral', price: 6.49, quantity: 1, unit: 'un', category: 'Laticinios', color: '#eff8ff', accent: '#5d9cec', icon: 'LT' },
  { id: 2, name: 'Pao de Forma', price: 9.9, quantity: 1, unit: 'un', category: 'Padaria', color: '#fff5dd', accent: '#d59632', icon: 'PA' },
  { id: 3, name: 'Cafe Torrado', price: 18.75, quantity: 1, unit: 'un', category: 'Mercearia', color: '#f2ebe5', accent: '#7b4f35', icon: 'CF' },
  { id: 4, name: 'Arroz Branco 5kg', price: 24.9, quantity: 1, unit: 'un', category: 'Mercearia', color: '#f4f6f0', accent: '#71816d', icon: 'AR' },
  { id: 5, name: 'Suco de Uva 1L', price: 12.49, quantity: 1, unit: 'un', category: 'Bebidas', color: '#f4edff', accent: '#7b55c7', icon: 'SU' },
  { id: 6, name: 'Queijo Mussarela', price: 18.9, quantity: 1, unit: 'un', category: 'Laticinios', color: '#fff8d8', accent: '#d7a800', icon: 'QJ' },
  { id: 7, name: 'Maca Gala', price: 7.99, quantity: 0.1, unit: 'kg', soldByWeight: true, category: 'Hortifruti', color: '#ffecec', accent: '#d94a4a', icon: 'MG' },
  { id: 8, name: 'Banana Prata', price: 5.99, quantity: 0.1, unit: 'kg', soldByWeight: true, category: 'Hortifruti', color: '#fff7d6', accent: '#c5a01e', icon: 'BN' },
  { id: 9, name: 'Tomate Italiano', price: 8.49, quantity: 0.1, unit: 'kg', soldByWeight: true, category: 'Hortifruti', color: '#ffe8e6', accent: '#d13d31', icon: 'TM' },
]

function createTransactionId() {
  return `SC-${Date.now().toString(36).toUpperCase()}`
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

function ProductMark({ product }) {
  return (
    <span
      className="product-mark"
      style={{ background: product.color, color: product.accent }}
      aria-hidden="true"
    >
      {product.icon}
    </span>
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

function SensorModal({ products, cartProducts, onAdd, onClose }) {
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
            const added = cartProducts.find((item) => item.id === product.id)?.quantity ?? 0

            return (
              <button key={product.id} type="button" className="sensor-product" onClick={() => onAdd(product)}>
                <ProductMark product={product} />
                <span>
                  <strong>{product.name}</strong>
                  <small>{added ? `${added} no carrinho` : product.category}</small>
                </span>
                <b>{BRL.format(product.price)}</b>
              </button>
            )
          })}
        </div>
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

function App() {
  const [cartProducts, setCartProducts] = useState([
    { ...PRODUCTS[0], quantity: 2 },
    { ...PRODUCTS[1], quantity: 1 },
    { ...PRODUCTS[2], quantity: 1 },
    { ...PRODUCTS[6], quantity: 0.85 },
  ])
  const [screen, setScreen] = useState('cart')
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
    return `00020126330014BR.GOV.BCB.PIX011111955238901520400005303986540${totals.total.toFixed(2).length}${totals.total.toFixed(2)}5802BR5910SMARTCART6009JOINVILLE621405${txid.slice(0, 9)}6304`
  }, [payment.transactionId, totals.total])

  const sensorProducts = PRODUCTS.filter((product) => !product.soldByWeight)
  const weightedProducts = PRODUCTS.filter((product) => product.soldByWeight)
  const cardIsValid = payment.cardName.trim().length >= 3
    && luhn(payment.cardNumber)
    && /^\d{2}\/\d{2}$/.test(payment.cardExpiry)
    && payment.cardCvv.length >= 3

  function addProduct(product) {
    setCartProducts((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        return items.map((item) => (
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ))
      }

      return [...items, { ...product, quantity: product.soldByWeight ? product.quantity : 1 }]
    })
  }

  function addWeightedProduct(product) {
    setCartProducts((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        return items.map((item) => (
          item.id === product.id ? { ...item, quantity: Number((item.quantity + product.quantity).toFixed(3)) } : item
        ))
      }

      return [...items, product]
    })
    setWeightOpen(false)
  }

  function removeProduct(productId) {
    setCartProducts((items) => items.filter((item) => item.id !== productId))
  }

  function resetDemo() {
    setCartProducts([
      { ...PRODUCTS[0], quantity: 2 },
      { ...PRODUCTS[1], quantity: 1 },
      { ...PRODUCTS[2], quantity: 1 },
      { ...PRODUCTS[6], quantity: 0.85 },
    ])
    setScreen('cart')
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
  }

  function goToPayment() {
    if (!cartProducts.length) return
    setScreen('payment')
  }

  function confirmPayment(event) {
    event.preventDefault()

    if (payment.method === 'pix' && !payment.pixReady) {
      setPayment((current) => ({ ...current, pixReady: true, transactionId: createTransactionId() }))
      return
    }

    if (payment.method === 'card' && !cardIsValid) return
    setScreen('confirmation')
  }

  function copyPix() {
    navigator.clipboard?.writeText(pixPayload)
    setPayment((current) => ({ ...current, copied: true }))
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
              Carrinho SC-04 online
            </div>
          </header>

          <nav className="tabs" aria-label="Paginas do display">
            <DisplayTab active={screen === 'cart'} icon={<ShoppingCart size={16} />} label="Carrinho" onClick={() => setScreen('cart')} />
            <DisplayTab active={screen === 'payment'} icon={<CreditCard size={16} />} label="Pagamento" onClick={goToPayment} />
          </nav>

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

                {cartProducts.length ? (
                  <ul className="cart-list">
                    {cartProducts.map((product) => (
                      <CartItem key={product.id} product={product} onRemove={removeProduct} />
                    ))}
                  </ul>
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
                  <button type="button" onClick={() => setSensorOpen(true)}>
                    <PackagePlus size={17} />
                    Adicionar por sensor
                  </button>
                  <button type="button" onClick={() => setWeightOpen(true)}>
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
                  <button type="button" className="primary-action" onClick={goToPayment} disabled={!cartProducts.length}>
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
                  <button type="button" className="primary-action" onClick={() => setScreen('confirmation')}>
                    <CheckCircle2 size={17} />
                    Ja paguei
                  </button>
                ) : (
                  <button type="submit" className="primary-action" disabled={payment.method === 'card' && !cardIsValid}>
                    <CheckCircle2 size={17} />
                    {payment.method === 'pix' ? 'Gerar QR Code' : 'Finalizar pedido'}
                  </button>
                )}
              </aside>
            </form>
          )}

          {screen === 'confirmation' && (
            <section className="confirmation-panel">
              <CheckCircle2 size={62} />
              <span>Pagamento aprovado</span>
              <h2>Compra concluida</h2>
              <p>{BRL.format(totals.total)} registrado no carrinho SC-04.</p>
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
              onAdd={addProduct}
              onClose={() => setSensorOpen(false)}
            />
          )}

          {weightOpen && (
            <WeightModal
              products={weightedProducts}
              onSubmit={addWeightedProduct}
              onClose={() => setWeightOpen(false)}
            />
          )}
        </div>
      </section>
    </main>
  )
}

export default App
