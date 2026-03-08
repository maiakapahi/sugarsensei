import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div>
          <h1 className="mb-2 text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Sugar Sensei
          </h1>
          <p className="text-xl text-muted-foreground">Family Diabetes Manager</p>
        </div>
        
        <p className="text-lg text-foreground/80 leading-relaxed">
          BG insights and carb counting for families managing Type 1 Diabetes. Real-time monitoring, AI-powered coaching, and peace of mind.
        </p>

        <div className="flex gap-4 justify-center pt-4">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="px-8"
          >
            Get Started
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/auth")}
            className="px-8"
          >
            Sign In
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 text-sm text-muted-foreground">
          <div>
            <div className="text-lg font-bold text-primary">📊</div>
            <p>Real-time BG Tracking</p>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">🤖</div>
            <p>AI Carb Counter</p>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">👨‍👩‍👧‍👦</div>
            <p>Family Sharing</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
