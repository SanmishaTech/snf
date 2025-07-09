"use client"

import type React from "react";
import { get, post } from "../../services/apiService";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2,Mail, User, Wallet, TrendingUp, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatter";
import { toast } from "sonner";
 


// --- Type Definitions (align with backend) ---
interface ApiResponse<T> {
  data: T;
}
interface MemberSummary {
  memberId: string | number;
  memberName: string;
  memberEmail?: string;
  wallet?: { // Wallet info can be optional here if just for name list
    walletId: string | number | null;
    balance: number;
    currency: string;
    updatedAt: string | null;
  };
}

interface ApiTransaction {
  id: string | number;
  type: "CREDIT" | "DEBIT"; // Backend uses uppercase
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  timestamp: string; // This is createdAt from backend
  adminName: string;
  adminId: string | number;
  walletId: string | number;
}

interface ApiWalletData {
  walletId: string | number;
  balance: number;
  currency: string;
  updatedAt: string;
  transactions: ApiTransaction[];
}

interface SelectedMemberData {
  memberId: string | number;
  memberName: string;
  memberEmail?: string;
  wallet: ApiWalletData;
}

interface ModifyFundsPayload {
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
}

// Utility to deduplicate transactions by id
const deduplicateTransactions = (txs: ApiTransaction[]): ApiTransaction[] => {
  const seen = new Map<string | number, ApiTransaction>();
  txs.forEach((tx) => {
    if (!seen.has(tx.id)) {
      seen.set(tx.id, tx);
    }
  });
  return Array.from(seen.values());
};

