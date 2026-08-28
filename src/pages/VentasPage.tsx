import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { supabase } from "@/lib/supabase"
import type { Venta, Cliente } from "@/types/database"

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [ventasRes, clientesRes] = await Promise.all([
        supabase
          .from("ventas")
          .select("*")
          .order("fecha", { ascending: false }),
        supabase.from("clientes").select("*"),
      ])

      if (ventasRes.data) setVentas(ventasRes.data)
      if (clientesRes.data) setClientes(clientesRes.data)
    } catch (error) {
      console.error("Error loading sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVentas = ventas.filter((venta) => {
    const cliente = clientes.find((c) => c.id === venta.cliente_id)
    const matchesSearch =
      cliente?.nombre.toLowerCase().includes(search.toLowerCase()) ||
      venta.id.toLowerCase().includes(search.toLowerCase())
    const matchesFecha =
      (!fechaInicio || new Date(venta.fecha) >= new Date(fechaInicio)) &&
      (!fechaFin || new Date(venta.fecha) <= new Date(fechaFin))
    return matchesSearch && matchesFecha
  })

  const getClienteName = (id: string | null | undefined) => {
    if (!id) return "Sin cliente"
    return clientes.find((c) => c.id === id)?.nombre || "Desconocido"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const totalVentas = filteredVentas.reduce((sum, v) => sum + v.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">
            Historial y registro de ventas
          </p>
        </div>
        <Link to="/ventas/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalVentas)}</p>
            <p className="text-xs text-muted-foreground">
              {filteredVentas.length} transacciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Créditos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(
                ventas
                  .filter((v) => v.es_credito)
                  .reduce((sum, v) => sum + v.total, 0)
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {ventas.filter((v) => v.es_credito).length} ventas a crédito
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio por Venta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filteredVentas.length > 0 ? totalVentas / filteredVentas.length : 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando ventas...
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron ventas
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVentas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell className="font-mono text-sm">
                        {venta.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(venta.fecha)}
                        </div>
                      </TableCell>
                      <TableCell>{getClienteName(venta.cliente_id)}</TableCell>
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
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
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
