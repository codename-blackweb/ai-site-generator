import { Button } from "@/components/ui/button";
import exhibitLogo from "@/assets/exhibit-logo.png";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-panel mx-4 mt-4 rounded-2xl">
        <div className="container flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <img 
              src={exhibitLogo} 
              alt="EXHIBIT" 
              className="h-8 w-auto object-contain"
            />
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#generator" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium"
            >
              Generator
            </a>
            <a 
              href="#gallery" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium"
            >
              Gallery
            </a>
            <a 
              href="#portfolio" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium"
            >
              Portfolio
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button variant="coral" size="sm">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
