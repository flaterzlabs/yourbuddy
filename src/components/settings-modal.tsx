import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, UserPlus, Users, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
  onConnectionAdded?: () => void;
  connections?: Array<{
    id: string;
    created_at: string;
    caregiver_profile?: {
      username: string;
      role: string;
    };
  }>;
  trigger?: React.ReactNode;
}

export function SettingsModal({ onConnectionAdded, connections = [], trigger }: SettingsModalProps) {
  const [caregiverCode, setCaregiverCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US");
  };

  const handleConnectCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caregiverCode.trim()) return;

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.rpc("create_student_connection_by_caregiver_code", {
        input_code: caregiverCode.trim().toUpperCase(),
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast({
          title: "Connected successfully!",
          description: `Connected with ${result.caregiver.username}`,
        });
        setCaregiverCode("");
        setOpen(false);
        onConnectionAdded?.();
      } else {
        toast({
          title: "Connection failed",
          description: result.error ?? "Invalid code or caregiver not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection failed",
        description: "Invalid code or caregiver not found",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Link className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Connection Settings
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleConnectCaregiver} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caregiver-code" className="flex items-center gap-4">
              <UserPlus className="h-4 w-4" />
              Connect with Caregiver/Educator
            </Label>
            <Input
              id="caregiver-code"
              placeholder="Enter connection code"
              value={caregiverCode}
              onChange={(e) => setCaregiverCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="text-center text-lg tracking-wider"
            />
            <p className="text-sm text-muted-foreground">Ask your caregiver or educator for their connection code</p>
          </div>
          <Button
            type="submit"
            disabled={isConnecting || !caregiverCode.trim()}
            className={cn(
              // Layout e tipografia
              "w-[50%] mx-auto block text-base font-medium transition-all duration-200",
              // Fundo claro (gradient padrão)
              "bg-gradient-hero text-white border-transparent hover:opacity-90",
              // Fundo dark (accent fixo)
              "dark:bg-accent dark:text-accent-foreground dark:hover:opacity-90 dark:hover:bg-accent",
              // Estado desabilitado
              "disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            {isConnecting ? "Conectando..." : "Conectar"}
          </Button>
        </form>

        {/* Connected Caregivers Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Connected Caregivers
          </h3>

          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No caregivers connected yet</p>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        connection.caregiver_profile?.role === "educator"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-green-500/10 text-green-600"
                      }`}
                    >
                      {connection.caregiver_profile?.role === "educator" ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">
                        {connection.caregiver_profile?.username || "Unknown User"}
                      </h4>
                      <p className="text-xs text-muted-foreground">Connected on {formatDate(connection.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {connection.caregiver_profile?.role === "educator" ? "Educator" : "Caregiver"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
