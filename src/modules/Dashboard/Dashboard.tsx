import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Package,
  Users,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Bell,
  ShoppingCart,
  CreditCard,
  Loader2,
} from "lucide-react"
import { get } from "@/services/apiService"
import { differenceInCalendarDays, parseISO, startOfDay, endOfDay } from "date-fns"

// Types for API data
interface DepotVariant {
  id: string
  name: string
  mrp: number
  minimumQty: number
  closingQty: number
  notInStock: boolean
  isHidden: boolean
  depot: {
    id: number
    name: string
  }
  product: {
    id: number
    name: string
  }
}

interface StockAlert {
  id: string
  variantName: string
  productName: string
  depotName: string
  current: number
  minimum: number
  priority: 'high' | 'medium' | 'low'
}

interface DashboardStats {
  totalRevenue: number
  revenueChange: number
  activeCustomers: number
  customersChange: number
  totalOrders: number
  ordersChange: number
  lowStockItems: number
  activeSubscriptions: number
  lastUpdated: string
  scope: 'depot' | 'global'
}

interface ExpiringSubscription {
  id: string
  memberName: string
  productName: string
  expiryDate: string
  daysLeft: number
}

export function AdminDashboard() {
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueChange: 0,
    activeCustomers: 0,
    customersChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    lowStockItems: 0,
    activeSubscriptions: 0,
    lastUpdated: '',
    scope: 'global'
  })
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userDepotId, setUserDepotId] = useState<number | null>(null)

  // Get user role and depot from localStorage
  useEffect(() => {
    try {
      const userDataString = localStorage.getItem('user')
      if (userDataString) {
        const userData = JSON.parse(userDataString)
        setUserRole(userData.role)
        setUserDepotId(userData.depotId || null)
      }
    } catch (error) {
      console.error("Failed to parse user data from localStorage", error)
    }
  }, [])

  // Fetch depot variants and generate stock alerts
  const fetchDepotVariants = async () => {
    try {
      let endpoint = '/admin/depot-product-variants'
      
      // For depot users, filter by their depot
      if (userRole === 'DEPOT_ADMIN' && userDepotId) {
        endpoint += `?depotId=${userDepotId}`
      }

      const response = await get<{data: DepotVariant[]}>(endpoint)
      const variants = response.data || []

      // Generate stock alerts where closing_qty < minimum_qty
      const alerts: StockAlert[] = variants
        .filter(variant => !variant.notInStock && !variant.isHidden && variant.closingQty < variant.minimumQty)
        .map(variant => ({
          id: variant.id,
          variantName: variant.name,
          productName: variant.product.name,
          depotName: variant.depot.name,
          current: variant.closingQty,
          minimum: variant.minimumQty,
          priority: variant.closingQty === 0 ? 'high' : variant.closingQty < variant.minimumQty / 2 ? 'medium' : 'low'
        }))

      setStockAlerts(alerts)
      // Update low stock count in dashboard stats
      setDashboardStats(prev => ({
        ...prev,
        lowStockItems: alerts.length
      }))

    } catch (error: any) {
      console.error('Error fetching depot variants:', error)
      setError(error?.message || 'Failed to fetch stock data')
    }
  }

  // Fetch expiring subscriptions
  const fetchExpiringSubscriptions = async () => {
    try {
      const response = await get<any[]>('/subscriptions')
      const subscriptions = response || []

      // Filter subscriptions expiring within 7 days
      const expiring = subscriptions
        .filter((sub: any) => {
          if (sub.status === 'CANCELLED' || sub.paymentStatus === 'CANCELLED') return false
          
          // Get effective expiry date (from delivery schedule or subscription expiry)
          let expiryDateStr = sub.expiryDate
          if (sub.deliveryScheduleEntries && sub.deliveryScheduleEntries.length > 0) {
            const sortedEntries = sub.deliveryScheduleEntries
              .slice()
              .sort((a: any, b: any) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
            expiryDateStr = sortedEntries[sortedEntries.length - 1].deliveryDate
          }

          const daysLeft = differenceInCalendarDays(
            endOfDay(parseISO(expiryDateStr)),
            startOfDay(new Date())
          )
          return daysLeft >= 0 && daysLeft <= 7
        })
        .map((sub: any) => {
          let expiryDateStr = sub.expiryDate
          if (sub.deliveryScheduleEntries && sub.deliveryScheduleEntries.length > 0) {
            const sortedEntries = sub.deliveryScheduleEntries
              .slice()
              .sort((a: any, b: any) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
            expiryDateStr = sortedEntries[sortedEntries.length - 1].deliveryDate
          }

          const daysLeft = differenceInCalendarDays(
            endOfDay(parseISO(expiryDateStr)),
            startOfDay(new Date())
          )

          return {
            id: sub.id,
            memberName: sub.member?.name || 'Unknown Member',
            productName: sub.product?.name || 'Unknown Product',
            expiryDate: expiryDateStr,
            daysLeft
          }
        })

      setExpiringSubscriptions(expiring)
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error)
      // Don't set main error state for subscriptions as it's not critical
    }
  }

  // Fetch dashboard stats from real API
  const fetchDashboardStats = async () => {
    try {
      const response = await get<{success: boolean, data: DashboardStats}>('/admin/dashboard/stats')
      if (response.success && response.data) {
        setDashboardStats(response.data)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error)
      setError(error?.message || 'Failed to fetch dashboard statistics')
      // Set safe default values on error
      setDashboardStats({
        totalRevenue: 0,
        revenueChange: 0,
        activeCustomers: 0,
        customersChange: 0,
        totalOrders: 0,
        ordersChange: 0,
        lowStockItems: 0,
        activeSubscriptions: 0,
        lastUpdated: new Date().toISOString(),
        scope: 'global'
      })
    }
  }

  // Main data fetching effect
  useEffect(() => {
    if (userRole) {
      const fetchData = async () => {
        setLoading(true)
        setError(null)
        
        try {
          await Promise.all([
            fetchDepotVariants(),
            fetchExpiringSubscriptions(),
            fetchDashboardStats()
          ])
        } catch (error: any) {
          setError(error?.message || 'Failed to load dashboard data')
        } finally {
          setLoading(false)
        }
      }

      fetchData()
    }
  }, [userRole, userDepotId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-balance">GroceryAdmin</h1>
                <p className="text-sm text-muted-foreground">Dashboard & Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    <Badge variant="destructive" className="ml-2">
                      {stockAlerts.length + expiringSubscriptions.length}
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {stockAlerts.map((alert) => (
                    <DropdownMenuItem key={alert.id} className="flex flex-col items-start p-4 space-y-1">
                      <div className="flex items-center gap-2 w-full">
                        <AlertTriangle
                          className={`h-4 w-4 ${
                            alert.priority === "high"
                              ? "text-destructive"
                              : alert.priority === "medium"
                                ? "text-yellow-500"
                                : "text-muted-foreground"
                          }`}
                        />
                        <span className="font-medium capitalize text-sm">Stock Alert</span>
                        <Badge
                          variant={alert.priority === "high" ? "destructive" : "secondary"}
                          className="ml-auto text-xs"
                        >
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.productName} - {alert.variantName} at {alert.depotName}: {alert.current}/{alert.minimum} units
                      </p>
                    </DropdownMenuItem>
                  ))}
                  {expiringSubscriptions.slice(0, 3).map((sub) => (
                    <DropdownMenuItem key={sub.id} className="flex flex-col items-start p-4 space-y-1">
                      <div className="flex items-center gap-2 w-full">
                        <Calendar className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium capitalize text-sm">Subscription</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {sub.daysLeft === 0 ? 'expires today' : `${sub.daysLeft} days`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {sub.memberName} - {sub.productName}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {/* <Button size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Live View
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">₹{(dashboardStats.totalRevenue || 0).toLocaleString()}</div>
                  {/* <p className="text-xs text-muted-foreground">
                    {(dashboardStats.revenueChange || 0) >= 0 ? '+' : ''}{dashboardStats.revenueChange || 0}% from last month
                  </p> */}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                  <Users className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary">{(dashboardStats.activeCustomers || 0).toLocaleString()}</div>
                  {/* <p className="text-xs text-muted-foreground">
                    {(dashboardStats.customersChange || 0) >= 0 ? '+' : ''}{dashboardStats.customersChange || 0}% from last month
                  </p> */}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(dashboardStats.totalOrders || 0).toLocaleString()}</div>
                  {/* <p className="text-xs text-muted-foreground">
                    {(dashboardStats.ordersChange || 0) >= 0 ? '+' : ''}{dashboardStats.ordersChange || 0}% from last month
                  </p> */}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{dashboardStats.lowStockItems || 0}</div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dashboardStats.activeSubscriptions || 0}</div>
                  <p className="text-xs text-muted-foreground">Currently active</p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Alerts and Expiring Subscriptions Side by Side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Stock Alerts Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Stock Alerts
                    {dashboardStats.scope === 'depot' && (
                      <Badge variant="outline" className="ml-2">Depot View</Badge>
                    )}
                    {dashboardStats.scope === 'global' && (
                      <Badge variant="secondary" className="ml-2">Global View</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Items where current stock is below minimum threshold
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stockAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stock alerts at this time</p>
                      <p className="text-sm">All items are above minimum stock levels</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Priority</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Variant</TableHead>
                            <TableHead>Depot</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">Min</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockAlerts.map((alert) => (
                            <TableRow key={alert.id} className={alert.priority === "high" ? "bg-destructive/5" : ""}>
                              <TableCell>
                                <Badge 
                                  variant={
                                    alert.priority === "high" ? "destructive" : 
                                    alert.priority === "medium" ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {alert.priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{alert.productName}</TableCell>
                              <TableCell>{alert.variantName}</TableCell>
                              <TableCell>{alert.depotName}</TableCell>
                              <TableCell className="text-right">
                                <span className={alert.current === 0 ? "text-destructive font-semibold" : ""}>
                                  {alert.current}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{alert.minimum}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expiring Subscriptions Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Expiring Subscriptions
                  </CardTitle>
                  <CardDescription>Monitor subscriptions that are about to end</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringSubscriptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No subscriptions expiring soon</p>
                      <p className="text-sm">All active subscriptions are healthy</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Days Left</TableHead>
                            {/* <TableHead className="text-right">Actions</TableHead> */}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiringSubscriptions.map((sub: ExpiringSubscription) => (
                            <TableRow key={sub.id} className={sub.daysLeft === 0 ? "bg-destructive/5" : sub.daysLeft <= 2 ? "bg-yellow-50" : ""}>
                              <TableCell className="font-medium">{sub.memberName}</TableCell>
                              <TableCell>{sub.productName}</TableCell>
                              <TableCell>{new Date(sub.expiryDate).toLocaleDateString('en-IN')}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {sub.daysLeft === 0 ? (
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Badge 
                                    variant={
                                      sub.daysLeft === 0 ? "destructive" : 
                                      sub.daysLeft === 1 ? "default" : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {sub.daysLeft === 0 ? 'Expires Today' : 
                                     sub.daysLeft === 1 ? 'Tomorrow' :
                                     `${sub.daysLeft} days`}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={sub.daysLeft === 0 ? "text-destructive font-semibold" : sub.daysLeft <= 2 ? "text-yellow-600 font-medium" : ""}>
                                  {sub.daysLeft}
                                </span>
                              </TableCell>
                              {/* <TableCell className="text-right">
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </TableCell> */}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
      </div>
    </div>
  )
}
