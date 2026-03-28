# Arquitectura Recomendada - Clean Architecture + SOLID

## 📋 Análisis Actual del Proyecto

### ❌ Problemas Identificados

1. **Ausencia de separación por capas**: Todo está mezclado en `lib/`, `react/components/`
2. **Componentes con múltiples responsabilidades** (violación SRP):
   - `OrderForm.tsx`: UI + lógica negocio + acceso datos + PDFs
   - `OrdersTable.tsx`: UI + consultas BD + lógica estado
3. **Dependencias directas y acopladas**: Componentes importan `supabase` directamente
4. **Lógica de negocio en componentes React**: Validaciones, cálculos, reglas negocio
5. **No hay inyección de dependencias**: Dependencias hardcodeadas
6. **Acceso a datos mezclado con lógica negocio**: Queries SQL en componentes
7. **Ausencia de casos de uso**: Lógica dispersa sin orquestación central

### ✅ Principios SOLID Violados

- **S (Single Responsibility)**: Componentes hacen UI + negocio + datos
- **O (Open/Closed)**: Difícil extender sin modificar código existente
- **L (Liskov Substitution)**: Interfaces inconsistentes
- **I (Interface Segregation)**: Interfaces grandes y genéricas
- **D (Dependency Inversion)**: Dependencias concretas, no abstracciones

## 🏗️ Arquitectura Recomendada

### Estructura por Capas (Clean Architecture)

