import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { completeDexcomOAuth } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function DexcomCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Connecting to Dexcom...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // memberId

    if (!code || !state) {
      setStatus("Invalid callback — missing code or member ID");
      return;
    }

    completeDexcomOAuth(code, state)
      .then(() => {
        toast({ title: "Success!", description: "Dexcom connected successfully." });
        navigate(`/member/${state}`);
      })
      .catch((err) => {
        setStatus(`Failed to connect: ${err.message}`);
        toast({ title: "Error", description: err.message, variant: "destructive" });
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse-glow text-4xl mb-4">🩺</div>
        <p className="text-foreground font-medium">{status}</p>
      </div>
    </div>
  );
}
