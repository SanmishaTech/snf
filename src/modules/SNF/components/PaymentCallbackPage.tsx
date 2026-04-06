import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { getPhonePePaymentStatus } from "@/services/phonePeService";
import { snfOrderService } from "@/services/snfOrderService";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "../context/CartContext";

type PaymentState = "loading" | "success" | "failed" | "pending" | "error";

const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // PhonePe often redirects without query params if redirectMode isn't REDIRECT.
  // Fall back to the merchantOrderId safely stored in localStorage.
  const urlMerchantOrderId = searchParams.get("merchantOrderId");
  const localMerchantOrderId = localStorage.getItem("snf_pending_merchant_order_id") || sessionStorage.getItem("snf_pending_merchant_order_id");
  const merchantOrderId = urlMerchantOrderId || localMerchantOrderId;
  
  const [orderNo, setOrderNo] = useState<string | null>(searchParams.get("orderNo"));
  const [status, setStatus] = useState<PaymentState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [pollCount, setPollCount] = useState(0);

  const { clear } = useCart();

  useEffect(() => {
    if (!merchantOrderId) {
      setStatus("error");
      setErrorMsg("Missing payment reference. Please check your orders.");
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    const checkStatus = async () => {
      try {
        const txn = await getPhonePePaymentStatus(merchantOrderId);
        if (cancelled) return;

        if (txn.state === "COMPLETED") {
          // PAYMENT FIRST FLOW: Retrieve the pending payload from storage
          const savedPayloadStr = localStorage.getItem('snf_pending_order_payload') || sessionStorage.getItem('snf_pending_order_payload');
          if (savedPayloadStr) {
            try {
              const payload = JSON.parse(savedPayloadStr);
              payload.paymentStatus = 'PAID';
              payload.paymentDate = new Date().toISOString();
              payload.paymentRefNo = txn.transactionId || merchantOrderId;

              // Place the order in the backend!
              const res = await snfOrderService.createOrder(payload);
              const createdOrder = res.data;
              
              setOrderNo(createdOrder.orderNo);
              // Clean up local storage and the global cart state ONLY upon success
              localStorage.removeItem('snf_pending_order_payload');
              localStorage.removeItem('snf_pending_merchant_order_id');
              clear();
              
              setStatus("success");
            } catch (err: any) {
              console.error("Failed to create order after payment success:", err);
              setStatus("error");
              setErrorMsg(err?.message || "Payment succeeded, but order creation failed. Please contact support.");
            }
          } else {
            // Payload missing, may have been created already (e.g. page refresh)
            setStatus("success");
          }
        } else if (txn.state === "FAILED" || txn.state === "CANCELLED") {
          setStatus("failed");
          setErrorMsg(txn.errorMessage || "Payment was not completed.");
        } else {
          // Still PENDING — poll again up to 8 times (~40s)
          setPollCount((c) => c + 1);
          if (pollCount < 8) {
            pollTimer = setTimeout(checkStatus, 5000);
          } else {
            setStatus("pending");
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(err?.message || "Failed to verify payment.");
        }
      }
    };

    checkStatus();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [merchantOrderId, pollCount]);

  const handleRetryPoll = () => {
    setPollCount(0);
    setStatus("loading");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={0} onSearch={() => {}} />

      <main className="flex-1 pt-20 pb-10 flex items-center justify-center">
        <div className="container max-w-md px-4">
          {/* LOADING */}
          {status === "loading" && (
            <Card className="text-center shadow-lg">
              <CardHeader>
                <div className="flex justify-center mb-2">
                  <Loader2 className="size-14 text-primary animate-spin" />
                </div>
                <CardTitle className="text-xl">Confirming Payment…</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Please wait while we verify your payment with PhonePe.
                  {pollCount > 0 && ` (Attempt ${pollCount}/8)`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Do not close or refresh this page.</p>
              </CardContent>
            </Card>
          )}

          {/* SUCCESS */}
          {status === "success" && (
            <Card className="text-center border-green-200 shadow-lg">
              <CardHeader>
                <div className="flex justify-center mb-2">
                  <CheckCircle2 className="size-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  Your payment has been confirmed.
                </p>
                {orderNo && (
                  <p className="text-sm font-medium">
                    Order No: <span className="text-primary">{orderNo}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  You'll receive a confirmation shortly. Thank you for shopping with Indraai!
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate("/snf")}>
                  <ShoppingBag className="size-4 mr-2" />
                  Continue Shopping
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* FAILED */}
          {status === "failed" && (
            <Card className="text-center border-red-200 shadow-lg">
              <CardHeader>
                <div className="flex justify-center mb-2">
                  <XCircle className="size-16 text-red-500" />
                </div>
                <CardTitle className="text-2xl text-red-700">Payment Failed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">{errorMsg || "Your payment could not be processed."}</p>
                <p className="text-xs text-muted-foreground">
                  No amount has been deducted. Please try again.
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" onClick={() => navigate("/snf/checkout")}>
                  Try Again
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/snf">Back to Shopping</Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* PENDING (timeout) */}
          {status === "pending" && (
            <Card className="text-center border-yellow-200 shadow-lg">
              <CardHeader>
                <div className="flex justify-center mb-2">
                  <Loader2 className="size-14 text-yellow-500" />
                </div>
                <CardTitle className="text-xl text-yellow-700">Payment Pending</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Your payment is being processed. This may take a few minutes.
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your orders page for the latest status.
                </p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" variant="outline" onClick={handleRetryPoll}>
                  <RefreshCw className="size-4 mr-2" />
                  Check Again
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/snf">Back to Shopping</Link>
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ERROR */}
          {status === "error" && (
            <Card className="text-center border-red-100 shadow-lg">
              <CardHeader>
                <div className="flex justify-center mb-2">
                  <XCircle className="size-14 text-red-400" />
                </div>
                <CardTitle className="text-xl">Something Went Wrong</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{errorMsg}</p>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button className="w-full" onClick={() => navigate("/snf")}>
                  Go Back to Shop
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default PaymentCallbackPage;
