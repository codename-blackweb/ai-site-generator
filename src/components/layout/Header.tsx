import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import exhibitLogo from "@/assets/exhibit-logo.png";
export function Header() {
  const {
    user,
    signOut
  } = useAuth();
  return <motion.header className="fixed top-0 left-0 right-0 z-50" initial={{
    opacity: 0,
    y: -12
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.32,
    ease: [0.16, 1, 0.3, 1]
  }}>
      <div className="glass-panel mx-4 mt-4 rounded-2xl">
        <div className="container flex items-center justify-between h-24 px-6">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                alt="EXHIBIT"
                className="h-32 md:h-36 w-auto object-contain"
                src={exhibitLogo}
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium">
              Home
            </Link>
            <Link to="/generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium">
              Generator
            </Link>
            <Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium">
              Gallery
            </Link>
            <Link to="/portfolios" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-medium">
              Portfolio
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>;
}
