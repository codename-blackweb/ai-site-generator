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
              className="h-8 w-auto object-contain opacity-80"
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
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Generator</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gallery</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Portfolios</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Themes</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Templates</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-16 pt-8 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            © 2024 EXHIBIT. All rights reserved.
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
