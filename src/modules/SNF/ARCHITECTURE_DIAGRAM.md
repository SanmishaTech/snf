# Dynamic Pricing System Architecture Diagram

## System Flow Overview

```mermaid
graph TD
    A[User Device] --> B[Geolocation API]
    A --> C[Manual Pincode Entry]
    B --> D[Location Service]
    C --> D
    D --> E[Pincode Validation]
    E --> F[Area Master API]
    F --> G[Depot Mapping Service]
    G --> H[Pricing Context]
    H --> I[Product API]
    H --> J[Depot Variants API]
    I --> K[Cache Manager]
    J --> K
    K --> L[ProductGrid Component]
    L --> M[ProductCard Components]
    M --> N[Dynamic Pricing Display]

    subgraph "Frontend (SNF Module)"
        H
        L
        M
        N
    end

    subgraph "Services"
        D
        G
        K
    end

    subgraph "Backend API"
        F
        I
        J
    end

    subgraph "Database"
        P[(Area Master)]
        Q[(Depot Product Variants)]
        R[(Products)]
    end

    F --> P
    I --> R
    J --> Q
```

## Component Architecture

```mermaid
graph TD
    A[SNFLandingPage] --> B[PricingContextProvider]
    B --> C[Header]
    B --> D[Hero]
    B --> E[ProductGrid]
    B --> F[Footer]

    C --> G[LocationSelector]
    G --> H[PincodeEntry]
    G --> I[CurrentLocationButton]

    E --> J[ProductCard]
    J --> K[VariantSelector]
    J --> L[PriceDisplay]
    J --> M[AddToCartButton]

    subgraph "Context Providers"
        B
    end

    subgraph "Components"
        C
        D
        E
        F
        G
        H
        I
        J
        K
        L
        M
    end
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant L as Location Service
    participant A as Area Master API
    participant D as Depot Mapping
    participant P as Pricing Context
    participant C as Cache Manager
    participant V as Depot Variants API
    participant UI as ProductGrid

    U->>L: Request current location
    L->>U: Request geolocation permission
    U->>L: Grant permission
    L->>L: Get coordinates
    L->>L: Convert to pincode
    L->>A: Validate pincode
    A->>L: Return area data
    L->>D: Map pincode to depot
    D->>D: Determine optimal depot
    D->>P: Set current depot
    P->>C: Check cache for products
    alt Cache hit
        C->>P: Return cached products
    else Cache miss
        P->>V: Fetch depot variants
        V->>P: Return variants data
        P->>C: Cache products
    end
    P->>UI: Update with depot pricing
    UI->>U: Display products with dynamic prices
```

## State Management Architecture

```mermaid
graph TD
    A[PricingContext] --> B[State]
    A --> C[Actions]
    A --> D[Selectors]

    B --> E[currentDepot]
    B --> F[userLocation]
    B --> G[products]
    B --> H[depotVariants]
    B --> I[isLoading]
    B --> J[error]

    C --> K[setDepot]
    C --> L[setLocation]
    C --> M[refreshPricing]
    C --> N[clearCache]

    D --> O[getCurrentDepot]
    D --> P[getProductsForDepot]
    D --> Q[getVariantsForProduct]
    D --> R[getLoadingState]
    D --> S[getErrorState]

    subgraph "Context"
        A
    end

    subgraph "State"
        B
        E
        F
        G
        H
        I
        J
    end

    subgraph "Actions"
        C
        K
        L
        M
        N
    end

    subgraph "Selectors"
        D
        O
        P
        Q
        R
        S
    end
```

## API Integration Architecture

```mermaid
graph LR
    A[Frontend Services] --> B[API Client]
    B --> C[Request Interceptor]
    C --> D[Backend APIs]

    D --> E[Area Master API]
    D --> F[Depot Variants API]
    D --> G[Products API]

    E --> H[Prisma AreaMaster]
    F --> I[Prisma DepotProductVariant]
    G --> J[Prisma Product]

    H --> K[(Database)]
    I --> K
    J --> K

    subgraph "Frontend"
        A
        B
        C
    end

    subgraph "Backend"
        D
        E
        F
        G
    end

    subgraph "Database Layer"
        H
        I
        J
        K
    end
```

## Cache Architecture

```mermaid
graph TD
    A[Cache Manager] --> B[Memory Cache]
    A --> C[Local Storage]
    A --> D[Session Storage]

    B --> E[Products Cache]
    B --> F[Variants Cache]
    B --> G[Depot Mapping Cache]

    C --> H[Recent Pincodes]
    C --> I[User Preferences]

    D --> J[Session Depot]
    D --> K[Session Location]

    E --> L[TTL: 30 minutes]
    F --> M[TTL: 15 minutes]
    G --> N[TTL: 1 hour]

    subgraph "Cache Manager"
        A
    end

    subgraph "Memory Cache"
        B
        E
        F
        G
        L
        M
        N
    end

    subgraph "Local Storage"
        C
        H
        I
    end

    subgraph "Session Storage"
        D
        J
        K
    end
```

## Error Handling Architecture