```
src/
├── domain/                          # 📦 Capa de Dominio (Core Business)
│   ├── entities/                    # Entidades del negocio
│   │   ├── User.ts
│   │   ├── WorkOrder.ts
│   │   ├── Customer.ts
│   │   ├── Service.ts
│   │   └── Branch.ts
│   ├── value-objects/               # Objetos de valor
│   │   ├── Email.ts
│   │   ├── Phone.ts
│   │   ├── Money.ts
│   │   └── OrderNumber.ts
│   ├── repositories/                # Interfaces de repositorios
│   │   ├── IUserRepository.ts
│   │   ├── IWorkOrderRepository.ts
│   │   ├── ICustomerRepository.ts
│   │   └── IServiceRepository.ts
│   ├── services/                    # Servicios de dominio
│   │   ├── IOrderService.ts
│   │   ├── IPricingService.ts
│   │   └── IValidationService.ts
│   └── events/                      # Eventos de dominio
│       ├── OrderCreated.ts
│       └── OrderStatusChanged.ts
│
├── application/                     # 🚀 Capa de Aplicación (Use Cases)
│   ├── use-cases/                   # Casos de uso
│   │   ├── CreateOrderUseCase.ts
│   │   ├── UpdateOrderStatusUseCase.ts
│   │   ├── GenerateOrderPDFUseCase.ts
│   │   ├── CalculateOrderTotalUseCase.ts
│   │   └── GetOrdersListUseCase.ts
│   ├── commands/                    # Commands (escritura)
│   │   ├── CreateOrderCommand.ts
│   │   └── UpdateOrderCommand.ts
│   ├── queries/                     # Queries (lectura)
│   │   ├── GetOrderByIdQuery.ts
│   │   └── GetOrdersListQuery.ts
│   ├── handlers/                    # Command/Query Handlers
│   │   ├── CreateOrderHandler.ts
│   │   └── GetOrdersListHandler.ts
│   ├── dtos/                        # Data Transfer Objects
│   │   ├── CreateOrderDTO.ts
│   │   ├── OrderDTO.ts
│   │   └── OrderListDTO.ts
│   └── events/                      # Application Events
│       └── handlers/
│           └── SendOrderEmailHandler.ts
│
├── infrastructure/                  # 🏭 Capa de Infraestructura
│   ├── database/                    # Implementaciones de BD
│   │   ├── supabase/
│   │   │   ├── repositories/
│   │   │   │   ├── SupabaseUserRepository.ts
│   │   │   │   ├── SupabaseWorkOrderRepository.ts
│   │   │   │   └── SupabaseCustomerRepository.ts
│   │   │   ├── mappers/
│   │   │   │   ├── UserMapper.ts
│   │   │   │   └── WorkOrderMapper.ts
│   │   │   └── migrations/
│   │   └── config/
│   │       └── supabase-config.ts
│   ├── external-services/           # Servicios externos
│   │   ├── email/
│   │   │   ├── IEmailService.ts
│   │   │   ├── ResendEmailService.ts
│   │   │   └── EmailTemplates.ts
│   │   ├── pdf/
│   │   │   ├── IPDFGenerator.ts
│   │   │   ├── PDFLibGenerator.ts
│   │   │   └── PDFTemplates.ts
│   │   ├── storage/
│   │   │   ├── IStorageService.ts
│   │   │   └── SupabaseStorageService.ts
│   │   └── notifications/
│   │       ├── INotificationService.ts
│   │       └── WhatsAppService.ts
│   ├── config/                      # Configuración
│   │   ├── environment.ts
│   │   └── settings.ts
│   └── utils/                       # Utilidades técnicas
│       ├── currency.ts
│       ├── date.ts
│       └── validation.ts
│
├── presentation/                    # 🎨 Capa de Presentación
│   ├── controllers/                 # Controladores (API routes)
│   │   ├── OrderController.ts
│   │   ├── CustomerController.ts
│   │   └── UserController.ts
│   ├── react/                       # Componentes React
│   │   ├── components/
│   │   │   ├── orders/
│   │   │   │   ├── OrderForm/
│   │   │   │   │   ├── OrderForm.tsx
│   │   │   │   │   ├── OrderFormViewModel.ts
│   │   │   │   │   └── hooks/
│   │   │   │   │       └── useOrderForm.ts
│   │   │   ├── OrderList/
│   │   │   │   ├── OrdersTable.tsx
│   │   │   │   └── OrdersTableViewModel.ts
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Modal.tsx
│   │   ├── pages/                   # Páginas
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Orders.tsx
│   │   │   └── Customers.tsx
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useOrders.ts
│   │   │   ├── useCustomers.ts
│   │   │   └── useAuth.ts
│   │   └── contexts/                # Context providers
│   │       ├── AuthContext.tsx
│   │       └── NotificationContext.tsx
│   ├── view-models/                 # ViewModels (MVVM)
│   │   ├── OrderFormViewModel.ts
│   │   ├── OrdersListViewModel.ts
│   │   └── DashboardViewModel.ts
│   └── shared/                      # Compartido de presentación
│       ├── layouts/
│       │   ├── MainLayout.tsx
│       │   └── AuthLayout.tsx
│       └── ui/
│           ├── Button.tsx
│           ├── Input.tsx
│           └── Table.tsx
│
├── shared/                          # 🔗 Código Compartido
│   ├── kernel/                      # Núcleo compartido
│   │   ├── types.ts                 # Tipos base
│   │   ├── errors.ts                # Errores custom
│   │   ├── Result.ts                # Monada Result
│   │   └── Either.ts                # Monada Either
│   ├── utils/                       # Utilidades puras
│   │   ├── string.ts
│   │   ├── array.ts
│   │   └── object.ts
│   └── constants/                   # Constantes
│       ├── order-status.ts
│       └── user-roles.ts
│
├── main.ts                          # 🚀 Punto de entrada
├── App.tsx                          # Componente raíz
└── index.html                       # HTML base
```

## 📁 Descripción Detallada de Capas

### 1. Domain (Dominio) 📦
**Responsabilidades**: Reglas de negocio puras, entidades, value objects.

**Características**:
- **Independiente** de frameworks/tecnologías
- ** testable** sin dependencias externas
- **Estable** (cambia menos frecuentemente)

**Ejemplo - Domain Entity**:
```typescript
// domain/entities/WorkOrder.ts
export class WorkOrder {
  private constructor(
    private readonly id: WorkOrderId,
    private orderNumber: OrderNumber,
    private status: OrderStatus,
    private customer: Customer,
    private devices: Device[],
    private totalCost: Money
  ) {}

  static create(props: CreateWorkOrderProps): Result<WorkOrder, DomainError> {
    // Validaciones de dominio
    if (!props.customer) return Result.fail(new ValidationError("Customer required"));
    if (props.devices.length === 0) return Result.fail(new ValidationError("At least one device required"));

    return Result.ok(new WorkOrder(
      WorkOrderId.generate(),
      OrderNumber.generate(),
      OrderStatus.PENDING,
      props.customer,
      props.devices,
      Money.zero()
    ));
  }

  changeStatus(newStatus: OrderStatus): Result<void, DomainError> {
    // Reglas de negocio para cambio de estado
    if (this.status === OrderStatus.COMPLETED && newStatus !== OrderStatus.WARRANTY) {
      return Result.fail(new BusinessRuleError("Cannot change status from completed"));
    }
    this.status = newStatus;
    return Result.ok(undefined);
  }
}
```

