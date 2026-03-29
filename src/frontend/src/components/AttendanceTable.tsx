import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Calendar,
  Check,
  Edit2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AttendanceRecord } from "../backend";
import { ExternalBlob } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useDeleteAttendanceRecord,
  useUpdateAttendanceRecord,
} from "../hooks/useQueries";
import {
  validateAge,
  validateAndConvertDateTime,
  validateTextField,
} from "../lib/attendanceValidation";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  isLoading: boolean;
}

export default function AttendanceTable({
  records,
  isLoading,
}: AttendanceTableProps) {
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editData, setEditData] = useState<Partial<AttendanceRecord>>({});
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<bigint | null>(null);
  const updateRecord = useUpdateAttendanceRecord();
  const deleteRecord = useDeleteAttendanceRecord();
  const { actor, isFetching } = useActor();

  const isActorReady = !!actor && !isFetching;

  const formatDateTime = (nanoTime: bigint) => {
    const milliseconds = Number(nanoTime / BigInt(1_000_000));
    const date = new Date(milliseconds);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const formatDateTimeForInput = (nanoTime: bigint) => {
    const milliseconds = Number(nanoTime / BigInt(1_000_000));
    const date = new Date(milliseconds);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditData({
      id: record.id,
      waktuHadir: record.waktuHadir,
      namaAyah: record.namaAyah,
      usia: record.usia,
      asalDesa: record.asalDesa,
      pekerjaan: record.pekerjaan,
      kontakWa: record.kontakWa,
      photo: record.photo,
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
  };

  const handleSave = async () => {
    if (!editData.id) return;

    if (!isActorReady) {
      toast.error("Sistem sedang menghubungkan, mohon tunggu sebentar");
      return;
    }

    if (!editData.waktuHadir) {
      toast.error("Waktu hadir harus diisi");
      return;
    }

    const ageValidation = validateAge(editData.usia || 0);
    if (!ageValidation.isValid) {
      toast.error(ageValidation.error || "Usia tidak valid");
      return;
    }

    const namaValidation = validateTextField(
      editData.namaAyah || "",
      "Nama ayah",
    );
    if (!namaValidation.isValid) {
      toast.error(namaValidation.error!);
      return;
    }

    const desaValidation = validateTextField(
      editData.asalDesa || "",
      "Asal desa",
    );
    if (!desaValidation.isValid) {
      toast.error(desaValidation.error!);
      return;
    }

    const pekerjaanValidation = validateTextField(
      editData.pekerjaan || "",
      "Pekerjaan",
    );
    if (!pekerjaanValidation.isValid) {
      toast.error(pekerjaanValidation.error!);
      return;
    }

    const kontakValidation = validateTextField(
      editData.kontakWa || "",
      "Kontak WA",
    );
    if (!kontakValidation.isValid) {
      toast.error(kontakValidation.error!);
      return;
    }

    let photoBlob: ExternalBlob | null = null;

    if (editPhotoFile) {
      try {
        const arrayBuffer = await editPhotoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        photoBlob = ExternalBlob.fromBytes(uint8Array);
      } catch (error) {
        console.error("[AttendanceTable] Error processing photo:", error);
        toast.error(
          `Gagal memproses foto: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        return;
      }
    } else if (editData.photo) {
      photoBlob = editData.photo;
    }

    try {
      await updateRecord.mutateAsync({
        id: editData.id,
        waktuHadir: editData.waktuHadir,
        namaAyah: editData.namaAyah!.trim(),
        usia: ageValidation.value!,
        asalDesa: editData.asalDesa!.trim(),
        pekerjaan: editData.pekerjaan!.trim(),
        kontakWa: editData.kontakWa!.trim(),
        photo: photoBlob,
      });

      setEditingId(null);
      setEditData({});
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
    } catch (_error) {
      // Error toast is handled by the mutation hook
    }
  };

  const handleDeleteClick = (id: bigint) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteRecord.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (_error) {
      // Error toast is handled by the mutation hook
    }
  };

  const handleDateTimeChange = (value: string) => {
    const validation = validateAndConvertDateTime(value);
    if (validation.isValid && validation.value) {
      setEditData({ ...editData, waktuHadir: validation.value });
    } else {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        const nanoTime = BigInt(date.getTime()) * BigInt(1_000_000);
        setEditData({ ...editData, waktuHadir: nanoTime });
      }
    }
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setEditPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveEditPhoto = () => {
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditData({ ...editData, photo: undefined });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Belum Ada Data Kehadiran
        </h3>
        <p className="text-sm text-muted-foreground">
          Data kehadiran yang ditambahkan akan muncul di sini
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Waktu Hadir
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nama Ayah
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  Usia
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Asal Desa
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Pekerjaan
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Kontak WA
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Foto
                  </div>
                </TableHead>
                <TableHead className="font-semibold whitespace-nowrap text-center">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const isEditing = editingId === record.id;
                const isDeleting =
                  deleteRecord.isPending && deleteConfirmId === record.id;
                return (
                  <TableRow
                    key={record.id.toString()}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="whitespace-nowrap font-medium">
                      {isEditing ? (
                        <Input
                          type="datetime-local"
                          value={formatDateTimeForInput(editData.waktuHadir!)}
                          onChange={(e) => handleDateTimeChange(e.target.value)}
                          className="w-full min-w-[180px]"
                        />
                      ) : (
                        formatDateTime(record.waktuHadir)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editData.namaAyah || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              namaAyah: e.target.value,
                            })
                          }
                          className="w-full min-w-[150px]"
                        />
                      ) : (
                        record.namaAyah
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          max="255"
                          value={editData.usia || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              usia: Number.parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full min-w-[80px]"
                        />
                      ) : (
                        `${record.usia} tahun`
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editData.asalDesa || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              asalDesa: e.target.value,
                            })
                          }
                          className="w-full min-w-[150px]"
                        />
                      ) : (
                        record.asalDesa
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editData.pekerjaan || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              pekerjaan: e.target.value,
                            })
                          }
                          className="w-full min-w-[150px]"
                        />
                      ) : (
                        record.pekerjaan
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <Input
                          type="text"
                          value={editData.kontakWa || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              kontakWa: e.target.value,
                            })
                          }
                          className="w-full min-w-[120px]"
                        />
                      ) : (
                        record.kontakWa
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleEditPhotoChange}
                            className="w-32"
                          />
                          {(editPhotoPreview || editData.photo) && (
                            <div className="relative">
                              {/* biome-ignore lint/a11y/useKeyWithClickEvents: image click opens preview modal */}
                              <img
                                src={
                                  editPhotoPreview ||
                                  editData.photo?.getDirectURL()
                                }
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded border cursor-pointer"
                                onClick={() =>
                                  setSelectedImage(
                                    editPhotoPreview ||
                                      editData.photo?.getDirectURL() ||
                                      null,
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 rounded-full"
                                onClick={handleRemoveEditPhoto}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : record.photo ? (
                        // biome-ignore lint/a11y/useKeyWithClickEvents: image click opens preview modal
                        <img
                          src={record.photo.getDirectURL()}
                          alt="Foto kegiatan"
                          className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() =>
                            setSelectedImage(
                              record.photo?.getDirectURL() || null,
                            )
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={handleSave}
                              disabled={updateRecord.isPending || !isActorReady}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                              disabled={updateRecord.isPending}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(record.id)}
                              disabled={isDeleting}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Foto Kegiatan</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Foto kegiatan"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Kehadiran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data kehadiran ini? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRecord.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteRecord.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRecord.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
