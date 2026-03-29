import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";

import Storage "blob-storage/Storage";

import MixinStorage "blob-storage/Mixin";

actor {
  include MixinStorage();

  type AttendanceRecord = {
    id : Nat;
    waktuHadir : Time.Time;
    namaAyah : Text;
    usia : Nat8;
    asalDesa : Text;
    pekerjaan : Text;
    kontakWa : Text;
    photo : ?Storage.ExternalBlob;
  };

  stable let records = Map.empty<Nat, AttendanceRecord>();
  stable var nextId = 0;

  public shared ({ caller }) func addRecord(
    waktuHadir : Time.Time,
    namaAyah : Text,
    usia : Nat8,
    asalDesa : Text,
    pekerjaan : Text,
    kontakWa : Text,
    photo : ?Storage.ExternalBlob,
  ) : async Nat {
    let record : AttendanceRecord = {
      id = nextId;
      waktuHadir;
      namaAyah;
      usia;
      asalDesa;
      pekerjaan;
      kontakWa;
      photo;
    };
    records.add(nextId, record);
    nextId += 1;
    record.id;
  };

  public shared ({ caller }) func updateRecord(
    id : Nat,
    waktuHadir : Time.Time,
    namaAyah : Text,
    usia : Nat8,
    asalDesa : Text,
    pekerjaan : Text,
    kontakWa : Text,
    photo : ?Storage.ExternalBlob,
  ) : async Bool {
    switch (records.get(id)) {
      case (null) { false };
      case (?_) {
        let updatedRecord : AttendanceRecord = {
          id;
          waktuHadir;
          namaAyah;
          usia;
          asalDesa;
          pekerjaan;
          kontakWa;
          photo;
        };
        records.add(id, updatedRecord);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteRecord(id : Nat) : async Bool {
    if (records.containsKey(id)) {
      records.remove(id);
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getAllRecords() : async [AttendanceRecord] {
    records.values().toArray();
  };

  public query ({ caller }) func getRecordsCountByVillage() : async [(Text, Nat)] {
    let villageCounts = Map.empty<Text, Nat>();

    for (record in records.values()) {
      let count = switch (villageCounts.get(record.asalDesa)) {
        case (null) { 0 };
        case (?c) { c };
      };
      villageCounts.add(record.asalDesa, count + 1);
    };

    villageCounts.toArray();
  };
};
