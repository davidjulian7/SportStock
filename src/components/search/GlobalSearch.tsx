import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Package, ArrowRight } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import type { Producto } from "@/types/database"

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase
        .from("productos")
        .select("*")
        .or(`nombre.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,equipo.ilike.%${searchQuery}%`)
        .eq("activo", true)
        .limit(10)

      setResults(data || [])
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = (producto: Producto) => {
    onOpenChange(false)
    setQuery("")
    setResults([])
    navigate(`/inventario?highlight=${producto.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            placeholder="Buscar por nombre, SKU o equipo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Buscando...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No se encontraron productos
            </div>
          )}
          {results.map((producto) => (
            <button
              key={producto.id}
              onClick={() => handleSelect(producto)}
              className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                {producto.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{producto.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  SKU: {producto.sku} | Stock: {producto.stock_actual}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
