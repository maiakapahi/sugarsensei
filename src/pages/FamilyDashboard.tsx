import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { startDexcomOAuth } from "@/lib/api";
import { memberDashboardPath } from "@/lib/authed-routes";
import { usePortfolioDemo } from "@/context/PortfolioDemoContext";
import { mockMembers } from "@/lib/mock-data";
import { MemberCard } from "@/components/MemberCard";
import { CarbCounter } from "@/components/CarbCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, LogOut, Activity, UtensilsCrossed } from "lucide-react";

interface Member {
  id: string;
  name: string;
  relationship: string | null;
  dexcom_access_token: string | null;
}

export default function FamilyDashboard() {
  const isDemo = usePortfolioDemo();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "carb-counter" ? "carb-counter" : "bg-insights";

  useEffect(() => {
    loadMembers();
  }, [isDemo]);

  useEffect(() => {
    if (loading || showAdd) return;
    if (activeTab !== "bg-insights") return;
    if (searchParams.get("skipAutoOpen") === "1") return;
    if (members.length === 1) {
      navigate(memberDashboardPath(isDemo, members[0].id), { replace: true });
    }
  }, [loading, showAdd, activeTab, members, navigate, searchParams, isDemo]);

  async function loadMembers() {
    if (isDemo) {
      setMembers(
        mockMembers.map((m) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship,
          dexcom_access_token: "demo",
        })),
      );
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("members").select("id, name, relationship, dexcom_access_token");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("members").insert({
      parent_user_id: user.id,
      name: newName,
      relationship: newRelationship || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewName("");
      setNewRelationship("");
      setShowAdd(false);
      loadMembers();
    }
  }

  async function connectDexcom(memberId: string) {
    if (isDemo) {
      toast({
        title: "Portfolio demo",
        description: "Sign in to the full app to connect a real Dexcom account.",
      });
      return;
    }
    try {
      await startDexcomOAuth(memberId);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleLogout() {
    if (isDemo) {
      navigate("/auth");
      return;
    }
    await supabase.auth.signOut();
    navigate("/auth");
  }

  function handleTabChange(value: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (value === "carb-counter") {
      nextParams.set("tab", "carb-counter");
      nextParams.set("skipAutoOpen", "1");
    } else {
      nextParams.delete("tab");
      nextParams.delete("skipAutoOpen");
    }
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">🥋 Sugar Sensei</h1>
          {isDemo && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Demo · <button type="button" className="underline hover:text-foreground" onClick={() => navigate("/auth")}>Sign in for the real app</button>
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="shrink-0">
          <LogOut className="h-4 w-4 mr-1" /> {isDemo ? "Exit" : "Sign Out"}
        </Button>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-border">
          <TabsList className="w-full max-w-2xl mx-auto h-12 bg-transparent rounded-none p-0 gap-0">
            <TabsTrigger
              value="bg-insights"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <Activity className="h-4 w-4" />
              BG Insights
            </TabsTrigger>
            <TabsTrigger
              value="carb-counter"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Carb Counter
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bg-insights" className="mt-0">
          <main className="max-w-2xl mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Family Members</h2>
              {!isDemo && (
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Member
                </Button>
              )}
            </div>

            {showAdd && (
              <form onSubmit={addMember} className="bg-card border border-border rounded-lg p-4 mb-4 space-y-3">
                <Input
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="bg-surface-2"
                />
                <Input
                  placeholder="Relationship (e.g. Son, Daughter)"
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="bg-surface-2"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Add</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-2">No family members yet</p>
                <p className="text-sm text-muted-foreground">Add a member to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {members.map((m) => (
                  <div key={m.id} className="space-y-2">
                    {m.dexcom_access_token ? (
                      <MemberCard member={{
                        id: m.id,
                        name: m.name,
                        avatar: m.name[0],
                        dob: "",
                        relationship: m.relationship || "",
                        connected: true,
                      }} />
                    ) : (
                      <div className="bg-card border border-border rounded-lg p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-10 w-10 rounded-full bg-surface-2 flex items-center justify-center text-sm font-semibold text-foreground">
                            {m.name[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.relationship}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Connect Dexcom to see glucose data</p>
                        <Button size="sm" onClick={() => connectDexcom(m.id)}>
                          Connect Dexcom CGM
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </TabsContent>

        <TabsContent value="carb-counter" className="mt-0">
          <CarbCounter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