```mermaid
graph TD
    A[Error Sources] --> B[Error Handler]
    B --> C[Error Classification]
    C --> D[Recoverable Errors]
    C --> E[Non-Recoverable Errors]

    D --> F[Retry Mechanism]
    D --> G[Fallback Action]
    D --> H[User Notification]

    E --> I[Error Boundary]
    E --> J[Graceful Degradation]
    E --> K[User Feedback]

    F --> L[Exponential Backoff]
    F --> M[Request Retry]

    G --> N[Manual Pincode Entry]
    G --> O[Default Depot]

    H --> P[Toast Notifications]
    H --> Q[Error Messages]

    I --> R[Component Fallback]
    I --> S[Error Page]

    subgraph "Error Handling"
        B
        C
    end

    subgraph "Recoverable Path"
        D
        F
        G
        H
        L
        M
        N
        O
        P
        Q
    end

    subgraph "Non-Recoverable Path"
        E
        I
        J
        K
        R
        S
    end
```

## Performance Optimization Architecture

```mermaid
graph TD
    A[Performance Optimizations] --> B[Data Fetching]
    A --> C[Rendering]
    A --> D[Bundle Size]

    B --> E[Batched Requests]
    B --> F[Request Deduplication]
    B --> G[Prefetching]

    C --> H[React.memo]
    C --> I[Virtualization]
    C --> J[Lazy Loading]

    D --> K[Code Splitting]
    D --> L[Tree Shaking]
    D --> M[Dynamic Imports]

    E --> N[Combine API Calls]
    E --> O[Parallel Requests]

    F --> P[Single Request Instance]
    F --> Q[Cache First Strategy]

    G --> R[Predictive Loading]
    G --> S[Background Fetching]

    H --> T[Component Memoization]
    H --> U[Selector Optimization]

    I --> V[Windowing]
    I --> W[Infinite Scroll]

    J --> X[Image Lazy Loading]
    J --> Y[Component Lazy Loading]

    subgraph "Data Fetching"
        B
        E
        F
        G
        N
        O
        P
        Q
        R
        S
    end

    subgraph "Rendering"
        C
        H
        I
        J
        T
        U
        V
        W
        X
        Y
    end

    subgraph "Bundle Size"
        D
        K
        L
        M
    end
```

## Testing Architecture

```mermaid
graph TD
    A[Testing Strategy] --> B[Unit Tests]
    A --> C[Integration Tests]
    A --> D[E2E Tests]

    B --> E[Service Tests]
    B --> F[Hook Tests]
    B --> G[Utility Tests]

    C --> H[Component Tests]
    C --> I[Context Tests]
    C --> J[API Integration Tests]

    D --> K[User Flow Tests]
    D --> L[Performance Tests]
    D --> M[Cross-browser Tests]

    E --> N[Geolocation Service]
    E --> O[Depot Mapping Service]
    E --> P[Cache Service]

    F --> Q[usePricing Hook]
    F --> R[useDepot Hook]
    F --> S[useLocation Hook]

    G --> T[Filtering Utils]
    G --> U[Validation Utils]
    G --> V[Error Utils]

    H --> W[ProductGrid]
    H --> X[ProductCard]
    H --> Y[LocationSelector]

    I --> Z[Pricing Context]
    I --> AA[State Management]

    J --> BB[API Client]
    J --> CC[Error Handling]

    K --> DD[Location Detection]
    K --> EE[Pincode Entry]
    K --> FF[Price Updates]

    L --> GG[Load Testing]
    L --> HH[Cache Performance]

    M --> II[Mobile Responsiveness]
    M --> JJ[Browser Compatibility]

    subgraph "Unit Tests"
        B
        E
        F
        G
        N
        O
        P
        Q
        R
        S
        T
        U
        V
    end

    subgraph "Integration Tests"
        C
        H
        I
        J
        W
        X
        Y
        Z
        AA
        BB
        CC
    end

    subgraph "E2E Tests"
        D
        K
        L
        M
        DD
        EE
        FF
        GG
        HH
        II
        JJ
    end
```

## Deployment Architecture

```mermaid
graph TD
    A[Development] --> B[Staging]
    B --> C[Production]

    A --> D[Local Development]
    D --> E[Hot Reload]
    D --> F[Mock APIs]

    B --> G[Staging Environment]
    G --> H[Test Data]
    G --> I[Performance Testing]

    C --> J[Production Environment]
    J --> K[CDN]
    J --> L[Load Balancer]
    J --> M[Monitoring]

    E --> N[Vite Dev Server]
    F --> O[MirageJS]

    H --> P[Seeded Database]
    I --> Q[Lighthouse CI]

    K --> R[Static Assets]
    L --> S[Multiple Instances]
    M --> T[Error Tracking]
    M --> U[Performance Metrics]

    subgraph "Development"
        A
        D
        E
        F
        N
        O
    end

    subgraph "Staging"
        B
        G
        H
        I
        P
        Q
    end

    subgraph "Production"
        C
        J
        K
        L
        M
        R
        S
        T
        U
    end
```