const AdminWalletPage: React.FC = () => {
  // Form state
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Component State
  const [membersList, setMembersList] = useState<MemberSummary[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | number | null>(null);
  const [selectedMemberData, setSelectedMemberData] = useState<SelectedMemberData | null>(null);

  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const [error, setError] = useState<string | null>(null);

  const [isModifyBalanceDialogOpen, setIsModifyBalanceDialogOpen] = useState(false);
  const [currentTransactionType, setCurrentTransactionType] = useState<"CREDIT" | "DEBIT" | null>(null);
  const [isViewTransactionDetailsDialogOpen, setIsViewTransactionDetailsDialogOpen] = useState(false);
  const [transactionForDialog, setTransactionForDialog] = useState<ApiTransaction | null>(null);

  // State for Approval Form in Transaction Details Dialog
  const [approvalPaymentMethod, setApprovalPaymentMethod] = useState<string>("");
  const [approvalReferenceNumber, setApprovalReferenceNumber] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [isApprovingTransaction, setIsApprovingTransaction] = useState<boolean>(false);
  const [approvalFormErrors, setApprovalFormErrors] = useState<{ paymentMethod?: string; referenceNumber?: string; notes?: string; }>({});
  const [searchParams] = useSearchParams();
  const urlProcessedMemberIdRef = useRef<string | number | null>(null);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    paymentMethod?: string;
    referenceNumber?: string;
    notes?: string;
  }>({});

  // Fetch members on component mount
  useEffect(() => {
    const loadMembers = async () => {
      setIsLoadingMembers(true);
      setError(null);
      try {
        // Use apiService.get for fetching members
        const response = await get<ApiResponse<MemberSummary[]>>('/admin/wallets');
        setMembersList(response?.data);
      } catch (err: any) {
        setError(err.message || "Failed to load members.");
        setMembersList([]); // Clear members list on error
      }
      setIsLoadingMembers(false);
    };
    loadMembers();
  }, []);

  const handleMemberSelect = useCallback(async (selectedId: string | number | null) => {
    setSelectedMemberId(selectedId);
    setSelectedMemberData(null); // Clear previous details
    setError(null);

    if (selectedId) {
      setIsLoadingDetails(true);
      try {
        // Use apiService.get for fetching member wallet details
        const response = await get<ApiResponse<SelectedMemberData>>(`/admin/wallets/${selectedId}`);
        if (response?.data?.wallet?.transactions) {
          // Remove duplicate transactions (same id)
          response.data.wallet.transactions = deduplicateTransactions(response.data.wallet.transactions);
        }
        setSelectedMemberData(response?.data);
      } catch (err: any) {
        setError(err.message || `Failed to load wallet for member ${selectedId}.`);
        setSelectedMemberData(null);
      }
      setIsLoadingDetails(false);
    } else {
      // If no member is selected (e.g., placeholder is chosen)
      setSelectedMemberData(null);
    }
  }, [setSelectedMemberId, setSelectedMemberData, setError, setIsLoadingDetails]); // `get` is assumed stable from import

  // Effect to handle memberId from URL query parameter
  useEffect(() => {
    const memberIdFromUrl = searchParams.get('memberId');

    if (memberIdFromUrl && membersList.length > 0) {
      // Only process if the memberId from URL is different from the one already processed by this effect
      if (memberIdFromUrl !== urlProcessedMemberIdRef.current) {
        const memberExists = membersList.some(member => String(member.memberId) === memberIdFromUrl);
        if (memberExists) {
          handleMemberSelect(memberIdFromUrl); // This will update selectedMemberId
          urlProcessedMemberIdRef.current = memberIdFromUrl; // Mark this URL memberId as processed
        } else {
          // Member from URL doesn't exist in the list, update ref to avoid reprocessing same invalid ID
          urlProcessedMemberIdRef.current = memberIdFromUrl;
          // Optionally, clear selectedMemberId or show a message
          // setSelectedMemberId(null); 
          // setError(`Member with ID ${memberIdFromUrl} from URL not found in the list.`);
        }
      }
    } else if (!memberIdFromUrl && urlProcessedMemberIdRef.current) {
      // memberId was removed from URL, reset the ref so if it's added back, it gets processed.
      urlProcessedMemberIdRef.current = null;
      // Optionally, you might want to clear the selected member if the URL param is removed.
      // handleMemberSelect(null); // This would clear the selection
    }
  }, [searchParams, membersList, handleMemberSelect]); // selectedMemberId is intentionally NOT in this dependency array

  const handleBalanceModification = (type: "CREDIT" | "DEBIT") => {
    if (!selectedMemberId || !selectedMemberData) {
      setError("Please select a customer first to modify their balance.");
      return;
    }
    // Reset form for new transaction
    setAmount("");
    setPaymentMethod("");
    setReferenceNumber("");
    setNotes("");
    setFormErrors({});
    setCurrentTransactionType(type);
    setIsModifyBalanceDialogOpen(true);
  };

  const handleOpenTransactionDetailsDialog = (transaction: ApiTransaction) => {
    setTransactionForDialog(transaction);
    // Reset approval form fields if opening for a pending transaction
    if (transaction.paymentMethod === "PENDING") {
      setApprovalPaymentMethod("");
      setApprovalReferenceNumber("");
      setApprovalNotes("");
      setApprovalFormErrors({});
    }
    setIsViewTransactionDetailsDialogOpen(true);
  };

  const handleApproveTransaction = async () => {
    if (!transactionForDialog || !selectedMemberId) return;

    const errors: { paymentMethod?: string; referenceNumber?: string; notes?: string; } = {};
    if (!approvalPaymentMethod) {
      errors.paymentMethod = "Payment method is required for approval.";
    }
    if (approvalPaymentMethod && approvalPaymentMethod !== "CASH" && !approvalReferenceNumber.trim()) {
      errors.referenceNumber = "Reference number is required for this payment method.";
    }

    if (Object.keys(errors).length > 0) {
      setApprovalFormErrors(errors);
      return;
    }
    setApprovalFormErrors({});
    setIsApprovingTransaction(true);

    try {
      const approvalData = {
        paymentMethod: approvalPaymentMethod,
        referenceNumber: approvalReferenceNumber.trim(),
        notes: approvalNotes.trim(),
        // Backend should handle setting status to COMPLETED upon approval
      };
      
      await post(`/admin/wallets/transactions/${transactionForDialog.id}/approve`, approvalData);

      // Re-fetch wallet details to update balance and ensure data consistency
      if (selectedMemberId) {
        const response = await get<ApiResponse<SelectedMemberData>>(`/admin/wallets/${selectedMemberId}`);
        if (response?.data?.wallet?.transactions) {
          response.data.wallet.transactions = deduplicateTransactions(response.data.wallet.transactions);
        }
        setSelectedMemberData(response.data);
      }

      setIsViewTransactionDetailsDialogOpen(false);
      toast.success("Transaction approved successfully!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 5000,
      });

    } catch (err: any) {
      console.error("Failed to approve transaction:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to approve transaction. Please try again.";
      setApprovalFormErrors({ notes: errorMessage }); // Display error in form notes or a dedicated error field
      toast.error(`Error approving transaction: ${errorMessage}`, {
        icon: <AlertCircle className="h-4 w-4" />,
        duration: 5000,
      });
    } finally {
      setIsApprovingTransaction(false);
    }
  };

  const handleSubmitTransaction = async () => {
    if (!selectedMemberId || !currentTransactionType) {
      setError("No member selected or transaction type missing.");
      return;
    }

    const newAmountFloat = parseFloat(amount);
    let errors: { amount?: string; paymentMethod?: string } = {};
    if (isNaN(newAmountFloat) || newAmountFloat <= 0) {
      errors.amount = "Amount must be a positive number.";
    }
    if (!paymentMethod.trim()) {
      errors.paymentMethod = "Payment method is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);
    setError(null);

    const payload: ModifyFundsPayload = {
      amount: newAmountFloat,
      paymentMethod: paymentMethod.trim(),
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (currentTransactionType === "CREDIT") {
        await post(`/admin/wallets/${selectedMemberId}/add-funds`, payload);
      } else {
        await post(`/admin/wallets/${selectedMemberId}/remove-funds`, payload);
      }
      // Refresh wallet details
      if (selectedMemberId) {
        const response = await get<ApiResponse<SelectedMemberData>>(`/admin/wallets/${selectedMemberId}`);
        if (response?.data?.wallet?.transactions) {
          response.data.wallet.transactions = deduplicateTransactions(response.data.wallet.transactions);
        }
        setSelectedMemberData(response.data);
      }
      setIsModifyBalanceDialogOpen(false);
      // Reset form fields after successful submission
      setAmount("");
      setPaymentMethod("");
      setReferenceNumber("");
      setNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to process transaction.");
    }
    setIsSubmitting(false);
  };

  const validateForm = () => {
    const errors: { amount?: string; paymentMethod?: string; referenceNumber?: string } = {}
    const numericAmount = Number.parseFloat(amount)

    if (!amount.trim()) {
      errors.amount = "Amount is required."
    } else if (isNaN(numericAmount) || numericAmount <= 0) {
      errors.amount = "Please enter a valid positive amount."
    }
    if (!paymentMethod.trim()) {
      errors.paymentMethod = "Payment method is required."
    }

    if (paymentMethod !== "CASH" && paymentMethod !== "PENDING" && !referenceNumber.trim()) {
      errors.referenceNumber = "Reference number is required."
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    // Re-validate form whenever relevant fields change to update error states and button disabled status
    validateForm()
  }, [amount, paymentMethod, referenceNumber])

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Wallet Management</h1>
        <p className="text-muted-foreground text-sm">Manage customer wallet balances and view transaction history</p>
      </div>

      {/* Compact Member Selection */}
    

      {/* Selected Member Information */}
      {selectedMemberData && !isLoadingDetails && (
  <Card className="p-6 rounded-xl shadow-sm border bg-card transition-all hover:shadow-md">
    <div className="flex items-start gap-5">
      <div className="bg-primary/10 p-3 rounded-full">
        <User className="h-8 w-8 text-primary flex-shrink-0" />
      </div>
      
      <div className="space-y-2">
        <div>
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            {selectedMemberData.memberName}
          </h3>
          
          {selectedMemberData.memberEmail && (
            <div className="flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`mailto:${selectedMemberData.memberEmail}`}
                className="text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                {selectedMemberData.memberEmail}
              </a>
            </div>
          )}
        </div>
        
         
      </div>
    </div>
  </Card>
)}

      {/* Wallet Details Section - loading state */}
      {isLoadingDetails && (
        <Card className="p-4 text-center mt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading wallet details...
          </div>
        </Card>
      )}

      {/* Wallet Details Section - content */}
      {selectedMemberData && !isLoadingDetails && (
        <>
          {/* Compact Balance & Actions Row */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Balance Display */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance ({selectedMemberData?.memberName})</p>
                    <p className="text-2xl font-bold text-green-700">{selectedMemberData ? formatCurrency(selectedMemberData?.wallet?.balance ?? 0) : 'N/A'}</p>
                  </div>
                </div>
                {/* <div className="text-xs text-muted-foreground">{selectedMember.name}</div> */}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleBalanceModification("CREDIT")}
                  size="sm"
                  className="bg-green-600 hover:bg-primary text-white"
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Deposit
                </Button>
                <Button
                  onClick={() => handleBalanceModification("DEBIT")}
                  variant="destructive"
                  size="sm"
                >
                  <TrendingDown className="mr-1 h-4 w-4" />
                  Withdrawn
                </Button>
              </div>
            </div>
          </Card> {/* Closing Card for Balance & Actions Row */}

          {/* Transaction History */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Transaction History</CardTitle>
                </div>
                {selectedMemberData?.wallet?.transactions && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedMemberData.wallet.transactions.length} transaction(s)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedMemberData?.wallet?.transactions && selectedMemberData.wallet.transactions.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs uppercase bg-muted/50">
                        <TableHead className="px-3 py-2">Date</TableHead>

                        <TableHead className="text-right">Credited</TableHead>
                        <TableHead className="text-right">Debited</TableHead>
                        <TableHead className="px-3 py-2">Payment Method</TableHead>
                        <TableHead className="px-3 py-2">Reference</TableHead>
                        <TableHead className="px-3 py-2">Admin</TableHead>
                        <TableHead className="px-3 py-2">Status</TableHead>
                        <TableHead className="text-right px-3 py-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMemberData.wallet.transactions.map((tx: ApiTransaction) => (
                        <TableRow key={String(tx.id)} className="text-sm hover:bg-muted/50">
                          <TableCell className="text-xs px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {typeof tx.timestamp === 'string' && tx.timestamp ? format(tx.timestamp, 'dd/MM/yyyy') : <span className="text-muted-foreground">Date N/A</span>}
                          </TableCell>
                          <TableCell className={`text-right ${tx.type === "CREDIT" ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {tx.type === "CREDIT" ? formatCurrency(tx.amount) : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell className={`text-right ${tx.type === "DEBIT" ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {tx.type === "DEBIT" ? formatCurrency(tx.amount) : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">
                            {tx.paymentMethod || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 font-mono">
                            {tx.referenceNumber || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 text-muted-foreground">
                            {tx.adminName || <span className="text-muted-foreground">N/A</span>}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">{tx.status || <span className="text-muted-foreground">-</span>}</TableCell>
                          <TableCell className="text-right px-3 py-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTransactionDetailsDialog(tx)}
                              disabled={tx.status !== "PENDING"}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No transactions found for this customer.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modify Balance Dialog */}
      <Dialog open={isModifyBalanceDialogOpen} onOpenChange={(isOpen) => {
            setIsModifyBalanceDialogOpen(isOpen);
            if (!isOpen) {
              // Reset form fields, errors, and transaction type when dialog is closed
              setAmount("");
              setPaymentMethod("");
              setReferenceNumber("");
              setNotes("");
              setFormErrors({});
              setCurrentTransactionType(null);
              setError(null); // Clear any API error messages shown in the dialog
            }
          }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {currentTransactionType === "CREDIT" ? 
                <TrendingUp className="mr-2 h-5 w-5 text-green-600" /> : 
                <TrendingDown className="mr-2 h-5 w-5 text-red-600" />}
              {currentTransactionType === "CREDIT" ? "Add Funds to Wallet" : "Remove Funds from Wallet"}
            </DialogTitle>
            {selectedMemberData && (
              <DialogDescription>
                For {selectedMemberData?.memberName}. Current balance: {formatCurrency(selectedMemberData?.wallet?.balance ?? 0)}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="amount">{currentTransactionType === "CREDIT" ? "Amount to Credit" : "Amount to Debit"}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={formErrors.amount ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {formErrors.amount && <p className="text-xs text-destructive pt-1">{formErrors.amount}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="paymentMethod" className={formErrors.paymentMethod ? "text-destructive" : ""}>
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className={formErrors.paymentMethod ? "border-destructive focus-visible:ring-destructive" : ""}>
                  <SelectValue placeholder="Select a payment method" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="PENDING">Pending</SelectItem> */}
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.paymentMethod && <p className="text-xs text-destructive pt-1">{formErrors.paymentMethod}</p>}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="referenceNumber">Reference Number <span className='text-xs text-muted-foreground'>(Optional)</span></Label>
              <Input
                id="referenceNumber"
                placeholder="e.g., INV-12345, Txn ID"
                value={referenceNumber}
                disabled={paymentMethod === "CASH"}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes <span className='text-xs text-muted-foreground'>(Optional)</span></Label>
              <Textarea
                id="notes"
                placeholder="e.g., Monthly deposit, Refund for order #XYZ"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          {/* Display general error from API calls within the dialog */}
          {error && !formErrors.amount && !formErrors.paymentMethod && (
            <div className="bg-destructive/15 text-destructive px-3 py-2 rounded-md text-sm">
              Error: {error}
            </div>
          )}
          <DialogFooter className="sm:justify-start pt-2">
            <Button
              type="button"
              onClick={handleSubmitTransaction}
              disabled={isSubmitting || Object.keys(formErrors).length > 0}
              className={`w-full ${currentTransactionType === "CREDIT" ? "bg-green-600 hover:bg-primary text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                currentTransactionType === "CREDIT" ? "Credit Wallet" : "Debit Wallet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Viewing Transaction Details & Approving Pending Transactions */}
      {isViewTransactionDetailsDialogOpen && transactionForDialog && (
        <Dialog open={isViewTransactionDetailsDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen && isApprovingTransaction) return; // Prevent closing while approving
          setIsViewTransactionDetailsDialogOpen(isOpen);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {transactionForDialog.status === "PENDING" ? "Approve Transaction" : "Transaction Details"}
              </DialogTitle>
              <DialogDescription>
                {transactionForDialog.status === "PENDING" 
                  ? "Complete the details below to approve this pending transaction."
                  : "Review the details of this transaction."}
              </DialogDescription>
            </DialogHeader>

            {/* Transaction Info Display - Modernized */} 
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><span className="font-medium text-muted-foreground">Transaction ID:</span></div><div>{transactionForDialog.id}</div>
                <div><span className="font-medium text-muted-foreground">Date:</span></div><div>{format(new Date(transactionForDialog.timestamp), "dd/MM/yyyy")}</div>
                <div><span className="font-medium text-muted-foreground">Type:</span></div><div><Badge variant={transactionForDialog.type === 'CREDIT' ? 'default' : 'destructive'} className={`${transactionForDialog.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{transactionForDialog.type}</Badge></div>
                <div><span className="font-medium text-muted-foreground">Amount:</span></div><div className={`font-semibold ${transactionForDialog.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(transactionForDialog.amount)}</div>
                {/* <div><span className="font-medium text-muted-foreground">Added By (Admin):</span></div><div>{transactionForDialog.adminName || "N/A"}</div> */}
              </div>

              {/* Display current status/payment method if not in PENDING approval mode */} 
              {transactionForDialog.status !== "PENDING" && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-2 border-t">
                  <div><span className="font-medium text-muted-foreground">Status:</span></div><div><Badge variant={transactionForDialog.status === 'COMPLETED' ? 'default' : transactionForDialog.status === 'FAILED' ? 'destructive' : 'outline'} className={`capitalize ${transactionForDialog.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : transactionForDialog.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'border-gray-300 text-gray-500'}`}>{transactionForDialog.status ? transactionForDialog.status.toLowerCase() : 'N/A'}</Badge></div>
                  {transactionForDialog.status && (
                    <>
                      <div><span className="font-medium text-muted-foreground">Payment Method:</span></div>
                      <div>{transactionForDialog.paymentMethod}</div>
                    </>
                  )}
                  {transactionForDialog.referenceNumber && (
                    <>
                      <div><span className="font-medium text-muted-foreground">Reference No:</span></div>
                      <div>{transactionForDialog.referenceNumber}</div>
                    </>
                  )}
                </div>
              )}
              {transactionForDialog.notes && transactionForDialog.paymentMethod !== "PENDING" && 
                <div className="text-sm pt-2 border-t">
                  <div className="font-medium text-muted-foreground mb-1">Notes:</div>
                  <p className="p-2 bg-muted/50 rounded-md whitespace-pre-wrap">{transactionForDialog.notes}</p>
                </div>
              }
            </div>

            {/* Approval Form - Shown only for PENDING transactions */} 
            {transactionForDialog.status === "PENDING" && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-md font-semibold text-foreground">Approval Details</h3>
                <div>
                  <Label htmlFor="approvalPaymentMethod">Payment Method <span className="text-destructive">*</span></Label>
                  <Select value={approvalPaymentMethod} onValueChange={setApprovalPaymentMethod} disabled={isApprovingTransaction}>
                    <SelectTrigger id="approvalPaymentMethod"><SelectValue placeholder="Select actual payment method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      {/* Add other relevant payment methods */}
                    </SelectContent>
                  </Select>
                  {approvalFormErrors.paymentMethod && <p className="text-xs text-destructive mt-1">{approvalFormErrors.paymentMethod}</p>}
                </div>
                
                <div>
                  <Label htmlFor="approvalReferenceNumber">Reference Number {approvalPaymentMethod !== "CASH" && <span className="text-destructive">*</span>}</Label>
                  <Input id="approvalReferenceNumber" value={approvalReferenceNumber} onChange={(e) => setApprovalReferenceNumber(e.target.value)} placeholder="Enter reference number" disabled={isApprovingTransaction || !approvalPaymentMethod || approvalPaymentMethod === "CASH"} />
                  {approvalFormErrors.referenceNumber && <p className="text-xs text-destructive mt-1">{approvalFormErrors.referenceNumber}</p>}
                </div>

                <div>
                  <Label htmlFor="approvalNotes">Notes</Label>
                  <Textarea id="approvalNotes" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="Add any notes for this approval (optional)" disabled={isApprovingTransaction} />
                  {approvalFormErrors.notes && <p className="text-xs text-destructive mt-1">{approvalFormErrors.notes}</p>}
                </div>
              </div>
            )}

            <DialogFooter className="mt-2">
              {transactionForDialog.status === "PENDING" ? (
                <>
                  <Button variant="outline" onClick={() => setIsViewTransactionDetailsDialogOpen(false)} disabled={isApprovingTransaction}>Cancel</Button>
                  <Button onClick={handleApproveTransaction} disabled={isApprovingTransaction || !approvalPaymentMethod}>
                    {isApprovingTransaction ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...</> : "Approve Payment"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsViewTransactionDetailsDialogOpen(false)}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default AdminWalletPage
