
import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Wallet, Plus, IndianRupee, CreditCard, TrendingUp, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { get, post } from "../../services/apiService" // Adjust path if needed
import { formatCurrency } from "@/lib/formatter" // Adjust path if needed


interface ApiTransaction {
  id: string | number;
  type: "CREDIT" | "DEBIT";
  amount: number;
  description?: string;
  timestamp: string; // ISO date string
  status: string; // e.g., PENDING, COMPLETED, FAILED
}

interface UserWalletData {
  walletId: string | number;
  balance: number;
  currency: string;
  transactions: ApiTransaction[];
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0) // Initial balance, will be updated from API
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [amount, setAmount] = useState("")
  const [isLoadingForm, setIsLoadingForm] = useState(false) // For the add funds form
  const [formError, setFormError] = useState<string | null>("") // For the add funds form

  const [isFetchingWallet, setIsFetchingWallet] = useState(true); // For fetching initial wallet data
  const [fetchWalletError, setFetchWalletError] = useState<string | null>(null);

  const validateAmount = (value: string): string | null => {
    if (!value.trim()) {
      return "Amount is required"
    }

    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) {
      return "Please enter a valid number"
    }

    if (numValue <= 0) {
      return "Amount must be greater than 0"
    }

    if (numValue > 10000) {
      return "Maximum amount is ₹10,000"
    }

    

    return null
  }

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    const validationError = validateAmount(amount)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsLoadingForm(true)

    try {
      const addedAmount = Number.parseFloat(amount)
      // Actual API call to create a top-up request
      await post('/wallet/transactions', { amount: addedAmount });

      setAmount("")
      fetchWalletDetails(); // Re-fetch wallet data to ensure UI is up-to-date

      toast.success(`Top-up request for ${formatCurrency(addedAmount)} submitted. It will reflect in your balance after approval.`, {
        duration: 7000, // Slightly longer for more text
        icon: <CheckCircle2 className="h-4 w-4" />
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
      setFormError(errorMessage)

      toast.error(`Transaction Failed: ${errorMessage}`, {
        duration: 5000,
        icon: <AlertCircle className="h-4 w-4" />
      })
    } finally {
      setIsLoadingForm(false)
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)
    if (formError) {
      setFormError("")
    }
  }

  const quickAmounts = [25, 50, 100, 250];

  const fetchWalletDetails = async () => {
    setIsFetchingWallet(true);
    setFetchWalletError(null);
    try {
      const data = await get<UserWalletData>('/wallet'); // Assuming '/api' prefix is handled by apiService
      // setWalletData(data); // Removed
      if (data) {
        console.log(data)
        if (typeof data.data.balance === 'number') {
          setBalance(data.data.balance);
        }
        setTransactions(data.data.transactions || []);
      }
    } catch (err: any) {
      setFetchWalletError(err.message || "Failed to load wallet details.");
      setTransactions([]);
    } finally {
      setIsFetchingWallet(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="mx-auto  space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
          </div>
          <p className="text-muted-foreground">Manage your wallet balance and add funds securely</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Balance Card */}
{/* Current Balance Card */}
<Card className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50" />
  <CardHeader className="relative z-10">
    <CardTitle className="flex items-center gap-2">
      <IndianRupee className="h-5 w-5 text-green-600" />
                Current Balance
              </CardTitle>
              <CardDescription>Available funds in your wallet</CardDescription>
            </CardHeader>
            {console.log(balance)}
            <CardContent className="relative">
              <div className="text-4xl font-bold text-green-600 mb-4">
                {isFetchingWallet ? (
                  <span className="text-2xl">Loading...</span>
                ) : fetchWalletError ? (
                  <span className="text-2xl text-destructive">Error</span>
                ) : (
                  formatCurrency(balance)
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Available for transactions</span>
              </div>
            </CardContent>
          </Card>

          {/* Add Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Balance
              </CardTitle>
              <CardDescription>Add funds to your wallet instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBalance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Add</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="text"
                      placeholder="0.00"
                      value={amount}
                      onChange={handleAmountChange}
                      className={`pl-10 ${formError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      disabled={isLoadingForm}
                      aria-describedby={formError ? "amount-error" : undefined}
                    />
                  </div>
                  {formError && (
                    <Alert variant="destructive" id="amount-error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Quick Amount Buttons */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Quick Add</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <Button
                        key={quickAmount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAmount(quickAmount.toString())
                          setFormError("")
                        }}
                        disabled={isLoadingForm}
                        className="text-sm"
                      >
                        ₹{quickAmount}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button type="submit" className="w-full" disabled={isLoadingForm || !amount.trim()} size="lg">
                  {isLoadingForm ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Add Balance
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetchingWallet ? (
              <p>Loading transactions...</p>
            ) : fetchWalletError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fetchWalletError}</AlertDescription>
              </Alert>
            ) : transactions.length === 0 ? (
              <p className="text-muted-foreground text-center">No recent activity to display.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const isCredit = transaction.type === "CREDIT";
                  const status = transaction.status?.toUpperCase() || 'UNKNOWN'; // Default to UNKNOWN if status is missing

                  let icon = <CheckCircle2 className="h-5 w-5 text-gray-500" />;
                  let iconBgColor = "bg-gray-100";
                  let amountColor = isCredit ? "text-green-600" : "text-red-600";
                  let title = transaction.description || (isCredit ? "Funds Added" : "Funds Withdrawn");
                  const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase();

                  if (status === "COMPLETED" || status === "PAID") {
                    icon = <CheckCircle2 className={`h-5 w-5 ${isCredit ? 'text-green-600' : 'text-red-500'}`} />;
                    iconBgColor = isCredit ? "bg-green-100" : "bg-red-100";
                  } else if (status === "PENDING") {
                    icon = <Clock className="h-5 w-5 text-yellow-600" />;
                    iconBgColor = "bg-yellow-100";
                    amountColor = "text-yellow-700";
                  } else if (status === "FAILED") {
                    icon = <XCircle className="h-5 w-5 text-red-600" />;
                    iconBgColor = "bg-red-100";
                    amountColor = "text-red-700";
                  }

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconBgColor}`}>
                          {icon}
                        </div>
                        <div>
                          <p className="font-medium">{title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${amountColor}`}>
                          {isCredit ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{formattedStatus}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
