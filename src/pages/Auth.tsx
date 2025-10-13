import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BuddyLogo } from "@/components/buddy-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoleCard } from "@/components/role-card";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { signUp, signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as {
    state?: {
      signUp?: boolean;
      selectedRole?: string;
    };
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Open in SignUp mode when navigated from Welcome with intent
  useEffect(() => {
    if (location?.state?.signUp) {
      setIsSignUp(true);
      if (location.state.selectedRole) {
        setSelectedRole(location.state.selectedRole);
      }
    }
  }, [location?.state]);
  const roles = [
    {
      id: "student",
      title: "Student",
      description: "Access learning tools and request help",
      icon: User,
    },
  ];
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(identifier, password, selectedRole, username);
        if (error) throw error;
        toast({
          title: "Account created!",
          description: "You're all set—welcome to ThriveSprite!",
        });
        navigate("/dashboard");
      } else {
        const { error } = await signIn(identifier, password);
        if (error) throw error;
        toast({
          title: "Signed in successfully!",
          description: "Welcome back to ThriveSprite!",
        });
        // Navigate immediately for better UX; ProtectedRoute will handle loading
        navigate("/dashboard");
      }
    } catch (error: any) {
      const rawMessage = error?.message ?? "An unexpected error occurred.";
      let message = rawMessage;
      if (rawMessage.toLowerCase().includes("invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      } else if (rawMessage.toLowerCase().includes("email already registered")) {
        message = "Email already registered. Try signing in instead.";
      } else if (rawMessage.toLowerCase().includes("at least 8 character")) {
        message = "Password must be at least 8 characters long.";
      }

      console.error("[auth] submit error:", rawMessage);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleResetPassword = async () => {
    if (!identifier) {
      toast({
        title: "Error",
        description: "Please enter your email or username.",
        variant: "destructive",
      });
      return;
    }
    setResetting(true);
    try {
      const { error, token } = await resetPassword(identifier);
      if (error) throw error;
      toast({
        title: "Reset link generated",
        description: token
          ? `Use this token on the reset page: ${token}`
          : "Check your email for a password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <BuddyLogo size="lg" />
          <div className="flex gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Auth Form */}
        <div className="max-w-md mx-auto">
          <Card className="p-8 bg-gradient-card shadow-medium">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
                {isSignUp ? "Sign Up" : "Sign In"}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp ? "Join ThriveSprite and start your journey" : "Access your ThriveSprite dashboard"}
              </p>
            </div>

            {/* Role Selection for Sign Up */}
            {isSignUp && (
              <div className="mb-6">
                <Label className="text-sm font-medium mb-4 block">How will you use ThriveSprite?</Label>
                <div className="grid gap-3">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      title={role.title}
                      description={role.description}
                      icon={role.icon}
                      selected={selectedRole === role.id}
                      onClick={() => setSelectedRole(role.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="mt-1"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="identifier">{isSignUp ? "Email" : "Email or Username"}</Label>
                <Input
                  id="identifier"
                  type={isSignUp ? "email" : "text"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={isSignUp ? "your.email@example.com" : "Email or username"}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="mt-1"
                  required
                />
              </div>

              <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full">
                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            {!isSignUp && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-sm text-primary hover:underline"
                  disabled={resetting}
                >
                  {resetting ? "Sending..." : "Forgot password?"}
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIdentifier("");
                  setPassword("");
                  setUsername("");
                  setResetting(false);
                }}
                className="text-primary hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:underline text-sm"
              >
                Back to home
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
