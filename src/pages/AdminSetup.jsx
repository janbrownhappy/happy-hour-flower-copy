import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setAdminRole } from "@/functions/setAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, ArrowLeft } from "lucide-react";

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      await setAdminRole({});
      setDone(true);
    } catch (err) {
      setError(err.message || "Failed to setup admin access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <CardTitle>Admin Access Setup</CardTitle>
          </div>
          <CardDescription>
            Grant yourself administrator privileges to access the secure admin portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800 ml-2">
                  Admin role granted successfully! You can now access the admin portal.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                <Button
                  onClick={() => navigate("/admin/login")}
                  className="flex-1"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Login
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={handleSetup}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Granting Admin Access..." : "Grant Admin Access"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                This will update your user role to administrator. You'll be able to access the secure admin portal with two-factor authentication.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}