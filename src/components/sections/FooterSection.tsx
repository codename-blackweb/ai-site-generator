import { Link } from "react-router-dom";
import exhibitLogo from "@/assets/exhibit-logo.png";

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 py-16">
      <div className="container px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <img 
              src={exhibitLogo} 
              alt="EXHIBIT" 
              className="h-60 md:h-72 w-auto object-contain opacity-90"
            />
            <p className="text-muted-foreground text-sm max-w-xs">
              Museum-grade portfolio and website generation for creative professionals.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="font-medium text-sm mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link to="/platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platform</Link></li>
                <li><Link to="/generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Generator</Link></li>
                <li><Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gallery</Link></li>
                <li><Link to="/portfolios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Portfolios</Link></li>
                <li><Link to="/themes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Themes</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link to="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Resources</Link></li>
                <li><Link to="/api" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API</Link></li>
                <li><Link to="/templates" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Templates</Link></li>
                <li><Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                <li><Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</Link></li>
                <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-16 pt-8 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            © 2025 Ezra Blackwood. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
