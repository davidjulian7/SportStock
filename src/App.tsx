import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { MainLayout } from "@/components/layout/MainLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { InventarioPage } from "@/pages/InventarioPage"
import { ProductoFormPage } from "@/pages/ProductoFormPage"
import { VentasPage } from "@/pages/VentasPage"
import { NuevaVentaPage } from "@/pages/NuevaVentaPage"
import { ClientesPage } from "@/pages/ClientesPage"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/inventario/nuevo" element={<ProductoFormPage />} />
            <Route path="/inventario/:id" element={<ProductoFormPage />} />
            <Route path="/inventario/:id/editar" element={<ProductoFormPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/ventas/nueva" element={<NuevaVentaPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Routes>
        </MainLayout>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
