import { loadStore, saveStore } from "./secureStore";
import { Lead, MaintenanceEvent, Store, Vehicle } from "./models";

export function getLeadStore() {
  return loadStore<Store<Lead>>("leads", { items: [] });
}

export function saveLeadStore(store: Store<Lead>) {
  return saveStore("leads", store);
}

export function getVehicleStore() {
  return loadStore<Store<Vehicle>>("vehicles", { items: [] });
}

export function saveVehicleStore(store: Store<Vehicle>) {
  return saveStore("vehicles", store);
}

export function getMaintenanceStore() {
  return loadStore<Store<MaintenanceEvent>>("maintenance", { items: [] });
}

export function saveMaintenanceStore(store: Store<MaintenanceEvent>) {
  return saveStore("maintenance", store);
}
