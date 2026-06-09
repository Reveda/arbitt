import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WalletPage() {
  return (
    <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
      <CardHeader>
        <CardTitle>Wallet Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">
          Deposit, withdrawal, and transaction history sections will be wired in Sprint 3.
        </p>
      </CardContent>
    </Card>
  );
}
