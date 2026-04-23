import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Bell,
  Package,
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  AlertTriangle,
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
    isDairyProduct: boolean
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
  isDairyProduct?: boolean
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
  scope: 'depot' | 'global' | 'indraai' | 'snf'
}

interface ExpiringSubscription {
  id: string
  memberName: string
  productName: string
  expiryDate: string
  daysLeft: number
}

export function AdminDashboard() {
  const { type = 'indraai' } = useParams<{ type?: string }>()
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
    scope: type as any
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
      const params = new URLSearchParams();
      
      // For depot users, filter by their depot
      if (userRole === 'DEPOT_ADMIN' && userDepotId) {
        params.append('depotId', userDepotId.toString());
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      const response = await get<{data: DepotVariant[]}>(endpoint)
      const variants = response.data || []

      // Generate stock alerts where closing_qty < minimum_qty
      const alerts: StockAlert[] = variants
        .filter(variant => !variant.notInStock && !variant.isHidden && variant.closingQty < variant.minimumQty)
        .filter(variant => {
          if (type === 'indraai') return variant.product.isDairyProduct === true;
          if (type === 'snf') return variant.product.isDairyProduct === false;
          return true;
        })
        .map(variant => ({
          id: variant.id,
          variantName: variant.name,
          productName: variant.product.name,
          depotName: variant.depot.name,
          current: variant.closingQty,
          minimum: variant.minimumQty,
          priority: variant.closingQty === 0 ? 'high' : variant.closingQty < variant.minimumQty / 2 ? 'medium' : 'low',
          isDairyProduct: variant.product.isDairyProduct
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
    // If SNF dashboard, don't fetch or show subscriptions
    if (type === 'snf') {
      setExpiringSubscriptions([]);
      return;
    }

    try {
      const response = await get<any[]>('/subscriptions')
      const subscriptions = response || []

      // Filter subscriptions expiring within 7 days
      const expiring = subscriptions
        .filter((sub: any) => {
          if (sub.status === 'CANCELLED' || sub.paymentStatus === 'CANCELLED') return false
          
          // Only show milk/subscription products for Indraai dashboard
          if (type === 'indraai' && !sub.product?.isDairyProduct) return false;

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
      const response = await get<{success: boolean, data: DashboardStats}>(`/admin/dashboard/stats?type=${type}`)
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
        scope: type as any
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
  }, [userRole, userDepotId, type])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg">Loading {type.toUpperCase()} dashboard...</p>
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
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6">
        {/* Compact Page Header for Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight capitalize">{type} Dashboard</h2>
            {dashboardStats.lastUpdated && (
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {new Date(dashboardStats.lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 px-4">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                  <Badge variant="destructive" className="ml-2 px-2 py-0.5 rounded-full">
                    {stockAlerts.length + expiringSubscriptions.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {stockAlerts.length === 0 && expiringSubscriptions.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
                {stockAlerts.map((alert) => (
                  <DropdownMenuItem key={alert.id} className="flex flex-col items-start p-4 space-y-1 cursor-pointer">
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
                  <DropdownMenuItem key={sub.id} className="flex flex-col items-start p-4 space-y-1 cursor-pointer">
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
          </div>
        </div>

        {/* Key Metrics */}
        <div className={`grid gap-4 sm:gap-6 grid-cols-2 ${type === 'snf' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">₹{(dashboardStats.totalRevenue || 0).toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                  <Users className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-secondary">{(dashboardStats.activeCustomers || 0).toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-accent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(dashboardStats.totalOrders || 0).toLocaleString()}</div>
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

              {type !== 'snf' && (
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
              )}
            </div>


            {/* Expiring Subscriptions and Stock Alerts Stacked */}
            <div className="grid grid-cols-1 gap-6">
              {/* Expiring Subscriptions Table */}
              {type !== 'snf' && (
                <Card className="overflow-hidden flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Expiring Subscriptions
                    </CardTitle>
                    <CardDescription>Monitor subscriptions that are about to end</CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    {expiringSubscriptions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No subscriptions expiring soon</p>
                        <p className="text-sm">All active subscriptions are healthy</p>
                      </div>
                    ) : (
                      <div className="rounded-md border overflow-x-auto table-container">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px]">Customer</TableHead>
                              <TableHead className="min-w-[150px]">Product</TableHead>
                              <TableHead className="min-w-[100px]">Expiry Date</TableHead>
                              <TableHead className="text-center min-w-[120px]">Status</TableHead>
                              <TableHead className="text-center">Days</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expiringSubscriptions.map((sub: ExpiringSubscription) => (
                              <TableRow key={sub.id} className={sub.daysLeft === 0 ? "bg-destructive/5" : sub.daysLeft <= 2 ? "bg-yellow-50" : ""}>
                                <TableCell className="font-medium text-sm">{sub.memberName}</TableCell>
                                <TableCell className="text-sm">{sub.productName}</TableCell>
                                <TableCell className="text-sm">{new Date(sub.expiryDate).toLocaleDateString('en-IN')}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Badge 
                                      variant={
                                        sub.daysLeft === 0 ? "destructive" : 
                                        sub.daysLeft === 1 ? "default" : "secondary"
                                      }
                                      className="text-[10px] sm:text-xs"
                                    >
                                      {sub.daysLeft === 0 ? 'Expires Today' : 
                                       sub.daysLeft === 1 ? 'Tomorrow' :
                                       `${sub.daysLeft} d`}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-sm font-medium">
                                  <span className={sub.daysLeft === 0 ? "text-destructive" : sub.daysLeft <= 2 ? "text-yellow-600" : ""}>
                                    {sub.daysLeft}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Stock Alerts Table */}
              <Card className="overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    {type} Stock Alerts
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
                <CardContent className="px-2 sm:px-6">
                  {stockAlerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No stock alerts at this time</p>
                      <p className="text-sm">All items are above minimum stock levels</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto table-container">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Priority</TableHead>
                            <TableHead className="min-w-[150px]">Product</TableHead>
                            <TableHead className="min-w-[100px]">Variant</TableHead>
                            <TableHead className="min-w-[100px]">Depot</TableHead>
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
                                  className="text-[10px] sm:text-xs px-1 sm:px-2"
                                >
                                  {alert.priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-sm">{alert.productName}</TableCell>
                              <TableCell className="text-sm">{alert.variantName}</TableCell>
                              <TableCell className="text-sm">{alert.depotName}</TableCell>
                              <TableCell className="text-right text-sm">
                                <span className={alert.current === 0 ? "text-destructive font-semibold" : ""}>
                                  {alert.current}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">{alert.minimum}</TableCell>
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
