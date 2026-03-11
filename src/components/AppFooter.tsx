import React from "react";
import { Mail, Phone, MapPin, FileText } from "lucide-react";

export const AppFooter = React.memo(function AppFooter() {
  return (
    <footer className="border-t border-border bg-card text-muted-foreground">
      <div className="px-3 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Contact Us */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Contact Us
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>support@transcologistics.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" />
                <span>+91 00000 00000</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span>123 Business Park, City, State, India</span>
              </li>
            </ul>
          </div>

          {/* License Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              License
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Terms of Service</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Privacy Policy</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0" />
                <span>End User License Agreement</span>
              </li>
            </ul>
          </div>

          {/* About */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              About
            </h3>
            <p className="text-sm leading-relaxed">
              Transcologistics provides comprehensive vehicle and FASTag
              management solutions for logistics and transport businesses.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span>
            &copy; {new Date().getFullYear()} Transcologistics. All rights
            reserved.
          </span>
          <span>Version 1.0.0</span>
        </div>
      </div>
    </footer>
  );
});
