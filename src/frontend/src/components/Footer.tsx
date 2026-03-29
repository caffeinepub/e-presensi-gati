import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            © 2025. Built with{" "}
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 inline" />{" "}
            using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
