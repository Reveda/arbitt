import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>About ARBITRUM</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          ARBITRUM is a USDT-powered network growth platform focused on transparent earnings, secure
          wallet operations, and scalable referral management.
        </p>
      </CardContent>
    </Card>
  );
}
