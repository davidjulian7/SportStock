import { useState, useEffect } from "react"
import { Plus, Search, Edit, Phone, Tag } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Cliente, ClienteTipo } from "@/types/database"

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    tipo: "ocasional" as ClienteTipo,
    descuento_especial_pct: 0,
    producto_favorito: "",
  })

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .order("nombre")

      if (data) setClientes(data)
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nombre.toLowerCase().includes(search.toLowerCase()) ||
    cliente.telefono?.includes(search)
  )

  function openDialog(cliente?: Cliente) {
    if (cliente) {
      setEditingCliente(cliente)
      setForm({
        nombre: cliente.nombre,
        telefono: cliente.telefono || "",
        tipo: cliente.tipo,
        descuento_especial_pct: cliente.descuento_especial_pct,
        producto_favorito: cliente.producto_favorito || "",
      })
    } else {
      setEditingCliente(null)
      setForm({
        nombre: "",
        telefono: "",
        tipo: "ocasional",
        descuento_especial_pct: 0,
        producto_favorito: "",
      })
    }
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingCliente) {
        const { error } = await supabase
          .from("clientes")
          .update(form)
          .eq("id", editingCliente.id)

        if (error) throw error

        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han actualizado",
        })
      } else {
        const { error } = await supabase.from("clientes").insert([form])

        if (error) throw error

        toast({
          title: "Cliente creado",
          description: "El cliente se ha registrado correctamente",
        })
      }

      setDialogOpen(false)
      loadClientes()
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al guardar el cliente",
        variant: "destructive",
      })
    }
  }

  const getTipoBadge = (tipo: ClienteTipo) => {
    const variants: Record<ClienteTipo, "default" | "secondary" | "outline"> = {
      ocasional: "outline",
      recurrente: "default",
      recomendado: "secondary",
      redes_sociales: "outline",
    }
    return variants[tipo]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tu base de clientes
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes ({filteredClientes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando clientes...
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron clientes
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descuento</TableHead>
                    <TableHead>Producto Favorito</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        {cliente.nombre}
                      </TableCell>
                      <TableCell>
                        {cliente.telefono ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {cliente.telefono}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTipoBadge(cliente.tipo)}>
                          {cliente.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cliente.descuento_especial_pct > 0 ? (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4 text-green-600" />
                            {cliente.descuento_especial_pct}%
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{cliente.producto_favorito || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(cliente)}
                        >
                          <Edit className="h-4 w-4" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm({ ...form, tipo: v as ClienteTipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ocasional">Ocasional</SelectItem>
                  <SelectItem value="recurrente">Recurrente</SelectItem>
                  <SelectItem value="recomendado">Recomendado</SelectItem>
                  <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descuento">Descuento Especial (%)</Label>
              <Input
                id="descuento"
                type="number"
                min="0"
                max="100"
                value={form.descuento_especial_pct}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descuento_especial_pct: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="favorito">Producto Favorito</Label>
              <Input
                id="favorito"
                value={form.producto_favorito}
                onChange={(e) =>
                  setForm({ ...form, producto_favorito: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCliente ? "Guardar Cambios" : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
