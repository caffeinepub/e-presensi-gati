import { ClipboardList } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              E-Presensi GATI
            </h1>
            <p className="text-sm text-muted-foreground">
              Sistem Pencatatan Kehadiran
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
