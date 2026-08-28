export type UserRole = 'admin' | 'vendedor'

export type MovimientoTipo = 'entrada' | 'salida' | 'ajuste' | 'merma'

export type PedidoEstado = 'solicitado' | 'pagado' | 'en_transito' | 'recibido'

export type ClienteTipo = 'ocasional' | 'recurrente' | 'recomendado' | 'redes_sociales'

export type VentaCanal = 'directa' | 'catalogo' | 'local' | 'redes_sociales'

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: UserRole
  activo: boolean
}

export interface Categoria {
  id: string
  nombre: string
}

export interface Proveedor {
  id: string
  nombre: string
  contacto: string
  metodo_pago: string
  tiempo_entrega_promedio_dias: number
}

export interface Producto {
  id: string
  sku: string
  nombre: string
  categoria_id: string
  equipo?: string
  talla?: string
  color?: string
  estilo?: string
  proveedor_id?: string
  costo_unitario: number
  precio_venta_min: number
  precio_venta_max: number
  stock_actual: number
  sobre_pedido: boolean
  imagen_url?: string
  palabras_clave?: string
  activo: boolean
}

export interface MovimientoInventario {
  id: string
  producto_id: string
  tipo: MovimientoTipo
  cantidad: number
  motivo?: string
  usuario_id: string
  fecha: string
}

export interface PedidoProveedor {
  id: string
  proveedor_id: string
  fecha_pedido: string
  fecha_pago?: string
  estado: PedidoEstado
  total: number
}

export interface PedidoProveedorDetalle {
  id: string
  pedido_id: string
  producto_id: string
  cantidad: number
  costo_unitario: number
}

export interface GuiaEnvio {
  id: string
  pedido_id: string
  numero_guia: string
  fecha_generacion: string
  fecha_llegada_estimada?: string
  fecha_llegada_real?: string
  dias_transito?: number
  observaciones?: string
}

export interface Cliente {
  id: string
  nombre: string
  telefono?: string
  tipo: ClienteTipo
  descuento_especial_pct: number
  producto_favorito?: string
}

export interface Venta {
  id: string
  cliente_id?: string
  usuario_id: string
  fecha: string
  canal: VentaCanal
  metodo_pago: MetodoPago
  subtotal: number
  descuento: number
  total: number
  es_credito: boolean
}

export interface VentaDetalle {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export interface CreditoCliente {
  id: string
  cliente_id: string
  venta_id: string
  monto_total: number
  saldo_pendiente: number
  fecha_ultimo_pago: string
}

export interface AbonoCredito {
  id: string
  credito_id: string
  fecha: string
  monto: number
  metodo_pago: MetodoPago
}

export interface Gasto {
  id: string
  concepto: string
  categoria: string
  monto: number
  fecha: string
  autorizado_por: string
}
