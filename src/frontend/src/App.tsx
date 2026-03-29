import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { Download, FileBarChart, Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AttendanceCharts from "./components/AttendanceCharts";
import AttendanceForm from "./components/AttendanceForm";
import AttendanceTable from "./components/AttendanceTable";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { useAttendanceRecords } from "./hooks/useQueries";

// Declare jsPDF types for CDN usage
declare global {
  interface Window {
    jspdf: {
      jsPDF: any;
    };
  }
}

export default function App() {
  const { data: records = [], isLoading } = useAttendanceRecords();
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptsError, setScriptsError] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingRekapPDF, setIsGeneratingRekapPDF] = useState(false);

  // Rekap filter dialog state
  const [rekapDialogOpen, setRekapDialogOpen] = useState(false);
  const [selectedDesas, setSelectedDesas] = useState<Set<string>>(new Set());
  const [selectedBulans, setSelectedBulans] = useState<Set<string>>(new Set());

  // Derived available options from records
  const availableDesas = Array.from(
    new Set(records.map((r) => r.asalDesa || "(Tidak Diisi)")),
  ).sort((a, b) => a.localeCompare(b, "id"));

  const availableBulans = (() => {
    const seen = new Map<string, string>();
    for (const record of records) {
      const ms = Number(record.waktuHadir / BigInt(1_000_000));
      const date = new Date(ms);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(key)) {
        const label = new Intl.DateTimeFormat("id-ID", {
          year: "numeric",
          month: "long",
        }).format(date);
        seen.set(key, label);
      }
    }
    return Array.from(seen.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  })();

  useEffect(() => {
    let script1: HTMLScriptElement | null = null;
    let script2: HTMLScriptElement | null = null;
    let mounted = true;

    const loadScripts = async () => {
      try {
        script1 = document.createElement("script");
        script1.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script1.crossOrigin = "anonymous";

        const script1Promise = new Promise<void>((resolve, reject) => {
          if (script1) {
            script1.onload = () => resolve();
            script1.onerror = () => reject(new Error("Gagal memuat jsPDF"));
          }
        });

        document.body.appendChild(script1);
        await script1Promise;

        script2 = document.createElement("script");
        script2.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
        script2.crossOrigin = "anonymous";

        const script2Promise = new Promise<void>((resolve, reject) => {
          if (script2) {
            script2.onload = () => resolve();
            script2.onerror = () =>
              reject(new Error("Gagal memuat jsPDF-AutoTable"));
          }
        });

        document.body.appendChild(script2);
        await script2Promise;

        if (mounted && window.jspdf && window.jspdf.jsPDF) {
          setScriptsLoaded(true);
          setScriptsError(false);
        } else {
          throw new Error("Library PDF tidak tersedia");
        }
      } catch (error) {
        console.error("Error loading PDF scripts:", error);
        if (mounted) {
          setScriptsError(true);
          setScriptsLoaded(false);
        }
      }
    };

    loadScripts();

    return () => {
      mounted = false;
      if (script1 && document.body.contains(script1)) {
        document.body.removeChild(script1);
      }
      if (script2 && document.body.contains(script2)) {
        document.body.removeChild(script2);
      }
    };
  }, []);

  const handleDownloadPDF = async () => {
    if (!scriptsLoaded) {
      toast.error(
        "Library PDF belum siap. Silakan tunggu sebentar dan coba lagi.",
      );
      return;
    }

    if (scriptsError) {
      toast.error(
        "Terjadi kesalahan saat memuat library PDF. Silakan muat ulang halaman.",
      );
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast.error("Library PDF tidak tersedia. Silakan muat ulang halaman.");
      return;
    }

    if (records.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const { jsPDF } = window.jspdf;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("Data Kehadiran E-Presensi GATI", 14, 15);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const generatedDate = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date());
      doc.text(`Dicetak pada: ${generatedDate}`, 14, 22);

      const tableData = records.map((record) => {
        try {
          const milliseconds = Number(record.waktuHadir / BigInt(1_000_000));
          if (Number.isNaN(milliseconds) || milliseconds < 0) {
            throw new Error("Invalid timestamp");
          }
          const date = new Date(milliseconds);
          if (Number.isNaN(date.getTime())) {
            throw new Error("Invalid date");
          }
          const formattedDate = new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(date);
          return [
            formattedDate,
            record.namaAyah || "-",
            record.usia ? `${record.usia} tahun` : "-",
            record.asalDesa || "-",
            record.pekerjaan || "-",
            record.kontakWa || "-",
            record.photo ? "Ada" : "Tidak ada",
          ];
        } catch (error) {
          console.error("Error formatting record:", error, record);
          return [
            "Data tidak valid",
            record.namaAyah || "-",
            record.usia ? `${record.usia} tahun` : "-",
            record.asalDesa || "-",
            record.pekerjaan || "-",
            record.kontakWa || "-",
            record.photo ? "Ada" : "Tidak ada",
          ];
        }
      });

      doc.autoTable({
        head: [
          [
            "Waktu Hadir",
            "Nama Ayah",
            "Usia",
            "Asal Desa",
            "Pekerjaan",
            "Kontak WA",
            "Foto",
          ],
        ],
        body: tableData,
        startY: 28,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          cellWidth: "wrap",
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35 },
          4: { cellWidth: 40 },
          5: { cellWidth: 35 },
          6: { cellWidth: 25, halign: "center" },
        },
        margin: { top: 28, left: 14, right: 14 },
        didDrawPage: (data: any) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Halaman ${data.pageNumber} dari ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" },
          );
        },
      });

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `data-kehadiran-${timestamp}.pdf`;
      doc.save(filename);

      toast.success("PDF berhasil diunduh!", {
        description: `File ${filename} telah tersimpan`,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      let errorMessage = "Gagal membuat PDF. ";
      if (error instanceof Error) {
        if (error.message.includes("memory")) {
          errorMessage +=
            "Data terlalu besar. Coba ekspor data dalam jumlah lebih kecil.";
        } else if (error.message.includes("Invalid")) {
          errorMessage += "Terdapat data yang tidak valid.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Silakan coba lagi atau hubungi administrator.";
      }
      toast.error("Gagal Mengekspor PDF", { description: errorMessage });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadRekapPDF = () => {
    if (!scriptsLoaded) {
      toast.error(
        "Library PDF belum siap. Silakan tunggu sebentar dan coba lagi.",
      );
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast.error("Library PDF tidak tersedia. Silakan muat ulang halaman.");
      return;
    }
    if (records.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    setSelectedDesas(new Set(availableDesas));
    setSelectedBulans(new Set(availableBulans.map((b) => b.key)));
    setRekapDialogOpen(true);
  };

  const handleConfirmRekapDownload = async () => {
    setRekapDialogOpen(false);

    // Filter records based on selected desas and bulans
    const filteredRecords = records.filter((record) => {
      const desa = record.asalDesa || "(Tidak Diisi)";
      const ms = Number(record.waktuHadir / BigInt(1_000_000));
      const date = new Date(ms);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return selectedDesas.has(desa) && selectedBulans.has(monthKey);
    });

    if (filteredRecords.length === 0) {
      toast.error("Tidak ada data sesuai filter yang dipilih");
      return;
    }

    setIsGeneratingRekapPDF(true);

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Helper to add page numbers
      const addPageNumbers = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(`Halaman ${i} dari ${pageCount}`, pageW / 2, pageH - 8, {
            align: "center",
          });
        }
      };

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("Rekapitulasi Kehadiran E-Presensi GATI", pageW / 2, 16, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.setTextColor(100);
      const printedDate = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date());
      doc.text(`Dicetak pada: ${printedDate}`, pageW / 2, 23, {
        align: "center",
      });

      // --- Build data structures ---
      type MonthKey = string; // "YYYY-MM"

      const desaMap = new Map<string, number>();
      const bulanMap = new Map<MonthKey, { label: string; count: number }>();
      const crossMap = new Map<MonthKey, Map<string, number>>();

      for (const record of filteredRecords) {
        const ms = Number(record.waktuHadir / BigInt(1_000_000));
        const date = new Date(ms);
        const desa = record.asalDesa || "(Tidak Diisi)";
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthKey: MonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const monthLabel = new Intl.DateTimeFormat("id-ID", {
          year: "numeric",
          month: "long",
        }).format(date);

        // Per desa
        desaMap.set(desa, (desaMap.get(desa) ?? 0) + 1);

        // Per bulan
        if (!bulanMap.has(monthKey)) {
          bulanMap.set(monthKey, { label: monthLabel, count: 0 });
        }
        bulanMap.get(monthKey)!.count += 1;

        // Cross map
        if (!crossMap.has(monthKey)) {
          crossMap.set(monthKey, new Map());
        }
        const crossRow = crossMap.get(monthKey)!;
        crossRow.set(desa, (crossRow.get(desa) ?? 0) + 1);
      }

      const sortedDesas = Array.from(desaMap.keys()).sort((a, b) =>
        a.localeCompare(b, "id"),
      );
      const sortedMonthKeys = Array.from(bulanMap.keys()).sort();

      // --- Section 1: Rekap Per Desa ---
      let currentY = 30;

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("1. Rekapitulasi Per Desa", 14, currentY);

      const desaRows = sortedDesas.map((desa, idx) => [
        idx + 1,
        desa,
        desaMap.get(desa) ?? 0,
      ]);
      const desaTotal = sortedDesas.reduce(
        (sum, d) => sum + (desaMap.get(d) ?? 0),
        0,
      );
      desaRows.push(["", "Total", desaTotal]);

      doc.autoTable({
        head: [["No", "Asal Desa", "Jumlah Peserta"]],
        body: desaRows,
        startY: currentY + 4,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 70 },
          2: { cellWidth: 35, halign: "center" },
        },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        didParseCell: (data: any) => {
          if (
            data.row.index === desaRows.length - 1 &&
            data.section === "body"
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [219, 234, 254];
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // --- Section 2: Rekap Per Bulan ---
      if (currentY > pageH - 60) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("2. Rekapitulasi Per Bulan", 14, currentY);

      const bulanRows = sortedMonthKeys.map((key, idx) => {
        const b = bulanMap.get(key)!;
        return [idx + 1, b.label, b.count];
      });
      const bulanTotal = sortedMonthKeys.reduce(
        (sum, k) => sum + (bulanMap.get(k)?.count ?? 0),
        0,
      );
      bulanRows.push(["", "Total", bulanTotal]);

      doc.autoTable({
        head: [["No", "Bulan", "Jumlah Peserta"]],
        body: bulanRows,
        startY: currentY + 4,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 70 },
          2: { cellWidth: 35, halign: "center" },
        },
        alternateRowStyles: { fillColor: [239, 246, 255] },
        didParseCell: (data: any) => {
          if (
            data.row.index === bulanRows.length - 1 &&
            data.section === "body"
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [219, 234, 254];
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;

      // --- Section 3: Cross-table Per Desa Per Bulan ---
      if (currentY > pageH - 60) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("3. Rekapitulasi Per Desa Per Bulan", 14, currentY);

      const crossHead = ["Bulan", ...sortedDesas, "Total"];
      const crossRows = sortedMonthKeys.map((key) => {
        const b = bulanMap.get(key)!;
        const crossRow = crossMap.get(key)!;
        const rowTotal = sortedDesas.reduce(
          (sum, d) => sum + (crossRow.get(d) ?? 0),
          0,
        );
        return [
          b.label,
          ...sortedDesas.map((d) => crossRow.get(d) ?? 0),
          rowTotal,
        ];
      });

      // Total row
      const crossTotalRow = [
        "Total",
        ...sortedDesas.map((d) => desaMap.get(d) ?? 0),
        filteredRecords.length,
      ];
      crossRows.push(crossTotalRow);

      // Dynamic column widths for cross-table
      const totalCols = crossHead.length;
      const availW = pageW - 28;
      const bulanColW = Math.min(50, availW * 0.25);
      const remainW = availW - bulanColW;
      const dataColW = remainW / (totalCols - 1);

      const crossColStyles: Record<number, any> = {
        0: { cellWidth: bulanColW },
      };
      for (let i = 1; i < totalCols; i++) {
        crossColStyles[i] = { cellWidth: dataColW, halign: "center" };
      }

      doc.autoTable({
        head: [crossHead],
        body: crossRows,
        startY: currentY + 4,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: crossColStyles,
        alternateRowStyles: { fillColor: [239, 246, 255] },
        didParseCell: (data: any) => {
          if (
            data.row.index === crossRows.length - 1 &&
            data.section === "body"
          ) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [219, 234, 254];
          }
        },
        margin: { left: 14, right: 14 },
      });

      addPageNumbers();

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `rekap-desa-bulan-${timestamp}.pdf`;
      doc.save(filename);

      toast.success("Rekap PDF berhasil diunduh!", {
        description: `File ${filename} telah tersimpan`,
      });
    } catch (error) {
      console.error("Error generating rekap PDF:", error);
      toast.error("Gagal Membuat Rekap PDF", {
        description:
          error instanceof Error
            ? error.message
            : "Silakan coba lagi atau hubungi administrator.",
      });
    } finally {
      setIsGeneratingRekapPDF(false);
    }
  };

  const toggleDesa = (desa: string) => {
    setSelectedDesas((prev) => {
      const next = new Set(prev);
      if (next.has(desa)) next.delete(desa);
      else next.add(desa);
      return next;
    });
  };

  const toggleBulan = (key: string) => {
    setSelectedBulans((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allDesasSelected = selectedDesas.size === availableDesas.length;
  const someDesasSelected = selectedDesas.size > 0 && !allDesasSelected;
  const allBulansSelected = selectedBulans.size === availableBulans.length;
  const someBulansSelected = selectedBulans.size > 0 && !allBulansSelected;

  const toggleAllDesas = () => {
    if (allDesasSelected) {
      setSelectedDesas(new Set());
    } else {
      setSelectedDesas(new Set(availableDesas));
    }
  };

  const toggleAllBulans = () => {
    if (allBulansSelected) {
      setSelectedBulans(new Set());
    } else {
      setSelectedBulans(new Set(availableBulans.map((b) => b.key)));
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-8">
            {/* Form Section */}
            <section className="bg-card rounded-lg border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Form Kehadiran
                </h2>
                <p className="text-muted-foreground text-sm">
                  Silakan isi formulir di bawah ini untuk mencatat kehadiran
                </p>
              </div>
              <AttendanceForm onSuccess={() => {}} />
            </section>

            {/* Charts Section */}
            <AttendanceCharts />

            {/* Table Section */}
            <section className="bg-card rounded-lg border shadow-sm p-6">
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Data Kehadiran
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Daftar seluruh data kehadiran yang telah tercatat
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={
                      isLoading ||
                      records.length === 0 ||
                      !scriptsLoaded ||
                      isGeneratingPDF
                    }
                    className="flex items-center gap-2"
                    data-ocid="attendance.download_pdf.button"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Membuat PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDownloadRekapPDF}
                    disabled={
                      isLoading ||
                      records.length === 0 ||
                      !scriptsLoaded ||
                      isGeneratingRekapPDF
                    }
                    variant="outline"
                    className="flex items-center gap-2"
                    data-ocid="attendance.rekap_pdf.button"
                  >
                    {isGeneratingRekapPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Membuat Rekap...
                      </>
                    ) : (
                      <>
                        <FileBarChart className="h-4 w-4" />
                        Rekap Desa &amp; Bulan
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <AttendanceTable records={records} isLoading={isLoading} />
            </section>
          </div>
        </main>

        <Footer />
        <Toaster />

        {/* Rekap Filter Dialog */}
        <Dialog open={rekapDialogOpen} onOpenChange={setRekapDialogOpen}>
          <DialogContent
            className="max-w-md max-h-[80vh] overflow-y-auto"
            data-ocid="rekap.dialog"
          >
            <DialogHeader>
              <DialogTitle>Filter Rekap PDF</DialogTitle>
              <DialogDescription>
                Pilih desa dan bulan yang ingin dimasukkan dalam rekap
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Pilih Desa */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Pilih Desa</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-desas"
                      checked={
                        allDesasSelected
                          ? true
                          : someDesasSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllDesas}
                      data-ocid="rekap.desa.checkbox"
                    />
                    <label
                      htmlFor="all-desas"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Semua Desa
                    </label>
                  </div>
                  <div className="pl-4 space-y-2 border-l-2 border-muted">
                    {availableDesas.map((desa, idx) => (
                      <div key={desa} className="flex items-center gap-2">
                        <Checkbox
                          id={`desa-${idx}`}
                          checked={selectedDesas.has(desa)}
                          onCheckedChange={() => toggleDesa(desa)}
                          data-ocid={`rekap.desa.item.${idx + 1}`}
                        />
                        <label
                          htmlFor={`desa-${idx}`}
                          className="text-sm cursor-pointer"
                        >
                          {desa}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pilih Bulan */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Pilih Bulan</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all-bulans"
                      checked={
                        allBulansSelected
                          ? true
                          : someBulansSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={toggleAllBulans}
                      data-ocid="rekap.bulan.checkbox"
                    />
                    <label
                      htmlFor="all-bulans"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Semua Bulan
                    </label>
                  </div>
                  <div className="pl-4 space-y-2 border-l-2 border-muted">
                    {availableBulans.map((bulan, idx) => (
                      <div key={bulan.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`bulan-${idx}`}
                          checked={selectedBulans.has(bulan.key)}
                          onCheckedChange={() => toggleBulan(bulan.key)}
                          data-ocid={`rekap.bulan.item.${idx + 1}`}
                        />
                        <label
                          htmlFor={`bulan-${idx}`}
                          className="text-sm cursor-pointer"
                        >
                          {bulan.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRekapDialogOpen(false)}
                data-ocid="rekap.cancel_button"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmRekapDownload}
                disabled={
                  selectedDesas.size === 0 ||
                  selectedBulans.size === 0 ||
                  isGeneratingRekapPDF
                }
                data-ocid="rekap.confirm_button"
              >
                {isGeneratingRekapPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Membuat Rekap...
                  </>
                ) : (
                  "Download Rekap"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeProvider>
  );
}