### 2. Application (Aplicación) 🚀
**Responsabilidades**: Orquestación de casos de uso, coordinación entre dominio e infraestructura.

**Características**:
- **Coordina** llamadas a dominio e infraestructura
- **Maneja** transacciones de aplicación
- **Implementa** lógica de aplicación (no de dominio)

**Ejemplo - Use Case**:
```typescript
// application/use-cases/CreateOrderUseCase.ts
export class CreateOrderUseCase implements IUseCase<CreateOrderCommand, OrderDTO> {
  constructor(
    private readonly orderRepository: IWorkOrderRepository,
    private readonly customerRepository: ICustomerRepository,
    private readonly pricingService: IPricingService,
    private readonly pdfGenerator: IPDFGenerator,
    private readonly storageService: IStorageService
  ) {}

  async execute(command: CreateOrderCommand): Promise<Result<OrderDTO, ApplicationError>> {
    // 1. Validar y obtener customer
    const customerResult = await this.customerRepository.findById(command.customerId);
    if (customerResult.isFailure) return Result.fail(new NotFoundError("Customer not found"));

    // 2. Crear entidades de dominio
    const devices = command.devices.map(d => Device.create(d));
    const orderResult = WorkOrder.create({
      customer: customerResult.value,
      devices: devices
    });
    if (orderResult.isFailure) return Result.fail(orderResult.error);

    // 3. Calcular precios usando servicio de dominio
    const totalCost = await this.pricingService.calculateTotal(orderResult.value);

    // 4. Persistir
    const saveResult = await this.orderRepository.save(orderResult.value);
    if (saveResult.isFailure) return Result.fail(saveResult.error);

    // 5. Generar PDF (operación secundaria)
    const pdfResult = await this.pdfGenerator.generate(saveResult.value);
    if (pdfResult.isSuccess) {
      await this.storageService.upload(pdfResult.value, `orders/${saveResult.value.id}.pdf`);
    }

    // 6. Retornar DTO
    return Result.ok(OrderDTO.fromDomain(saveResult.value));
  }
}
```

### 3. Infrastructure (Infraestructura) 🏭
**Responsabilidades**: Implementaciones concretas de interfaces definidas en dominio/aplicación.

**Características**:
- **Implementa** interfaces de repositorios
- **Adapta** tecnologías externas al dominio
- **Configura** conexiones y servicios externos

**Ejemplo - Repository Implementation**:
```typescript
// infrastructure/database/supabase/repositories/SupabaseWorkOrderRepository.ts
export class SupabaseWorkOrderRepository implements IWorkOrderRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(order: WorkOrder): Promise<Result<WorkOrder, RepositoryError>> {
    try {
      const data = WorkOrderMapper.toPersistence(order);
      const { data: saved, error } = await this.supabase
        .from('work_orders')
        .insert(data)
        .select()
        .single();

      if (error) return Result.fail(new DatabaseError(error.message));

      return Result.ok(WorkOrderMapper.toDomain(saved));
    } catch (error) {
      return Result.fail(new DatabaseError(error.message));
    }
  }

  async findById(id: WorkOrderId): Promise<Result<WorkOrder | null, RepositoryError>> {
    try {
      const { data, error } = await this.supabase
        .from('work_orders')
        .select(`
          *,
          customer:customers(*),
          technician:users(*),
          sucursal:branches(*)
        `)
        .eq('id', id.value)
        .single();

      if (error) return Result.fail(new DatabaseError(error.message));
      if (!data) return Result.ok(null);

      return Result.ok(WorkOrderMapper.toDomain(data));
    } catch (error) {
      return Result.fail(new DatabaseError(error.message));
    }
  }
}
```

### 4. Presentation (Presentación) 🎨
**Responsabilidades**: Interfaz de usuario, controladores HTTP, ViewModels.

**Características**:
- **Mínima lógica** de negocio
- **Enfocada** en UX/UI
- **Dependiente** del framework (React/Astro)

