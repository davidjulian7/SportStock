import { useState, useEffect } from "react"
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { supabase, isConfigured } from "@/lib/supabase"
import type { Venta, Producto } from "@/types/database"

export function DashboardPage() {
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([])
  const [ventasMes, setVentasMes] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

      const [ventasHoyRes, ventasMesRes, productosRes] = await Promise.all([
        supabase
          .from("ventas")
          .select("*")
          .gte("fecha", hoy.toISOString()),
        supabase
          .from("ventas")
          .select("*")
          .gte("fecha", inicioMes.toISOString()),
        supabase
          .from("productos")
          .select("*")
          .eq("activo", true)
          .order("stock_actual", { ascending: true }),
      ])

      if (ventasHoyRes.data) setVentasHoy(ventasHoyRes.data)
      if (ventasMesRes.data) setVentasMes(ventasMesRes.data)
      if (productosRes.data) setProductos(productosRes.data)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)
  const totalVentasMes = ventasMes.reduce((sum, v) => sum + v.total, 0)
  const productosBajos = productos.filter((p) => p.stock_actual <= 5)
  const productosMasVendidos = productos
    .sort((a, b) => b.stock_actual - a.stock_actual)
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>Supabase no configurado.</strong> Edita el archivo <code>.env</code> con tus credenciales de Supabase para conectar la base de datos.
          </p>
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen de tu negocio
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas Hoy
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVentasHoy)}</div>
            <p className="text-xs text-muted-foreground">
              {ventasHoy.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ventas del Mes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalVentasMes)}</div>
            <p className="text-xs text-muted-foreground">
              {ventasMes.length} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productos en Stock
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productos.length}</div>
            <p className="text-xs text-muted-foreground">
              {productosBajos.length} con stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stock Bajo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {productosBajos.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren reabastecimiento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productosBajos.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No hay productos con stock bajo
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productosBajos.map((producto) => (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            {producto.equipo && (
                              <p className="text-sm text-muted-foreground">
                                {producto.equipo}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {producto.sku}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {producto.stock_actual}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top selling products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
              Productos Más Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosMasVendidos.map((producto, index) => (
                    <TableRow key={producto.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            {producto.equipo && (
                              <p className="text-sm text-muted-foreground">
                                {producto.equipo}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {producto.sku}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">
                          {producto.stock_actual}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {ventasHoy.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No hay ventas hoy
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventasHoy.slice(0, 5).map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell>
                        {new Date(venta.fecha).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {venta.canal.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {venta.metodo_pago}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(venta.total)}
                      </TableCell>
                      <TableCell>
                        {venta.es_credito ? (
                          <Badge variant="secondary">Crédito</Badge>
                        ) : (
                          <Badge variant="default">Pagada</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
