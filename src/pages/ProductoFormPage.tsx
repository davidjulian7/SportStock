import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Categoria, Proveedor } from "@/types/database"

interface ProductoForm {
  sku: string
  nombre: string
  categoria_id: string
  equipo: string
  talla: string
  color: string
  estilo: string
  proveedor_id: string
  costo_unitario: number
  precio_venta_min: number
  precio_venta_max: number
  stock_actual: number
  sobre_pedido: boolean
}

export function ProductoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [form, setForm] = useState<ProductoForm>({
    sku: "",
    nombre: "",
    categoria_id: "",
    equipo: "",
    talla: "",
    color: "",
    estilo: "",
    proveedor_id: "",
    costo_unitario: 0,
    precio_venta_min: 0,
    precio_venta_max: 0,
    stock_actual: 0,
    sobre_pedido: false,
  })

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (id) {
      loadProducto(id)
    }
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [categoriasRes, proveedoresRes] = await Promise.all([
        supabase.from("categorias").select("*"),
        supabase.from("proveedores").select("*"),
      ])

      if (categoriasRes.data) setCategorias(categoriasRes.data)
      if (proveedoresRes.data) setProveedores(proveedoresRes.data)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducto(productoId: string) {
    try {
      const { data } = await supabase
        .from("productos")
        .select("*")
        .eq("id", productoId)
        .single()

      if (data) {
        setForm({
          sku: data.sku,
          nombre: data.nombre,
          categoria_id: data.categoria_id,
          equipo: data.equipo || "",
          talla: data.talla || "",
          color: data.color || "",
          estilo: data.estilo || "",
        proveedor_id: data.proveedor_id || "",
        costo_unitario: data.costo_unitario,
        precio_venta_min: data.precio_venta_min,
        precio_venta_max: data.precio_venta_max,
        stock_actual: data.stock_actual,
        sobre_pedido: data.sobre_pedido,
      })
    }
    } catch (error) {
      console.error("Error loading product:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("productos")
          .update(form)
          .eq("id", id)

        if (error) throw error

        toast({
          title: "Producto actualizado",
          description: "El producto se ha actualizado correctamente",
        })
      } else {
        const { error } = await supabase.from("productos").insert([form])

        if (error) throw error

        toast({
          title: "Producto creado",
          description: "El producto se ha creado correctamente",
        })
      }

      navigate("/inventario")
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al guardar el producto",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function generateSku() {
    const prefix = form.nombre.substring(0, 3).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    setForm({ ...form, sku: `${prefix}-${random}` })
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inventario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Ej: JER-001"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateSku}>
                    Generar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={form.categoria_id}
                  onValueChange={(value) => setForm({ ...form, categoria_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipo">Equipo</Label>
                <Input
                  id="equipo"
                  value={form.equipo}
                  onChange={(e) => setForm({ ...form, equipo: e.target.value })}
                  placeholder="Ej: Real Madrid, Barcelona"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="talla">Talla</Label>
                  <Input
                    id="talla"
                    value={form.talla}
                    onChange={(e) => setForm({ ...form, talla: e.target.value })}
                    placeholder="Ej: M, L, 42"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="Ej: Negro, Blanco"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estilo">Estilo</Label>
                <Select
                  value={form.estilo}
                  onValueChange={(value) => setForm({ ...form, estilo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actual">Actual</SelectItem>
                    <SelectItem value="temporada_anterior">Temporada Anterior</SelectItem>
                    <SelectItem value="retro">Retro</SelectItem>
                    <SelectItem value="especial">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor</Label>
                <Select
                  value={form.proveedor_id}
                  onValueChange={(value) => setForm({ ...form, proveedor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>
                        {prov.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precios y Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="costo">Costo Unitario</Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costo_unitario}
                  onChange={(e) =>
                    setForm({ ...form, costo_unitario: parseFloat(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio_min">Precio Mínimo</Label>
                  <Input
                    id="precio_min"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_venta_min}
                    onChange={(e) =>
                      setForm({ ...form, precio_venta_min: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_max">Precio Máximo</Label>
                  <Input
                    id="precio_max"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio_venta_max}
                    onChange={(e) =>
                      setForm({ ...form, precio_venta_max: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Actual</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock_actual}
                  onChange={(e) =>
                    setForm({ ...form, stock_actual: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sobre_pedido"
                  checked={form.sobre_pedido}
                  onChange={(e) => setForm({ ...form, sobre_pedido: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="sobre_pedido">Disponible sobre pedido</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/inventario")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Producto"}
          </Button>
        </div>
      </form>
    </div>
  )
}