**Ejemplo - ViewModel**:
```typescript
// presentation/react/components/orders/OrderForm/OrderFormViewModel.ts
export class OrderFormViewModel {
  constructor(
    private readonly createOrderUseCase: ICreateOrderUseCase,
    private readonly getCustomersUseCase: IGetCustomersUseCase,
    private readonly notificationService: INotificationService
  ) {}

  // Estado reactivo
  public customers = observable<CustomerDTO[]>([]);
  public isLoading = observable(false);
  public errors = observable<Record<string, string>>({});

  // Commands
  @action
  async createOrder(orderData: CreateOrderDTO) {
    this.isLoading.set(true);
    this.errors.set({});

    const result = await this.createOrderUseCase.execute(orderData);

    if (result.isFailure) {
      this.errors.set(this.mapErrorsToFields(result.error));
      this.notificationService.error("Error creating order");
    } else {
      this.notificationService.success("Order created successfully");
      // Navigate or emit event
    }

    this.isLoading.set(false);
  }

  @action
  async loadCustomers() {
    const result = await this.getCustomersUseCase.execute();
    if (result.isSuccess) {
      this.customers.set(result.value);
    }
  }

  private mapErrorsToFields(error: ApplicationError): Record<string, string> {
    // Map domain errors to form field errors
    if (error instanceof ValidationError) {
      return { [error.field]: error.message };
    }
    return { general: error.message };
  }
}
```

## 🔄 Flujo de Dependencias

```
Presentation → Application → Domain ← Infrastructure
     ↑            ↑            ↑          ↑
     └── React ───┴── Use Cases ──┴── Entities ─── Supabase
```

- **Presentation** depende de **Application**
- **Application** depende de **Domain** (interfaces)
- **Infrastructure** implementa interfaces de **Domain**
- **Domain** no depende de nadie

## 🧪 Patrón de Testing Recomendado

```
tests/
├── unit/                          # Tests unitarios
│   ├── domain/
│   │   ├── entities/
│   │   └── services/
│   ├── application/
│   │   └── use-cases/
│   └── infrastructure/
│       └── repositories/
├── integration/                   # Tests de integración
│   ├── application/
│   └── infrastructure/
├── e2e/                           # Tests end-to-end
│   ├── features/
│   └── workflows/
└── shared/
    ├── fixtures/                  # Datos de prueba
    ├── mocks/                     # Mocks de infraestructura
    └── test-helpers.ts            # Utilidades de testing
```

## 🚀 Beneficios de Esta Arquitectura

### ✅ Clean Architecture
- **Independencia** de frameworks
- **Testabilidad** mejorada
- **Mantenibilidad** superior
- **Escalabilidad** horizontal

### ✅ SOLID Principles
- **SRP**: Cada clase una responsabilidad
- **OCP**: Extensible sin modificar
- **LSP**: Sustitución de implementaciones
- **ISP**: Interfaces específicas
- **DIP**: Dependencias de abstracciones

### ✅ Beneficios Prácticos
- **Código más testeable** (mocks fáciles)
- **Cambios aislados** (una feature no rompe otras)
- **Reutilización** de lógica de negocio
- **Paralelización** de desarrollo
- **Migraciones** más sencillas (BD, frameworks)

## 📋 Plan de Migración Sugerido

### Fase 1: Fundamentos (1-2 semanas)
1. Crear estructura de directorios
2. Definir entidades y value objects
3. Crear interfaces de repositorios
4. Implementar Result/Either monads

### Fase 2: Domain + Infrastructure (2-3 semanas)
1. Implementar entidades con reglas de negocio
2. Crear repositorios concretos
3. Migrar lógica de negocio de componentes

### Fase 3: Application Layer (2 semanas)
1. Crear use cases principales
2. Implementar command/query handlers
3. Crear DTOs

### Fase 4: Presentation (2-3 semanas)
1. Crear ViewModels
2. Refactorizar componentes React
3. Implementar inyección de dependencias

### Fase 5: Testing + Polish (1-2 semanas)
1. Crear tests unitarios
2. Tests de integración
3. Documentación y limpieza

## 🎯 Conclusión

La arquitectura actual tiene **buenas intenciones** pero **mezcla responsabilidades**. La migración a Clean Architecture + SOLID proporcionará:

- **Código más mantenible** y testeable
- **Separación clara** de responsabilidades
- **Facilidad para cambios** y nuevas features
- **Mejor organización** del equipo de desarrollo

La estructura propuesta es **escalable** y **probada** en proyectos similares de mediana/complejidad.</content>
<parameter name="filePath">c:\Users\usuario\Documents\GitHub\ordenes-clientes\ARQUITECTURA_RECOMENDADA.md