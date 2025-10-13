import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/hooks/use-toast";
import { resetPassword as resetPasswordApi } from "@/integrations/api/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast({
        title: "Invalid link",
        description: "Password reset token is missing or invalid.",
        variant: "destructive",
      });
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: "Error",
        description: "Password reset token not found.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await resetPasswordApi({ token, password });
      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });

      navigate("/auth");
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                Reset Password
              </h1>
              <p className="text-muted-foreground">Enter your new password</p>
            </div>

            {!token && (
              <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                The reset link is invalid or has expired. Please request a new password reset from the login page.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="mt-1"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={loading || !token} className="w-full">
                {loading ? "Processing..." : "Update Password"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline text-sm"
              >
                Back to login
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
