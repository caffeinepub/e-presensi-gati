import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAddAttendanceRecord } from "../hooks/useQueries";
import {
  validateAge,
  validateAndConvertDateTime,
  validateTextField,
} from "../lib/attendanceValidation";

interface AttendanceFormProps {
  onSuccess: () => void;
}

export default function AttendanceForm({ onSuccess }: AttendanceFormProps) {
  const addRecord = useAddAttendanceRecord();
  const { actor, isFetching } = useActor();

  const [formData, setFormData] = useState({
    waktuHadir: "",
    namaAyah: "",
    usia: "",
    asalDesa: "",
    pekerjaan: "",
    kontakWa: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const isActorReady = !!actor && !isFetching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isActorReady) {
      toast.error("Sistem sedang menghubungkan, mohon tunggu sebentar");
      return;
    }

    const datetimeValidation = validateAndConvertDateTime(formData.waktuHadir);
    if (!datetimeValidation.isValid) {
      toast.error(datetimeValidation.error || "Waktu hadir tidak valid");
      return;
    }

    const ageValidation = validateAge(formData.usia);
    if (!ageValidation.isValid) {
      toast.error(ageValidation.error || "Usia tidak valid");
      return;
    }

    const namaValidation = validateTextField(formData.namaAyah, "Nama ayah");
    if (!namaValidation.isValid) {
      toast.error(namaValidation.error!);
      return;
    }

    const desaValidation = validateTextField(formData.asalDesa, "Asal desa");
    if (!desaValidation.isValid) {
      toast.error(desaValidation.error!);
      return;
    }

    const pekerjaanValidation = validateTextField(
      formData.pekerjaan,
      "Pekerjaan",
    );
    if (!pekerjaanValidation.isValid) {
      toast.error(pekerjaanValidation.error!);
      return;
    }

    const kontakValidation = validateTextField(formData.kontakWa, "Kontak WA");
    if (!kontakValidation.isValid) {
      toast.error(kontakValidation.error!);
      return;
    }

    let photoBlob: ExternalBlob | null = null;

    if (photoFile) {
      try {
        const arrayBuffer = await photoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        photoBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
          (percentage) => {
            setUploadProgress(percentage);
          },
        );
      } catch (error) {
        console.error("[AttendanceForm] Error processing photo:", error);
        toast.error(
          `Gagal memproses foto: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        return;
      }
    }

    try {
      await addRecord.mutateAsync({
        waktuHadir: datetimeValidation.value!,
        namaAyah: formData.namaAyah.trim(),
        usia: ageValidation.value!,
        asalDesa: formData.asalDesa.trim(),
        pekerjaan: formData.pekerjaan.trim(),
        kontakWa: formData.kontakWa.trim(),
        photo: photoBlob,
      });

      setFormData({
        waktuHadir: "",
        namaAyah: "",
        usia: "",
        asalDesa: "",
        pekerjaan: "",
        kontakWa: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      setUploadProgress(0);

      onSuccess();
    } catch (_error) {
      // Error toast is handled by the mutation hook
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadProgress(0);
  };

  const isSubmitDisabled = addRecord.isPending || !isActorReady;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isActorReady && (
        <div className="bg-muted/50 border border-muted rounded-lg p-3 text-sm text-muted-foreground">
          Menghubungkan ke sistem...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="waktuHadir" className="text-sm font-medium">
            Waktu Hadir <span className="text-destructive">*</span>
          </Label>
          <Input
            id="waktuHadir"
            name="waktuHadir"
            type="datetime-local"
            value={formData.waktuHadir}
            onChange={handleChange}
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="namaAyah" className="text-sm font-medium">
            Nama Ayah <span className="text-destructive">*</span>
          </Label>
          <Input
            id="namaAyah"
            name="namaAyah"
            type="text"
            value={formData.namaAyah}
            onChange={handleChange}
            placeholder="Masukkan nama ayah"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usia" className="text-sm font-medium">
            Usia <span className="text-destructive">*</span>
          </Label>
          <Input
            id="usia"
            name="usia"
            type="number"
            min="0"
            max="255"
            value={formData.usia}
            onChange={handleChange}
            placeholder="Masukkan usia"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="asalDesa" className="text-sm font-medium">
            Asal Desa <span className="text-destructive">*</span>
          </Label>
          <Input
            id="asalDesa"
            name="asalDesa"
            type="text"
            value={formData.asalDesa}
            onChange={handleChange}
            placeholder="Masukkan asal desa"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pekerjaan" className="text-sm font-medium">
            Pekerjaan <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pekerjaan"
            name="pekerjaan"
            type="text"
            value={formData.pekerjaan}
            onChange={handleChange}
            placeholder="Masukkan pekerjaan"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kontakWa" className="text-sm font-medium">
            Kontak WA <span className="text-destructive">*</span>
          </Label>
          <Input
            id="kontakWa"
            name="kontakWa"
            type="text"
            value={formData.kontakWa}
            onChange={handleChange}
            placeholder="Contoh: 08123456789"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="photo" className="text-sm font-medium">
            Foto Kegiatan
          </Label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: JPG, PNG, GIF. Maksimal 5MB
              </p>
            </div>
            {photoPreview && (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="min-w-[150px]"
        >
          {addRecord.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            "Simpan Data"
          )}
        </Button>
      </div>
    </form>
  );
}
