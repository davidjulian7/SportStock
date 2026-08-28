import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase"
import type { Producto, Categoria } from "@/types/database"

export function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [productosRes, categoriasRes] = await Promise.all([
        supabase.from("productos").select("*").eq("activo", true),
        supabase.from("categorias").select("*"),
      ])

      if (productosRes.data) setProductos(productosRes.data)
      if (categoriasRes.data) setCategorias(categoriasRes.data)
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProductos = productos.filter((producto) => {
    const matchesSearch =
      producto.nombre.toLowerCase().includes(search.toLowerCase()) ||
      producto.sku.toLowerCase().includes(search.toLowerCase()) ||
      producto.equipo?.toLowerCase().includes(search.toLowerCase())
    const matchesCategoria =
      selectedCategoria === "all" || producto.categoria_id === selectedCategoria
    return matchesSearch && matchesCategoria
  })

  const getCategoriaName = (id: string) => {
    return categorias.find((c) => c.id === id)?.nombre || ""
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground">
            Gestiona tus productos y existencias
          </p>
        </div>
        <Link to="/inventario/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos ({filteredProductos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando productos...
            </div>
          ) : filteredProductos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron productos
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Talla</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell className="font-mono text-sm">
                        {producto.sku}
                      </TableCell>
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
                      <TableCell>{getCategoriaName(producto.categoria_id)}</TableCell>
                      <TableCell>{producto.talla || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            producto.stock_actual <= 5
                              ? "destructive"
                              : producto.stock_actual <= 10
                              ? "secondary"
                              : "default"
                          }
                        >
                          {producto.stock_actual}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(producto.precio_venta_min)} -{" "}
                        {formatCurrency(producto.precio_venta_max)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/inventario/${producto.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/inventario/${producto.id}/editar`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
