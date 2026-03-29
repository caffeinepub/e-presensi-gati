import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type Time = bigint;
export interface AttendanceRecord {
    id: bigint;
    usia: number;
    asalDesa: string;
    pekerjaan: string;
    waktuHadir: Time;
    photo?: ExternalBlob;
    namaAyah: string;
    kontakWa: string;
}
export interface backendInterface {
    addRecord(waktuHadir: Time, namaAyah: string, usia: number, asalDesa: string, pekerjaan: string, kontakWa: string, photo: ExternalBlob | null): Promise<bigint>;
    deleteRecord(id: bigint): Promise<boolean>;
    getAllRecords(): Promise<Array<AttendanceRecord>>;
    getRecordsCountByVillage(): Promise<Array<[string, bigint]>>;
    updateRecord(id: bigint, waktuHadir: Time, namaAyah: string, usia: number, asalDesa: string, pekerjaan: string, kontakWa: string, photo: ExternalBlob | null): Promise<boolean>;
}
