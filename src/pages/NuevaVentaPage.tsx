import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Producto, Cliente, MetodoPago, VentaCanal } from "@/types/database"

interface VentaItem {
  producto: Producto
  cantidad: number
  precio_unitario: number
}

export function NuevaVentaPage() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [items, setItems] = useState<VentaItem[]>([])
  const [search, setSearch] = useState("")
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [canal, setCanal] = useState<VentaCanal>("directa")
  const [clienteId, setClienteId] = useState<string>("")
  const [esCredito, setEsCredito] = useState(false)
  const [descuento, setDescuento] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [productosRes, clientesRes] = await Promise.all([
        supabase.from("productos").select("*").eq("activo", true),
        supabase.from("clientes").select("*"),
      ])

      if (productosRes.data) setProductos(productosRes.data)
      if (clientesRes.data) setClientes(clientesRes.data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProductos = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  function addItem(producto: Producto) {
    const existing = items.find((i) => i.producto.id === producto.id)
    if (existing) {
      if (existing.cantidad >= producto.stock_actual && !producto.sobre_pedido) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${producto.stock_actual} unidades disponibles`,
          variant: "destructive",
        })
        return
      }
      setItems(
        items.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      )
    } else {
      setItems([
        ...items,
        {
          producto,
          cantidad: 1,
          precio_unitario: producto.precio_venta_min,
        },
      ])
    }
    setSearch("")
  }

  function removeItem(productoId: string) {
    setItems(items.filter((i) => i.producto.id !== productoId))
  }

  function updateQuantity(productoId: string, cantidad: number) {
    const item = items.find((i) => i.producto.id === productoId)
    if (!item) return

    if (cantidad > item.producto.stock_actual && !item.producto.sobre_pedido) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${item.producto.stock_actual} unidades disponibles`,
        variant: "destructive",
      })
      return
    }

    setItems(
      items.map((i) =>
        i.producto.id === productoId ? { ...i, cantidad } : i
      )
    )
  }

  function updatePrice(productoId: string, precio: number) {
    setItems(
      items.map((i) =>
        i.producto.id === productoId ? { ...i, precio_unitario: precio } : i
      )
    )
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.precio_unitario * item.cantidad,
    0
  )
  const total = subtotal - descuento

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega al menos un producto",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No authenticated")

      // Create sale
      const { data: venta, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          cliente_id: clienteId || null,
          usuario_id: user.id,
          canal,
          metodo_pago: metodoPago,
          subtotal,
          descuento,
          total,
          es_credito: esCredito,
        })
        .select()
        .single()

      if (ventaError) throw ventaError

      // Create sale details
      const detalles = items.map((item) => ({
        venta_id: venta.id,
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
      }))

      const { error: detalleError } = await supabase
        .from("venta_detalle")
        .insert(detalles)

      if (detalleError) throw detalleError

      // Create credit if needed
      if (esCredito && clienteId) {
        const { error: creditoError } = await supabase
          .from("creditos_clientes")
          .insert({
            cliente_id: clienteId,
            venta_id: venta.id,
            monto_total: total,
            saldo_pendiente: total,
          })

        if (creditoError) throw creditoError
      }

      toast({
        title: "Venta registrada",
        description: `Venta por ${formatCurrency(total)} registrada correctamente`,
      })

      navigate("/ventas")
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Hubo un error al registrar la venta",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ventas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Venta</h1>
          <p className="text-muted-foreground">Registra una nueva venta</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Product search */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    placeholder="Buscar producto por nombre o SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredProductos.slice(0, 5).map((producto) => (
                        <button
                          key={producto.id}
                          type="button"
                          onClick={() => addItem(producto)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted text-left"
                        >
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {producto.sku} | Stock: {producto.stock_actual}
                            </p>
                          </div>
                          <Badge variant={producto.stock_actual > 0 ? "default" : "destructive"}>
                            {formatCurrency(producto.precio_venta_min)}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cart items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({items.length} productos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos en el carrito
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.producto.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.producto.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.producto.sku}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.producto.id, item.cantidad - 1)
                            }
                            disabled={item.cantidad <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.cantidad}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.producto.id, item.cantidad + 1)
                            }
                          >
                            +
                          </Button>
                        </div>

                        <div className="w-24">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precio_unitario}
                            onChange={(e) =>
                              updatePrice(
                                item.producto.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24"
                          />
                        </div>

                        <p className="w-24 text-right font-medium">
                          {formatCurrency(item.precio_unitario * item.cantidad)}
                        </p>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
className="text-destructive"
                          onClick={() => removeItem(item.producto.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sale summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Venta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Canal de Venta</Label>
                  <Select value={canal} onValueChange={(v) => setCanal(v as VentaCanal)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="directa">Venta Directa</SelectItem>
                      <SelectItem value="catalogo">Catálogo</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select
                    value={metodoPago}
                    onValueChange={(v) => setMetodoPago(v as MetodoPago)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="credito"
                    checked={esCredito}
                    onChange={(e) => setEsCredito(e.target.checked)}
                    className="h-4 w-4"
                    disabled={!clienteId}
                  />
                  <Label htmlFor="credito">Venta a crédito</Label>
                </div>

                <div className="space-y-2">
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={descuento}
                    onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento</span>
                  <span className="text-destructive">-{formatCurrency(descuento)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-4">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving || items.length === 0}
                >
                  {saving ? "Procesando..." : "Confirmar Venta"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
