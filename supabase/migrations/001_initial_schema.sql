-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'vendedor');
CREATE TYPE movimiento_tipo AS ENUM ('entrada', 'salida', 'ajuste', 'merma');
CREATE TYPE pedido_estado AS ENUM ('solicitado', 'pagado', 'en_transito', 'recibido');
CREATE TYPE cliente_tipo AS ENUM ('ocasional', 'recurrente', 'recomendado', 'redes_sociales');
CREATE TYPE venta_canal AS ENUM ('directa', 'catalogo', 'local', 'redes_sociales');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia', 'tarjeta');

-- Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  rol user_role NOT NULL DEFAULT 'vendedor',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorias
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proveedores
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  metodo_pago TEXT,
  tiempo_entrega_promedio_dias INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Productos
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  categoria_id UUID NOT NULL REFERENCES categorias(id),
  equipo TEXT,
  talla TEXT,
  color TEXT,
  estilo TEXT,
  proveedor_id UUID REFERENCES proveedores(id),
  costo_unitario DECIMAL(10,2) NOT NULL,
  precio_venta_min DECIMAL(10,2) NOT NULL,
  precio_venta_max DECIMAL(10,2) NOT NULL,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  sobre_pedido BOOLEAN NOT NULL DEFAULT false,
  imagen_url TEXT,
  palabras_clave TSVECTOR,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for full-text search
CREATE INDEX idx_productos_search ON productos USING GIN (palabras_clave);

-- Movimientos de inventario
CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo movimiento_tipo NOT NULL,
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pedidos a proveedor
CREATE TABLE pedidos_proveedor (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  fecha_pedido TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_pago TIMESTAMPTZ,
  estado pedido_estado NOT NULL DEFAULT 'solicitado',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Detalle de pedidos a proveedor
CREATE TABLE pedido_proveedor_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos_proveedor(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  costo_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guias de envio
CREATE TABLE guias_envio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos_proveedor(id),
  numero_guia TEXT NOT NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_llegada_estimada TIMESTAMPTZ,
  fecha_llegada_real TIMESTAMPTZ,
  dias_transito INTEGER,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  tipo cliente_tipo NOT NULL DEFAULT 'ocasional',
  descuento_especial_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  producto_favorito TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ventas
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canal venta_canal NOT NULL DEFAULT 'directa',
  metodo_pago metodo_pago NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  es_credito BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE venta_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creditos de clientes
CREATE TABLE creditos_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  venta_id UUID NOT NULL REFERENCES ventas(id),
  monto_total DECIMAL(10,2) NOT NULL,
  saldo_pendiente DECIMAL(10,2) NOT NULL,
  fecha_ultimo_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abonos a creditos
CREATE TABLE abonos_credito (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credito_id UUID NOT NULL REFERENCES creditos_clientes(id),
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago metodo_pago NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gastos
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  concepto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  autorizado_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update product search vector
CREATE OR REPLACE FUNCTION update_producto_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.palabras_clave := to_tsvector('spanish',
    COALESCE(NEW.nombre, '') || ' ' ||
    COALESCE(NEW.sku, '') || ' ' ||
    COALESCE(NEW.equipo, '') || ' ' ||
    COALESCE(NEW.color, '') || ' ' ||
    COALESCE(NEW.estilo, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update search vector
CREATE TRIGGER trg_producto_search_vector
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_producto_search_vector();

-- Function to update stock after sale
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE productos
  SET stock_actual = stock_actual - NEW.cantidad,
      updated_at = NOW()
  WHERE id = NEW.producto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stock after sale detail insert
CREATE TRIGGER trg_update_stock_after_sale
  AFTER INSERT ON venta_detalle
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

-- Function to restore stock after sale cancellation
CREATE OR REPLACE FUNCTION restore_stock_after_sale_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE productos
  SET stock_actual = stock_actual + OLD.cantidad,
      updated_at = NOW()
  WHERE id = OLD.producto_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to restore stock after sale detail delete
CREATE TRIGGER trg_restore_stock_after_sale
  AFTER DELETE ON venta_detalle
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_after_sale_cancellation();

-- Function to update credit balance after payment
CREATE OR REPLACE FUNCTION update_credit_balance_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE creditos_clientes
  SET saldo_pendiente = saldo_pendiente - NEW.monto,
      fecha_ultimo_pago = NEW.fecha,
      updated_at = NOW()
  WHERE id = NEW.credito_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update credit balance after payment
CREATE TRIGGER trg_update_credit_balance
  AFTER INSERT ON abonos_credito
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_balance_after_payment();

-- View for profit calculation
CREATE VIEW vista_utilidad AS
SELECT
  v.id as venta_id,
  v.fecha,
  vd.producto_id,
  p.nombre as producto_nombre,
  p.costo_unitario,
  vd.precio_unitario as precio_venta,
  vd.cantidad,
  (vd.precio_unitario - p.costo_unitario) * vd.cantidad as ganancia,
  ((vd.precio_unitario - p.costo_unitario) / NULLIF(p.costo_unitario, 0) * 100) as margen_porcentaje
FROM ventas v
JOIN venta_detalle vd ON v.id = vd.venta_id
JOIN productos p ON vd.producto_id = p.id;

-- Row Level Security policies
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_proveedor_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE guias_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditos_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access" ON usuarios
  FOR ALL USING (auth.uid() = id OR rol = 'admin');

CREATE POLICY "Admin full access" ON categorias
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON proveedores
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON productos
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON movimientos_inventario
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON pedidos_proveedor
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON pedido_proveedor_detalle
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON guias_envio
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON clientes
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON ventas
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON venta_detalle
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON creditos_clientes
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON abonos_credito
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access" ON gastos
  FOR ALL USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

-- Vendor can only read products and prices, and create sales
CREATE POLICY "Vendor read access" ON productos
  FOR SELECT USING (activo = true);

CREATE POLICY "Vendor read access" ON categorias
  FOR SELECT USING (true);

CREATE POLICY "Vendor read access" ON clientes
  FOR SELECT USING (true);

CREATE POLICY "Vendor create sales" ON ventas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Vendor read sales" ON ventas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Vendor create sale details" ON venta_detalle
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM ventas WHERE id = venta_id AND usuario_id = auth.uid()
  ));

CREATE POLICY "Vendor read sale details" ON venta_detalle
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM ventas WHERE id = venta_id AND usuario_id = auth.uid()
  ));
