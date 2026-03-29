import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AttendanceRecord } from "../backend";
import type { ExternalBlob } from "../backend";
import { useActor } from "./useActor";

export function useAttendanceRecords() {
  const { actor, isFetching } = useActor();

  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendanceRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useVillageStats() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, bigint]>>({
    queryKey: ["villageStats"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecordsCountByVillage();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAttendanceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      waktuHadir: bigint;
      namaAyah: string;
      usia: number;
      asalDesa: string;
      pekerjaan: string;
      kontakWa: string;
      photo: ExternalBlob | null;
    }) => {
      if (!actor) {
        throw new Error("Actor belum siap, mohon tunggu sebentar");
      }

      console.log("[useAddAttendanceRecord] Calling backend addRecord", {
        operation: "add",
        photoAttached: !!data.photo,
        waktuHadir: data.waktuHadir.toString(),
        usia: data.usia,
      });

      const result = await actor.addRecord(
        data.waktuHadir,
        data.namaAyah,
        data.usia,
        data.asalDesa,
        data.pekerjaan,
        data.kontakWa,
        data.photo,
      );

      console.log("[useAddAttendanceRecord] Backend returned:", result);
      return result;
    },
    onSuccess: () => {
      console.log("[useAddAttendanceRecord] Success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      queryClient.invalidateQueries({ queryKey: ["villageStats"] });
      toast.success("Data kehadiran berhasil ditambahkan");
    },
    onError: (error) => {
      console.error("[useAddAttendanceRecord] Error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak diketahui";
      toast.error("Gagal menambahkan data kehadiran", {
        description: errorMessage,
      });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: bigint;
      waktuHadir: bigint;
      namaAyah: string;
      usia: number;
      asalDesa: string;
      pekerjaan: string;
      kontakWa: string;
      photo: ExternalBlob | null;
    }) => {
      if (!actor) {
        throw new Error("Actor belum siap, mohon tunggu sebentar");
      }

      console.log("[useUpdateAttendanceRecord] Calling backend updateRecord", {
        operation: "update",
        id: data.id.toString(),
        photoAttached: !!data.photo,
        waktuHadir: data.waktuHadir.toString(),
        usia: data.usia,
      });

      const success = await actor.updateRecord(
        data.id,
        data.waktuHadir,
        data.namaAyah,
        data.usia,
        data.asalDesa,
        data.pekerjaan,
        data.kontakWa,
        data.photo,
      );

      console.log("[useUpdateAttendanceRecord] Backend returned:", success);

      if (!success) {
        throw new Error(
          "Gagal memperbarui record - backend mengembalikan false",
        );
      }
      return success;
    },
    onSuccess: () => {
      console.log("[useUpdateAttendanceRecord] Success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      queryClient.invalidateQueries({ queryKey: ["villageStats"] });
      toast.success("Data kehadiran berhasil diperbarui");
    },
    onError: (error) => {
      console.error("[useUpdateAttendanceRecord] Error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak diketahui";
      toast.error("Gagal memperbarui data kehadiran", {
        description: errorMessage,
      });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) {
        throw new Error("Actor is not ready, please wait a moment");
      }

      console.log("[useDeleteAttendanceRecord] Calling backend deleteRecord", {
        operation: "delete",
        id: id.toString(),
      });

      const success = await actor.deleteRecord(id);

      console.log("[useDeleteAttendanceRecord] Backend returned:", success);

      if (!success) {
        throw new Error("Failed to delete record - backend returned false");
      }
      return success;
    },
    onSuccess: () => {
      console.log("[useDeleteAttendanceRecord] Success, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      queryClient.invalidateQueries({ queryKey: ["villageStats"] });
      toast.success("Record deleted successfully");
    },
    onError: (error) => {
      console.error("[useDeleteAttendanceRecord] Error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to delete record", {
        description: errorMessage,
      });
    },
  });
}
