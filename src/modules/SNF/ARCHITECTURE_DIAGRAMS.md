# Dynamic Product Pricing System - Architecture Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Side"
        A[User Browser] --> B[SNF Frontend]
        B --> C[Geolocation Service]
        B --> D[Pincode Input Component]
        B --> E[Depot Context Provider]
        B --> F[Product Grid]
        B --> G[Product Detail Page]
    end

    subgraph "Server Side"
        H[Area Master API] --> I[Depot Mapping]
        J[Depot Variants API] --> K[Product Pricing]
        L[Cache Layer] --> H
        L --> J
    end

    subgraph "Database"
        M[(Area Masters)]
        N[(Depots)]
        O[(Products)]
        P[(Depot Variants)]
    end

    C --> H
    D --> H
    E --> I
    F --> J
    G --> J
    H --> M
    H --> N
    J --> O
    J --> P
    I --> N
```

## 2. Data Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant GL as Geolocation Service
    participant PI as Pincode Input
    participant AM as Area Master API
    participant DM as Depot Mapping
    participant DC as Depot Context
    participant PV as Product Variants API
    participant PG as Product Grid

    U->>GL: Request Location
    GL->>U: Get Coordinates
    GL->>GL: Convert to Pincode
    GL->>PI: Set Pincode

    alt Geolocation Failed
        U->>PI: Manual Pincode Entry
    end

    PI->>AM: GET /area-masters/by-pincode/:pincode
    AM->>PI: Return Area Masters
    PI->>DM: Map Pincode to Depot
    DM->>DC: Set Current Depot
    DC->>PG: Update Products
    PG->>PV: GET /depot-variants?depotId=:id
    PV->>PG: Return Depot-Specific Products
    PG->>U: Display Products with Pricing
```

## 3. Component Architecture

```mermaid
graph TD
    subgraph "SNF Module"
        A[SNFLandingPage] --> B[Header]
        A --> C[ProductGrid]
        A --> D[ProductDetailPage]

        B --> E[PincodeInput]
        B --> F[DepotSelector]

        E --> G[GeolocationService]
        E --> H[DepotMappingService]

        F --> I[DepotContext]

        C --> I
        C --> J[ProductService]
        C --> K[CacheService]

        D --> I
        D --> J
        D --> K

        I --> L[LocalStorage]
        J --> M[API Calls]
        K --> N[Cache Storage]
    end

    subgraph "External Services"
        M --> O[Area Master API]
        M --> P[Depot Variants API]
    end
```

## 4. State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Loading: Initial Load
    Loading --> DetectingLocation: Check Geolocation
    DetectingLocation --> GettingPincode: Success
    DetectingLocation --> ManualEntry: Failed/Denied
    GettingPincode --> MappingDepot: Pincode Received
    ManualEntry --> MappingDepot: Pincode Entered
    MappingDepot --> FetchingProducts: Depot Mapped
    FetchingProducts --> Ready: Products Loaded
    FetchingProducts --> Error: API Failed
    Ready --> UpdatingDepot: Depot Changed
    UpdatingDepot --> FetchingProducts: New Depot
    Error --> ManualEntry: Retry
    Error --> Ready: Cached Data Available
```

## 5. API Integration Flow

```mermaid
graph LR
    subgraph "Frontend Components"
        A[PincodeInput] --> B[DepotSelector]
        C[ProductGrid] --> D[ProductDetailPage]
    end

    subgraph "Services Layer"
        E[GeolocationService]
        F[DepotMappingService]
        G[ProductService]
        H[CacheService]
    end

    subgraph "API Endpoints"
        I[GET /area-masters/by-pincode/:pincode]
        J[GET /depot-variants]
        K[GET /depot-variants/:productId]
        L[GET /depots/:depotId/variants]
    end

    A --> E
    A --> F
    B --> F
    C --> G
    D --> G
    E --> I
    F --> I
    G --> J
    G --> K
    G --> L
    H --> I
    H --> J
    H --> K
    H --> L
```

## 6. Error Handling Flow

```mermaid
graph TD
    A[User Action] --> B{Geolocation Available?}
    B -->|Yes| C{Permission Granted?}
    B -->|No| D[Show Manual Entry]
    C -->|Yes| E{Get Coordinates Success?}
    C -->|No| D
    E -->|Yes| F{Convert to Pincode Success?}
    E -->|No| D
    F -->|Yes| G{API Call Success?}
    F -->|No| D
    G -->|Yes| H{Depot Found?}
    G -->|No| I[Show API Error]
    H -->|Yes| J[Update Products]
    H -->|No| K[Show No Service Error]
    I --> D
    D --> L{Manual Pincode Valid?}
    L -->|Yes| G
    L -->|No| M[Show Invalid Pincode Error]
    M --> D
```

## 7. Cache Strategy

```mermaid
graph LR
    subgraph "Cache Types"
        A[Session Storage] -->|User Session| B[Current Depot]
        C[Local Storage] -->|Persistent| D[Depot Preference]
        E[Memory Cache] -->|Fast Access| F[Product Data]
        G[API Cache] -->|TTL Based| H[Area Masters]
    end

    subgraph "Cache Operations"
        I[Set] --> A
        I --> C
        I --> E
        J[Get] --> A
        J --> C
        J --> E
        K[Invalidate] --> E
        K --> G
    end

    subgraph "Cache Triggers"
        L[Depot Change] --> K
        M[Pincode Change] --> K
        N[Session Expire] --> I
        O[Page Load] --> J
    end
```

## 8. Performance Optimization

```mermaid
graph TB
    subgraph "Optimization Strategies"
        A[Batched Queries] --> B[Single API Call]
        C[Lazy Loading] --> D[Load on Demand]
        E[Prefetching] --> F[Load Related Data]
        G[Debouncing] --> H[Reduce API Calls]
        I[Pagination] --> J[Chunked Data]
    end

    subgraph "Benefits"
        B --> K[Reduced Latency]
        D --> L[Faster Initial Load]
        F --> M[Smoother UX]
        H --> N[Less Server Load]
        J --> O[Scalable Performance]
    end
```

These diagrams illustrate the complete architecture and data flow for the dynamic product pricing system, showing how all components interact to provide depot-specific pricing based on the user's location.
