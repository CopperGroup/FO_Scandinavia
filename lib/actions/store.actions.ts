"use server"

import Store from "../models/store.model";
import { connectToDB } from "../mongoose";
import { v4 as uuidv4 } from 'uuid';

export async function addWarehouse({ cityName, cityRef, warehouseName, warehouseRef }: {
  cityName: string;
  cityRef: string;
  warehouseName: string;
  warehouseRef: string;
}) {
  await connectToDB();

  const store = await Store.findOne();
  if (!store) throw new Error('Store not found');

  const local = JSON.parse(store.local || '{}');

  if (!local.delivery?.novapost?.warehouses) {
    local.delivery = local.delivery || {};
    local.delivery.novapost = { warehouses: [] };
  }

  local.delivery.novapost.warehouses.push({
    id: uuidv4(),
    cityName,
    cityRef,
    warehouseName,
    warehouseRef
  });

  store.local = JSON.stringify(local);
  await store.save();

  return local.delivery.novapost.warehouses;
}

export async function deleteWarehouse(id: string) {
  await connectToDB();

  const store = await Store.findOne();
  if (!store) throw new Error('Store not found');

  const local = JSON.parse(store.local || '{}');

  const warehouses = local.delivery?.novapost?.warehouses || [];
  const updatedWarehouses = warehouses.filter((wh: any) => wh.id !== id);

  if (warehouses.length === updatedWarehouses.length) {
    throw new Error('Warehouse not found');
  }

  local.delivery.novapost.warehouses = updatedWarehouses;
  store.local = JSON.stringify(local);
  await store.save();

  return updatedWarehouses;
}

export async function getWarehouses(): Promise<string> {
    await connectToDB();
  
    const store = await Store.findOne();
    if (!store) throw new Error('Store not found');
  
    const local = JSON.parse(store.local || '{}');
  
    const warehouses = local?.delivery?.novapost?.warehouses || [];
  
    return JSON.stringify(warehouses);
  }
  